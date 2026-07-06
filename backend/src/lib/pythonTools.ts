import { execFile } from "child_process";
import { promisify } from "util";
import { GeneralIssue } from "./generalChecks.js";

const execFileAsync = promisify(execFile);

function severityFromBanditLevel(level: string): GeneralIssue["severity"] {
  switch (level.toUpperCase()) {
    case "HIGH":
      return "critical";
    case "MEDIUM":
      return "high";
    case "LOW":
      return "medium";
    default:
      return "low";
  }
}

function severityFromRuffCode(code: string): GeneralIssue["severity"] {
  // Security-ish or correctness rules get bumped up; style rules stay low.
  if (code.startsWith("S")) return "high"; // flake8-bandit rules ported into ruff
  if (code.startsWith("E9") || code.startsWith("F")) return "medium"; // syntax/pyflakes errors
  return "low";
}

export async function runRuff(rootDir: string): Promise<GeneralIssue[]> {
  try {
    const { stdout } = await execFileAsync(
      "ruff",
      ["check", "--output-format", "json", "."],
      { cwd: rootDir, maxBuffer: 20 * 1024 * 1024 }
    );
    return parseRuffOutput(stdout);
  } catch (err: any) {
    // ruff exits non-zero when it finds issues; stdout still has the JSON
    if (err.stdout) return parseRuffOutput(err.stdout);
    return [];
  }
}

function parseRuffOutput(stdout: string): GeneralIssue[] {
  if (!stdout.trim()) return [];
  const results = JSON.parse(stdout);
  return results.map((r: any) => ({
    filePath: r.filename.replace(/\\/g, "/"),
    lineNumber: r.location?.row ?? null,
    severity: severityFromRuffCode(r.code ?? ""),
    source: "ruff" as const,
    rule: r.code ?? "unknown",
    description: r.message ?? "Ruff issue",
  }));
}

export async function runBandit(rootDir: string): Promise<GeneralIssue[]> {
  try {
    const { stdout } = await execFileAsync(
        "bandit",
        ["-r", ".", "-f", "json", "-q"],
        { cwd: rootDir, maxBuffer: 20 * 1024 * 1024 }
);
    return parseBanditOutput(stdout);
  } catch (err: any) {
    if (err.stdout) return parseBanditOutput(err.stdout);
    return [];
  }
}

function parseBanditOutput(stdout: string): GeneralIssue[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart === -1) return [];
  const parsed = JSON.parse(trimmed.slice(jsonStart));
  const results = parsed.results ?? [];
  return results.map((r: any) => ({
    filePath: (r.filename as string).replace(/\\/g, "/").replace(/^\.\//, ""),
    lineNumber: r.line_number ?? null,
    severity: severityFromBanditLevel(r.issue_severity ?? "LOW"),
    source: "bandit" as const,
    rule: r.test_id ?? "unknown",
    description: r.issue_text ?? "Bandit security issue",
  }));
}

const RADON_COMPLEXITY_THRESHOLD = 10; // B-grade and above per radon's scale starts mattering around here

export async function runRadon(rootDir: string): Promise<GeneralIssue[]> {
  try {
    const { stdout } = await execFileAsync(
      "radon",
      ["cc", ".", "-j"],
      { cwd: rootDir, maxBuffer: 20 * 1024 * 1024 }
    );
    return parseRadonOutput(stdout);
  } catch (err: any) {
    if (err.stdout) return parseRadonOutput(err.stdout);
    return [];
  }
}

function parseRadonOutput(stdout: string): GeneralIssue[] {
  if (!stdout.trim()) return [];
  const parsed = JSON.parse(stdout);
  const issues: GeneralIssue[] = [];

  for (const [filePath, blocks] of Object.entries(parsed)) {
    for (const block of blocks as any[]) {
      if (block.complexity >= RADON_COMPLEXITY_THRESHOLD) {
        issues.push({
          filePath: filePath.replace(/\\/g, "/").replace(/^\.\//, ""),
          lineNumber: block.lineno ?? null,
          severity: block.complexity >= 20 ? "high" : "medium",
          source: "radon" as const,
          rule: "cyclomatic-complexity",
          description: `${block.name} has cyclomatic complexity ${block.complexity} (rank ${block.rank})`,
        });
      }
    }
  }
  return issues;
}