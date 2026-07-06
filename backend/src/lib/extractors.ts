export interface ExtractedSymbol {
  type: "function" | "class" | "import" | "comment";
  name: string | null;
  lineNumber: number;
}

function scanLines(
  lines: string[],
  patterns: { type: ExtractedSymbol["type"]; regex: RegExp }[]
): ExtractedSymbol[] {
  const results: ExtractedSymbol[] = [];
  lines.forEach((line, idx) => {
    for (const { type, regex } of patterns) {
      const match = line.match(regex);
      if (match) {
        results.push({ type, name: match[1] ?? null, lineNumber: idx + 1 });
      }
    }
  });
  return results;
}

const PYTHON_PATTERNS = [
  { type: "function" as const, regex: /^\s*def\s+([a-zA-Z_]\w*)\s*\(/ },
  { type: "class" as const, regex: /^\s*class\s+([a-zA-Z_]\w*)/ },
  { type: "import" as const, regex: /^\s*(?:import|from)\s+([\w.]+)/ },
  { type: "comment" as const, regex: /^\s*#(.*)/ },
];

const JS_TS_PATTERNS = [
  { type: "function" as const, regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$]\w*)/ },
  { type: "class" as const, regex: /^\s*(?:export\s+)?class\s+([a-zA-Z_$]\w*)/ },
  { type: "import" as const, regex: /^\s*import\s+.*from\s+['"]([^'"]+)['"]/ },
  { type: "comment" as const, regex: /^\s*\/\/(.*)/ },
];

const JAVA_PATTERNS = [
  { type: "function" as const, regex: /^\s*(?:public|private|protected)?\s*(?:static\s+)?\w[\w<>\[\]]*\s+([a-zA-Z_]\w*)\s*\(/ },
  { type: "class" as const, regex: /^\s*(?:public\s+)?class\s+([a-zA-Z_]\w*)/ },
  { type: "import" as const, regex: /^\s*import\s+([\w.]+)/ },
  { type: "comment" as const, regex: /^\s*\/\/(.*)/ },
];

const GO_PATTERNS = [
  { type: "function" as const, regex: /^\s*func\s+(?:\([^)]*\)\s*)?([a-zA-Z_]\w*)\s*\(/ },
  { type: "class" as const, regex: /^\s*type\s+([a-zA-Z_]\w*)\s+struct/ },
  { type: "import" as const, regex: /^\s*import\s+"([^"]+)"/ },
  { type: "comment" as const, regex: /^\s*\/\/(.*)/ },
];

const RUST_PATTERNS = [
  { type: "function" as const, regex: /^\s*(?:pub\s+)?fn\s+([a-zA-Z_]\w*)/ },
  { type: "class" as const, regex: /^\s*(?:pub\s+)?struct\s+([a-zA-Z_]\w*)/ },
  { type: "import" as const, regex: /^\s*use\s+([\w:]+)/ },
  { type: "comment" as const, regex: /^\s*\/\/(.*)/ },
];

const CPP_PATTERNS = [
  { type: "function" as const, regex: /^\s*\w[\w:*&<>]*\s+([a-zA-Z_]\w*)\s*\([^;]*\)\s*\{?\s*$/ },
  { type: "class" as const, regex: /^\s*class\s+([a-zA-Z_]\w*)/ },
  { type: "import" as const, regex: /^\s*#include\s+[<"]([^>"]+)[>"]/ },
  { type: "comment" as const, regex: /^\s*\/\/(.*)/ },
];

const LANGUAGE_PATTERNS: Record<string, typeof PYTHON_PATTERNS> = {
  python: PYTHON_PATTERNS,
  javascript: JS_TS_PATTERNS,
  typescript: JS_TS_PATTERNS,
  java: JAVA_PATTERNS,
  go: GO_PATTERNS,
  rust: RUST_PATTERNS,
  cpp: CPP_PATTERNS,
};

export function extractSymbols(language: string, content: string): ExtractedSymbol[] {
  const patterns = LANGUAGE_PATTERNS[language];
  if (!patterns) return [];
  const lines = content.split(/\r?\n/);
  return scanLines(lines, patterns);
}