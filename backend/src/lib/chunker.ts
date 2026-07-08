export interface Chunk {
  content: string;
  startLine: number;
  endLine: number;
}

const CHUNK_LINE_SIZE = 40;
const CHUNK_OVERLAP = 8;

export function chunkFile(content: string): Chunk[] {
  const lines = content.split(/\r?\n/);
  const chunks: Chunk[] = [];

  if (lines.length === 0) return chunks;

  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + CHUNK_LINE_SIZE, lines.length);
    const chunkLines = lines.slice(start, end);
    chunks.push({
      content: chunkLines.join("\n"),
      startLine: start + 1,
      endLine: end,
    });
    if (end === lines.length) break;
    start += CHUNK_LINE_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}