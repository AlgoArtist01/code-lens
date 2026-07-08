import { Router } from "express";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { repoPath } from "../lib/storage.js";
import { walkRepository } from "../lib/walker.js";
import { chunkFile } from "../lib/chunker.js";
import { embedText, cosineSimilarity } from "../lib/embeddings.js";
import { callOllamaText } from "../lib/ollama.js";

export const ragRouter = Router();

async function getOwnedRepo(repoId: string, userId: string): Promise<{ id: string } | null> {
  const result = await pgPool.query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [repoId, userId]
  );
  return result.rows[0] ?? null;
}

const MAX_FILES_TO_INDEX = 200; // cap for demo purposes, avoids indexing huge repos taking forever
const MAX_CHUNKS_PER_FILE = 40;

ragRouter.post("/repo/:id/rag/index", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const repo = await getOwnedRepo(id, req.user!.userId);
  if (!repo) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  ragRouter.get("/repo/:id/rag/status", requireAuth, async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const repo = await getOwnedRepo(id, req.user!.userId);
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }

    const result = await pgPool.query(
      "SELECT COUNT(*)::int as chunk_count, COUNT(DISTINCT file_path)::int as file_count FROM chunks WHERE repository_id = $1",
      [id]
    );
    const { chunk_count, file_count } = result.rows[0];

    res.json({
      repositoryId: id,
      indexed: chunk_count > 0,
      chunkCount: chunk_count,
      fileCount: file_count,
    });
  });

  const TOP_K = 5;

  ragRouter.post("/repo/:id/rag/chat", requireAuth, async (req: AuthedRequest, res) => {
    const { id } = req.params;
    const { question } = req.body ?? {};

    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({ error: "question required" });
      return;
    }

    const repo = await getOwnedRepo(id, req.user!.userId);
    if (!repo) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }

    const chunksResult = await pgPool.query(
      "SELECT file_path, content, start_line, end_line, embedding FROM chunks WHERE repository_id = $1",
      [id]
    );

    if (chunksResult.rows.length === 0) {
      res.status(400).json({ error: "Repository not indexed yet. Run /rag/index first." });
      return;
    }

    const questionEmbedding = await embedText(question);
    if (!questionEmbedding) {
      res.status(502).json({ error: "Failed to embed question" });
      return;
    }

    const scored = chunksResult.rows.map((row) => ({
      filePath: row.file_path,
      content: row.content,
      startLine: row.start_line,
      endLine: row.end_line,
      score: cosineSimilarity(questionEmbedding, row.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, TOP_K);

    const contextBlock = topChunks
      .map((c) => `File: ${c.filePath} (lines ${c.startLine}-${c.endLine})\n\`\`\`\n${c.content}\n\`\`\``)
      .join("\n\n");

    const prompt = `You are a helpful assistant answering questions about a codebase using only the provided context.

Context from the repository:

${contextBlock}

Question: ${question}

Answer using only the context above. If the context doesn't contain enough information to answer, say so clearly rather than guessing. Reference specific file paths when relevant. Keep the answer concise.`;

    const result = await callOllamaText(prompt);
    if (!result.success) {
      res.status(502).json({ error: result.error ?? "Chat failed" });
      return;
    }

    res.json({
      repositoryId: id,
      question,
      answer: result.raw.trim(),
      sources: topChunks.map((c) => ({ filePath: c.filePath, startLine: c.startLine, endLine: c.endLine, score: c.score })),
    });
  });

  const rootDir = repoPath(id);
  const { files } = await walkRepository(rootDir);
  const RAG_LANGUAGES = ["python", "javascript", "typescript", "java", "go", "rust", "cpp", "c", "csharp", "php", "ruby", "swift", "kotlin", "scala", "haskell", "elixir", "clojure", "dart"];
  const codeFiles = files
    .filter((f) => f.language && RAG_LANGUAGES.includes(f.language) && f.content)
    .slice(0, MAX_FILES_TO_INDEX);

  await pgPool.query("DELETE FROM chunks WHERE repository_id = $1", [id]);

  let totalChunks = 0;
  let failedEmbeds = 0;

  for (const file of codeFiles) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const chunks = chunkFile(file.content!).slice(0, MAX_CHUNKS_PER_FILE);

    for (const chunk of chunks) {
      const embedding = await embedText(`File: ${normalizedPath}\n\n${chunk.content}`);
      if (!embedding) {
        failedEmbeds++;
        continue;
      }
      await pgPool.query(
        `INSERT INTO chunks (repository_id, file_path, content, start_line, end_line, embedding)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, normalizedPath, chunk.content, chunk.startLine, chunk.endLine, JSON.stringify(embedding)]
      );
      totalChunks++;
    }
  }

  res.json({
    repositoryId: id,
    filesIndexed: codeFiles.length,
    chunksCreated: totalChunks,
    failedEmbeds,
  });
});