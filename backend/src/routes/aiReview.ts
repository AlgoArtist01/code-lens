import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { repoPath } from "../lib/storage.js";
import { reviewFile } from "../lib/aiReview.js";
import { GeneralIssue } from "../lib/generalChecks.js";
import rateLimit from "express-rate-limit";
import { reviewFileStreaming } from "../lib/aiReview.js";

export const aiReviewRouter = Router();

async function verifyRepoOwnership(repoId: string, userId: string): Promise<boolean> {
  const result = await pgPool.query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [repoId, userId]
  );
  return result.rows.length > 0;
}

async function saveIssues(repoId: string, issues: GeneralIssue[]): Promise<void> {
  for (const issue of issues) {
    await pgPool.query(
      `INSERT INTO issues (repository_id, file_path, line_number, severity, source, rule, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [repoId, issue.filePath, issue.lineNumber, issue.severity, issue.source, issue.rule, issue.description]
    );
  }
}

// AI calls are expensive (CPU-bound LLM inference) — cap per-user request rate.
const aiReviewLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 10, // 10 file reviews per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI review requests, please wait before retrying." },
});

// Reviews a single file — one-file-at-a-time per spec, keeps CPU inference manageable.
aiReviewRouter.post("/repo/:id/ai-review/file", aiReviewLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { filePath } = req.body ?? {};

  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  if (typeof filePath !== "string" || !filePath.trim()) {
    res.status(400).json({ error: "filePath required" });
    return;
  }

  const rootDir = repoPath(id);
  const absolutePath = path.join(rootDir, filePath);

  // guard against path traversal outside the repo folder
  if (!absolutePath.startsWith(rootDir)) {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }

  let content: string;
  try {
    content = await fs.readFile(absolutePath, "utf-8");
  } catch {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  const result = await reviewFile(filePath, content);

  if (result.rawFailed) {
    res.status(502).json({ error: "AI review failed", details: result.error });
    return;
  }

  await pgPool.query(
    "DELETE FROM issues WHERE repository_id = $1 AND source = 'ai' AND file_path = $2",
    [id, filePath]
  );
  await saveIssues(id, result.issues);

  res.json({
    repositoryId: id,
    filePath,
    findingsCount: result.findings.length,
    findings: result.findings,
  });
});

aiReviewRouter.post("/repo/:id/ai-review/file/stream", aiReviewLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { filePath } = req.body ?? {};

  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  if (typeof filePath !== "string" || !filePath.trim()) {
    res.status(400).json({ error: "filePath required" });
    return;
  }

  const rootDir = repoPath(id);
  const absolutePath = path.join(rootDir, filePath);
  if (!absolutePath.startsWith(rootDir)) {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }

  let content: string;
  try {
    content = await fs.readFile(absolutePath, "utf-8");
  } catch {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const onToken = (token: string) => {
    res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
  };

  const result = await reviewFileStreaming(filePath, content, onToken);

  if (result.rawFailed) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: result.error })}\n\n`);
    res.end();
    return;
  }

  await pgPool.query(
    "DELETE FROM issues WHERE repository_id = $1 AND source = 'ai' AND file_path = $2",
    [id, filePath]
  );
  await saveIssues(id, result.issues);

  res.write(`event: done\ndata: ${JSON.stringify({ findings: result.findings })}\n\n`);
  res.end();
});