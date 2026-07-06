import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_ROOT = path.join(__dirname, "..", "..", "storage");

export async function ensureStorageRoot(): Promise<void> {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
}

export function repoPath(repoId: string): string {
  return path.join(STORAGE_ROOT, repoId);
}

export async function deleteRepoFolder(repoId: string): Promise<void> {
  await fs.rm(repoPath(repoId), { recursive: true, force: true });
}