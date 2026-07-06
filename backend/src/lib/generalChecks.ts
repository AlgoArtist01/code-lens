export interface GeneralIssue {
  filePath: string;
  lineNumber: number | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: "general" | "ruff" | "bandit" | "radon" | "eslint" | "tsc" | "ai";
  rule: string;
  description: string;
}

const LARGE_FILE_LINE_THRESHOLD = 25000;
const TODO_REGEX = /\b(TODO|FIXME|HACK|XXX)\b[:\s]*(.*)/i;

export function detectTodos(filePath: string, content: string): GeneralIssue[] {
  const issues: GeneralIssue[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const match = line.match(TODO_REGEX);
    if (match) {
      issues.push({
        filePath,
        lineNumber: idx + 1,
        severity: "low",
        source: "general",
        rule: "todo-comment",
        description: `${match[1].toUpperCase()} comment: ${match[2].trim() || "(no detail)"}`,
      });
    }
  });
  return issues;
}

export function detectLargeFile(filePath: string, lineCount: number): GeneralIssue[] {
  if (lineCount <= LARGE_FILE_LINE_THRESHOLD) return [];
  return [
    {
      filePath,
      lineNumber: null,
      severity: lineCount > 1000 ? "high" : "medium",
      source: "general",
      rule: "large-file",
      description: `File has ${lineCount} lines (threshold: ${LARGE_FILE_LINE_THRESHOLD})`,
    },
  ];
}

export function detectDuplicateFiles(
  files: { path: string; content: string | null }[]
): GeneralIssue[] {
  const issues: GeneralIssue[] = [];
  const seen = new Map<string, string>(); // content -> first path

  for (const file of files) {
    if (!file.content || file.content.trim().length === 0) continue;
    const normalized = file.content.replace(/\s+/g, " ").trim();
    const existing = seen.get(normalized);
    if (existing) {
      issues.push({
        filePath: file.path,
        lineNumber: null,
        severity: "medium",
        source: "general",
        rule: "duplicate-file",
        description: `Identical content to ${existing}`,
      });
    } else {
      seen.set(normalized, file.path);
    }
  }
  return issues;
}

export function detectDeadFiles(
  files: { path: string; content: string | null; language: string | null }[]
): GeneralIssue[] {
  const issues: GeneralIssue[] = [];
  const codeFiles = files.filter((f) => f.language && f.content);
  const allContent = codeFiles.map((f) => f.content as string).join("\n");

  for (const file of codeFiles) {
    const baseName = file.path.split("/").pop()?.replace(/\.\w+$/, "");
    if (!baseName) continue;
    // crude heuristic: is this file's basename referenced anywhere else (as an import)?
    const referencedElsewhere = codeFiles.some(
      (other) => other.path !== file.path && other.content?.includes(baseName)
    );
    if (!referencedElsewhere && !/index|main|app|server/i.test(baseName)) {
      issues.push({
        filePath: file.path,
        lineNumber: null,
        severity: "low",
        source: "general",
        rule: "possibly-dead-file",
        description: `No other file appears to import or reference "${baseName}"`,
      });
    }
  }
  return issues;
}