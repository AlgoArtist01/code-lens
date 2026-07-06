const EXT_TO_LANGUAGE: Record<string, string> = {
  ".py": "python",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".java": "java",
  ".go": "go",
  ".rs": "rust",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".h": "cpp",
  ".hpp": "cpp",
  ".md": "markdown",
  ".json": "json",
  ".yml": "yaml",
  ".yaml": "yaml",
};

export function detectLanguage(filePath: string): string | null {
  const match = filePath.match(/\.[^./\\]+$/);
  if (!match) return null;
  return EXT_TO_LANGUAGE[match[0].toLowerCase()] ?? null;
}

export function isBinaryLikely(buffer: Buffer): boolean {
  const sampleSize = Math.min(buffer.length, 8000);
  for (let i = 0; i < sampleSize; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}