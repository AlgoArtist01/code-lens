import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";
import { detectLanguage, isBinaryLikely } from "./languages.js";

const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/venv/**",
  "**/build/**",
];

export interface WalkedFile {
  relativePath: string;
  absolutePath: string;
  language: string | null;
  sizeBytes: number;
  lineCount: number;
  content: string | null;
}

export interface WalkResult {
  files: WalkedFile[];
  directories: string[];
}

export async function walkRepository(rootDir: string): Promise<WalkResult> {
  
  const entries = await fg("**/*", {
    cwd: rootDir,
    dot: false,
    onlyFiles: true,
    ignore: DEFAULT_IGNORES,
    stats: true,
  });

  const files: WalkedFile[] = [];
  const dirSet = new Set<string>();

  for (const entry of entries) {
    const relativePath = typeof entry === "string" ? entry : entry.path;
    const absolutePath = path.join(rootDir, relativePath);

    const dir = path.dirname(relativePath);
    if (dir !== ".") {
      const parts = dir.split(path.sep);
      let acc = "";
      for (const part of parts) {
        acc = acc ? path.join(acc, part) : part;
        dirSet.add(acc);
      }
    }

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(absolutePath);
    } catch {
      continue;
    }

    if (isBinaryLikely(buffer)) {
      files.push({
        relativePath,
        absolutePath,
        language: null,
        sizeBytes: buffer.length,
        lineCount: 0,
        content: null,
      });
      continue;
    }

    const content = buffer.toString("utf-8");
    const language = detectLanguage(relativePath);
    const lineCount = content.split(/\r?\n/).length;

    files.push({
      relativePath,
      absolutePath,
      language,
      sizeBytes: buffer.length,
      lineCount,
      content,
    });
  }

  return { files, directories: Array.from(dirSet) };
}