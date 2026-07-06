import { Router } from "express";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { repoPath } from "../lib/storage.js";
import { walkRepository } from "../lib/walker.js";
import { extractSymbols } from "../lib/extractors.js";

export const parseRouter = Router();

parseRouter.post("/repo/:id/parse", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const repoResult = await pgPool.query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [id, req.user!.userId]
  );
  if (repoResult.rows.length === 0) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const rootDir = repoPath(id);
  const { files, directories } = await walkRepository(rootDir);

  await pgPool.query("DELETE FROM files WHERE repository_id = $1", [id]);
  await pgPool.query("DELETE FROM directories WHERE repository_id = $1", [id]);

  for (const dir of directories) {
    const parentPath = dir.includes("/") || dir.includes("\\")
      ? dir.split(/[/\\]/).slice(0, -1).join("/")
      : null;
    await pgPool.query(
      `INSERT INTO directories (repository_id, path, parent_path) VALUES ($1, $2, $3)`,
      [id, dir.replace(/\\/g, "/"), parentPath]
    );
  }

  let totalSymbols = 0;
  for (const file of files) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const directoryPath = normalizedPath.includes("/")
      ? normalizedPath.split("/").slice(0, -1).join("/")
      : null;

    const fileResult = await pgPool.query(
      `INSERT INTO files (repository_id, path, directory_path, language, size_bytes, line_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [id, normalizedPath, directoryPath, file.language, file.sizeBytes, file.lineCount]
    );
    const fileId = fileResult.rows[0].id;

    if (file.language && file.content) {
      const symbols = extractSymbols(file.language, file.content);
      for (const symbol of symbols) {
        await pgPool.query(
          `INSERT INTO symbols (file_id, repository_id, type, name, line_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [fileId, id, symbol.type, symbol.name, symbol.lineNumber]
        );
        totalSymbols++;
      }
    }
  }

  res.json({
    repositoryId: id,
    filesIndexed: files.length,
    directoriesIndexed: directories.length,
    symbolsExtracted: totalSymbols,
  });
});

parseRouter.get("/repo/:id/tree", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const repoResult = await pgPool.query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [id, req.user!.userId]
  );
  if (repoResult.rows.length === 0) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const filesResult = await pgPool.query(
    "SELECT path, language, size_bytes, line_count FROM files WHERE repository_id = $1 ORDER BY path",
    [id]
  );
  res.json({ repositoryId: id, files: filesResult.rows });
});

parseRouter.get("/repo/:id/symbols", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;

  const repoResult = await pgPool.query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [id, req.user!.userId]
  );
  if (repoResult.rows.length === 0) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const symbolsResult = await pgPool.query(
    `SELECT f.path, s.type, s.name, s.line_number
     FROM symbols s JOIN files f ON s.file_id = f.id
     WHERE s.repository_id = $1 ORDER BY f.path, s.line_number`,
    [id]
  );
  res.json({ repositoryId: id, symbols: symbolsResult.rows });
});