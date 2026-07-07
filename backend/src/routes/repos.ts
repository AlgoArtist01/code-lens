import { Router } from "express";
import multer from "multer";
import AdmZip from "adm-zip";
import { simpleGit } from "simple-git";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import rateLimit from "express-rate-limit";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { repoPath, ensureStorageRoot, deleteRepoFolder } from "../lib/storage.js";

export const reposRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });
const repoCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many repository creation requests, please try again shortly." },
});

reposRouter.post("/repo/upload", repoCreateLimiter, requireAuth, upload.single("file"), async (req: AuthedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file field required (zip)" });
    return;
  }
  const name = (req.body?.name as string) || req.file.originalname.replace(/\.zip$/i, "");
  const repoId = uuidv4();

  await ensureStorageRoot();
  const destDir = repoPath(repoId);
  await fs.mkdir(destDir, { recursive: true });

  try {
    const zip = new AdmZip(req.file.buffer);
    zip.extractAllTo(destDir, true);
  } catch (err) {
    await deleteRepoFolder(repoId);
    res.status(400).json({ error: "Invalid zip file" });
    return;
  }

  const result = await pgPool.query(
    `INSERT INTO repositories (id, user_id, name, source_type, source_ref, status)
     VALUES ($1, $2, $3, 'zip', $4, 'completed') RETURNING *`,
    [repoId, req.user!.userId, name, req.file.originalname]
  );
  res.status(201).json(result.rows[0]);
});

reposRouter.post("/repo/git", repoCreateLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const { url, name } = req.body ?? {};
  if (typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "url required" });
    return;
  }
  const repoId = uuidv4();
  const repoName = name || url.split("/").pop()?.replace(/\.git$/, "") || "repo";

  await ensureStorageRoot();
  const destDir = repoPath(repoId);

  await pgPool.query(
    `INSERT INTO repositories (id, user_id, name, source_type, source_ref, status)
     VALUES ($1, $2, $3, 'git', $4, 'pending') RETURNING *`,
    [repoId, req.user!.userId, repoName, url]
  );

  try {
    await simpleGit().clone(url, destDir, ["--depth", "1"]);
    const updated = await pgPool.query(
      `UPDATE repositories SET status = 'completed' WHERE id = $1 RETURNING *`,
      [repoId]
    );
    res.status(201).json(updated.rows[0]);
  } catch (err) {
    await pgPool.query(`UPDATE repositories SET status = 'failed' WHERE id = $1`, [repoId]);
    await deleteRepoFolder(repoId);
    res.status(400).json({ error: "Clone failed", details: (err as Error).message });
  }
});

reposRouter.get("/repos", requireAuth, async (req: AuthedRequest, res) => {
  const result = await pgPool.query(
    `SELECT id, name, source_type, status, created_at FROM repositories
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user!.userId]
  );
  res.json(result.rows);
});

reposRouter.delete("/repo/:id", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const result = await pgPool.query(
    `DELETE FROM repositories WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, req.user!.userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }
  await deleteRepoFolder(id);
  res.status(204).send();
});