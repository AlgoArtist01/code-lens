import { Router } from "express";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { generateReadme, generateArchitecture, generateApiDoc, saveDocument } from "../lib/docGen.js";

export const docsRouter = Router();

async function getOwnedRepo(repoId: string, userId: string): Promise<{ id: string; name: string } | null> {
  const result = await pgPool.query(
    "SELECT id, name FROM repositories WHERE id = $1 AND user_id = $2",
    [repoId, userId]
  );
  return result.rows[0] ?? null;
}

const GENERATORS: Record<string, (repoId: string, repoName: string) => Promise<string>> = {
  readme: generateReadme,
  architecture: generateArchitecture,
  api: generateApiDoc,
};

docsRouter.post("/repo/:id/docs/:docType", requireAuth, async (req: AuthedRequest, res) => {
  const { id, docType } = req.params;

  if (!GENERATORS[docType]) {
    res.status(400).json({ error: `Unknown doc type: ${docType}. Valid: readme, architecture, api` });
    return;
  }

  const repo = await getOwnedRepo(id, req.user!.userId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  try {
    const content = await GENERATORS[docType](id, repo.name);
    await saveDocument(id, docType as "readme" | "architecture" | "api", content);
    res.json({ repositoryId: id, docType, content });
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Documentation generation failed" });
  }
});

docsRouter.get("/repo/:id/docs", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const repo = await getOwnedRepo(id, req.user!.userId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const result = await pgPool.query(
    "SELECT doc_type, content, generated_at FROM documents WHERE repository_id = $1",
    [id]
  );
  res.json({ repositoryId: id, documents: result.rows });
});

docsRouter.get("/repo/:id/docs/:docType", requireAuth, async (req: AuthedRequest, res) => {
  const { id, docType } = req.params;
  const repo = await getOwnedRepo(id, req.user!.userId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const result = await pgPool.query(
    "SELECT content, generated_at FROM documents WHERE repository_id = $1 AND doc_type = $2",
    [id, docType]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Document not generated yet" });
    return;
  }
  res.json({ repositoryId: id, docType, ...result.rows[0] });
});