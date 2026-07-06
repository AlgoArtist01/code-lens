import { callOllama } from "./ollama.js";
import { GeneralIssue } from "./generalChecks.js";
import { streamOllama } from "./ollama.js";
import { ollamaQueue } from "./ollamaQueue.js";

const MAX_FILE_CHARS = 8000; // keep prompt manageable for CPU inference

export interface AiFinding {
  issue: string;
  suggestion: string;
  confidence: number;
  explanation: string;
  category: "bug" | "security" | "maintainability" | "performance" | "style";
  lineNumber: number | null;
}

function buildPrompt(filePath: string, content: string): string {
  const truncated = content.length > MAX_FILE_CHARS
    ? content.slice(0, MAX_FILE_CHARS) + "\n... (truncated)"
    : content;

  return `Review this file: ${filePath}

Detect issues in these categories: bugs, security, maintainability, performance, style.

For each issue found, respond with a JSON array. Each item must have exactly these fields:
- "issue": short title of the problem
- "suggestion": concrete fix
- "confidence": number 0-100
- "explanation": why this matters, 1-2 sentences
- "category": one of "bug", "security", "maintainability", "performance", "style"
- "lineNumber": line number if known, otherwise null

Return ONLY a valid JSON array, no other text. If no issues found, return [].

File content:
\`\`\`
${truncated}
\`\`\`
`;
}

function parseAiResponse(raw: string): AiFinding[] {
  let jsonStr = raw.trim();

  // Model sometimes wraps in markdown code fences despite instructions
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  // Model sometimes returns a single object instead of an array — accept both.
  const arrayStart = jsonStr.indexOf("[");
  const objectStart = jsonStr.indexOf("{");
  const useArray = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart);

  let parsed: any;
  try {
    if (useArray) {
      const arrayEnd = jsonStr.lastIndexOf("]");
      if (arrayEnd === -1) return [];
      parsed = JSON.parse(jsonStr.slice(arrayStart, arrayEnd + 1));
    } else {
      const objEnd = jsonStr.lastIndexOf("}");
      if (objectStart === -1 || objEnd === -1) return [];
      parsed = JSON.parse(jsonStr.slice(objectStart, objEnd + 1));
    }
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    // Model sometimes wraps the array under a key like "issues" or "findings"
    const wrapperKeys = ["issues", "findings", "results", "items"];
    let unwrapped: any = null;
    for (const key of wrapperKeys) {
      if (Array.isArray(parsed[key])) {
        unwrapped = parsed[key];
        break;
      }
    }
    parsed = unwrapped ?? [parsed];
  }

  const validCategories = ["bug", "security", "maintainability", "performance", "style"];
  const findings: AiFinding[] = [];

  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    if (typeof item.issue !== "string" || typeof item.suggestion !== "string") continue;

    findings.push({
      issue: item.issue,
      suggestion: item.suggestion,
      confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(100, item.confidence)) : 50,
      explanation: typeof item.explanation === "string" ? item.explanation : "",
      category: validCategories.includes(item.category) ? item.category : "maintainability",
      lineNumber: typeof item.lineNumber === "number" ? item.lineNumber : null,
    });
  }

  return findings;
}

function severityFromCategory(category: AiFinding["category"], confidence: number): GeneralIssue["severity"] {
  const base: Record<AiFinding["category"], GeneralIssue["severity"]> = {
    security: "critical",
    bug: "high",
    performance: "medium",
    maintainability: "medium",
    style: "low",
  };
  const severity = base[category];
  // low-confidence findings get downgraded one notch to avoid overstating uncertain AI guesses
  if (confidence < 50) {
    const downgrade: Record<GeneralIssue["severity"], GeneralIssue["severity"]> = {
      critical: "high",
      high: "medium",
      medium: "low",
      low: "info",
      info: "info",
    };
    return downgrade[severity];
  }
  return severity;
}

export interface AiReviewResult {
  findings: AiFinding[];
  issues: GeneralIssue[];
  rawFailed: boolean;
  error?: string;
}

export async function reviewFile(filePath: string, content: string): Promise<AiReviewResult> {
  const prompt = buildPrompt(filePath, content);
  const result = await callOllama(prompt);

  if (!result.success) {
    return { findings: [], issues: [], rawFailed: true, error: result.error };
  }

  const findings = parseAiResponse(result.raw);

  const issues: GeneralIssue[] = findings.map((f) => ({
    filePath,
    lineNumber: f.lineNumber,
    severity: severityFromCategory(f.category, f.confidence),
    source: "ai" as const,
    rule: f.category,
    description: `${f.issue} — ${f.suggestion} (confidence: ${f.confidence}%) ${f.explanation}`,
  }));

  return { findings, issues, rawFailed: false };
}

export async function reviewFileStreaming(
  filePath: string,
  content: string,
  onToken: (token: string) => void
): Promise<AiReviewResult> {
  const prompt = buildPrompt(filePath, content);
  const result = await ollamaQueue.run(() => streamOllama(prompt, onToken));

  if (!result.success) {
    return { findings: [], issues: [], rawFailed: true, error: result.error };
  }

  const findings = parseAiResponse(result.raw);

  const issues: GeneralIssue[] = findings.map((f) => ({
    filePath,
    lineNumber: f.lineNumber,
    severity: severityFromCategory(f.category, f.confidence),
    source: "ai" as const,
    rule: f.category,
    description: `${f.issue} — ${f.suggestion} (confidence: ${f.confidence}%) ${f.explanation}`,
  }));

  return { findings, issues, rawFailed: false };
}