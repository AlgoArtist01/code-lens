import { pgPool } from "./db.js";
import { callOllamaText } from "./ollama.js";

interface RepoContext {
  fileCount: number;
  languages: Record<string, number>;
  topLevelDirs: string[];
  sampleFiles: { path: string; language: string | null }[];
  functionNames: string[];
  className: string[];
  importedPackages: string[];
}

async function buildRepoContext(repositoryId: string): Promise<RepoContext> {
  const filesResult = await pgPool.query(
    "SELECT path, language, directory_path FROM files WHERE repository_id = $1",
    [repositoryId]
  );
  const files = filesResult.rows;

  const languages: Record<string, number> = {};
  files.forEach((f) => {
    if (f.language) languages[f.language] = (languages[f.language] ?? 0) + 1;
  });

  const topLevelDirs = Array.from(
    new Set(
      files
        .map((f) => f.directory_path as string | null)
        .filter((d): d is string => !!d)
        .map((d) => d.split("/")[0])
    )
  ).slice(0, 15);

  const symbolsResult = await pgPool.query(
    "SELECT type, name FROM symbols WHERE repository_id = $1 LIMIT 500",
    [repositoryId]
  );
  const symbols = symbolsResult.rows;

  const functionNames = symbols.filter((s) => s.type === "function" && s.name).map((s) => s.name).slice(0, 40);
  const className = symbols.filter((s) => s.type === "class" && s.name).map((s) => s.name).slice(0, 30);
  const importedPackages = Array.from(
    new Set(symbols.filter((s) => s.type === "import" && s.name).map((s) => s.name))
  ).slice(0, 40);

  return {
    fileCount: files.length,
    languages,
    topLevelDirs,
    sampleFiles: files.slice(0, 30).map((f) => ({ path: f.path, language: f.language })),
    functionNames,
    className,
    importedPackages,
  };
}

function formatContext(ctx: RepoContext): string {
  return `
Repository stats:
- Total files: ${ctx.fileCount}
- Languages: ${Object.entries(ctx.languages).map(([l, c]) => `${l} (${c})`).join(", ") || "none detected"}
- Top-level directories: ${ctx.topLevelDirs.join(", ") || "none"}
- Detected dependencies/imports: ${ctx.importedPackages.join(", ") || "none detected"}
- Function names found: ${ctx.functionNames.join(", ") || "none"}
- Class names found: ${ctx.className.join(", ") || "none"}
- Sample files: ${ctx.sampleFiles.map((f) => f.path).join(", ")}
`.trim();
}

export async function generateReadme(repositoryId: string, repoName: string): Promise<string> {
  const ctx = await buildRepoContext(repositoryId);
  const prompt = `Generate a professional README.md for a software project named "${repoName}".

${formatContext(ctx)}

Include: project title, a short description inferred from the context, setup/installation steps (infer package manager from languages — npm for js/ts, pip for python, etc.), a project structure section listing the top-level directories, and a usage section. Use the actual directory names, dependencies, and function/class names from the context above where relevant — do not invent unrelated content. Output ONLY the markdown content, no preamble or explanation.`;

  const result = await callOllamaText(prompt);
  if (!result.success) throw new Error(result.error ?? "README generation failed");
  return result.raw.trim();
}

export async function generateArchitecture(repositoryId: string, repoName: string): Promise<string> {
  const ctx = await buildRepoContext(repositoryId);
  const prompt = `Generate an Architecture.md document for a software project named "${repoName}".

${formatContext(ctx)}

Include: a high-level overview of the system, an explanation of each top-level directory's purpose (infer from naming conventions, e.g. "routes" likely holds API endpoints, "lib" holds shared utilities), key classes and their likely responsibilities, and how the modules relate to each other based on the imports/dependencies detected. Use the actual directory and class names from the context — do not invent unrelated content. Output ONLY the markdown content, no preamble.`;

  const result = await callOllamaText(prompt);
  if (!result.success) throw new Error(result.error ?? "Architecture doc generation failed");
  return result.raw.trim();
}

export async function generateApiDoc(repositoryId: string, repoName: string): Promise<string> {
  const ctx = await buildRepoContext(repositoryId);
  const prompt = `Generate an API.md document for a software project named "${repoName}".

${formatContext(ctx)}

List the functions detected (${ctx.functionNames.join(", ") || "none found"}) as API surface, grouping related functions where names suggest a relationship (e.g. same prefix or file). For each, write a plausible one-line description of its likely purpose based on its name. If no clear API functions exist, state that no public API surface was detected and suggest the developer document endpoints manually. Output ONLY the markdown content, no preamble.`;

  const result = await callOllamaText(prompt);
  if (!result.success) throw new Error(result.error ?? "API doc generation failed");
  return result.raw.trim();
}

export async function saveDocument(
  repositoryId: string,
  docType: "readme" | "architecture" | "api",
  content: string
): Promise<void> {
  await pgPool.query(
    `INSERT INTO documents (repository_id, doc_type, content)
     VALUES ($1, $2, $3)
     ON CONFLICT (repository_id, doc_type) DO UPDATE SET content = $3, generated_at = now()`,
    [repositoryId, docType, content]
  );
}