import { Router } from "express";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { repoPath } from "../lib/storage.js";
import { walkRepository } from "../lib/walker.js";
import {
  detectTodos,
  detectLargeFile,
  detectDuplicateFiles,
  detectDeadFiles,
  GeneralIssue,
} from "../lib/generalChecks.js";
import { runRuff, runBandit, runRadon } from "../lib/pythonTools.js";
import { runEslint, runTsc } from "../lib/jsTools.js";

export const analyzeRouter = Router();

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

analyzeRouter.post("/repo/:id/analyze/general", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const rootDir = repoPath(id);
  const { files } = await walkRepository(rootDir);

  await pgPool.query("DELETE FROM issues WHERE repository_id = $1 AND source = 'general'", [id]);

  const allIssues: GeneralIssue[] = [];

  for (const file of files) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    if (file.content) {
      allIssues.push(...detectTodos(normalizedPath, file.content));
    }
    allIssues.push(...detectLargeFile(normalizedPath, file.lineCount));
  }

  allIssues.push(
    ...detectDuplicateFiles(
      files.map((f) => ({ path: f.relativePath.replace(/\\/g, "/"), content: f.content }))
    )
  );
  allIssues.push(
    ...detectDeadFiles(
      files.map((f) => ({
        path: f.relativePath.replace(/\\/g, "/"),
        content: f.content,
        language: f.language,
      }))
    )
  );

  await saveIssues(id, allIssues);

  res.json({
    repositoryId: id,
    issuesFound: allIssues.length,
    bySeverity: {
      critical: allIssues.filter((i) => i.severity === "critical").length,
      high: allIssues.filter((i) => i.severity === "high").length,
      medium: allIssues.filter((i) => i.severity === "medium").length,
      low: allIssues.filter((i) => i.severity === "low").length,
    },
  });
});

analyzeRouter.post("/repo/:id/analyze/python", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const rootDir = repoPath(id);

  await pgPool.query(
    "DELETE FROM issues WHERE repository_id = $1 AND source IN ('ruff', 'bandit', 'radon')",
    [id]
  );

  const [ruffIssues, banditIssues, radonIssues] = await Promise.all([
    runRuff(rootDir),
    runBandit(rootDir),
    runRadon(rootDir),
  ]);

  const allIssues = [...ruffIssues, ...banditIssues, ...radonIssues];
  await saveIssues(id, allIssues);

  res.json({
    repositoryId: id,
    issuesFound: allIssues.length,
    bySource: {
      ruff: ruffIssues.length,
      bandit: banditIssues.length,
      radon: radonIssues.length,
    },
  });
});

analyzeRouter.post("/repo/:id/analyze/js", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const rootDir = repoPath(id);

  await pgPool.query(
    "DELETE FROM issues WHERE repository_id = $1 AND source IN ('eslint', 'tsc')",
    [id]
  );

  const [eslintIssues, tscIssues] = await Promise.all([runEslint(rootDir), runTsc(rootDir)]);
  const allIssues = [...eslintIssues, ...tscIssues];
  await saveIssues(id, allIssues);

  res.json({
    repositoryId: id,
    issuesFound: allIssues.length,
    bySource: { eslint: eslintIssues.length, tsc: tscIssues.length },
  });
});

analyzeRouter.get("/repo/:id/issues", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const severityOrder = `CASE severity
    WHEN 'critical' THEN 0 WHEN 'high' THEN 1
    WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`;

  const result = await pgPool.query(
    `SELECT file_path, line_number, severity, source, rule, description
     FROM issues WHERE repository_id = $1
     ORDER BY ${severityOrder}, file_path`,
    [id]
  );
  res.json({ repositoryId: id, issues: result.rows });
});