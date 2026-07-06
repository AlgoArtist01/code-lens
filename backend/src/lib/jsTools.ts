import { ESLint } from "eslint";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fg from "fast-glob";
import { fileURLToPath } from "url";
import { GeneralIssue } from "./generalChecks.js";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function severityFromEslint(sev: number): GeneralIssue["severity"] {
  return sev === 2 ? "high" : "medium";
}

export async function runEslint(rootDir: string): Promise<GeneralIssue[]> {
  try {
    const eslint = new ESLint({
      cwd: rootDir,
      overrideConfig: {
        parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
        env: { es2022: true, browser: true, node: true },
        extends: ["eslint:recommended"],
        ignorePatterns: ["node_modules/**", "dist/**", "build/**", ".git/**", "venv/**"],
      } as any,
    });

    const candidateFiles = await fg(["**/*.js", "**/*.jsx"], {
      cwd: rootDir,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/venv/**"],
    });

    if (candidateFiles.length === 0) return [];

    const results = await eslint.lintFiles(candidateFiles);
    const issues: GeneralIssue[] = [];
    for (const result of results) {
      const relPath = path.relative(rootDir, result.filePath).replace(/\\/g, "/");
      for (const msg of result.messages) {
        issues.push({
          filePath: relPath,
          lineNumber: msg.line ?? null,
          severity: severityFromEslint(msg.severity),
          source: "eslint",
          rule: msg.ruleId ?? "parse-error",
          description: msg.message,
        });
      }
    }
    return issues;
  } catch (err) {
    console.error("ESLint run failed:", err);
    return [];
  }
}

const TSC_LINE_REGEX = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/;

export async function runTsc(rootDir: string): Promise<GeneralIssue[]> {
  const tsconfigs = await fg("**/tsconfig.json", {
    cwd: rootDir,
    ignore: ["**/node_modules/**"],
  });
  if (tsconfigs.length === 0) return [];

  const tscBin = path.join(__dirname, "..", "..", "node_modules", "typescript", "bin", "tsc");
  const issues: GeneralIssue[] = [];

  for (const tsconfigRelPath of tsconfigs) {
    try {
      await execFileAsync(
        process.execPath,
        [tscBin, "--noEmit", "-p", tsconfigRelPath],
        { cwd: rootDir, maxBuffer: 20 * 1024 * 1024 }
      );
    } catch (err: any) {
      const output: string = err.stdout || "";
      const lines = output.split(/\r?\n/);
      const configDir = path.dirname(tsconfigRelPath);
      for (const line of lines) {
        const match = line.match(TSC_LINE_REGEX);
        if (match) {
          const [, filePart, lineNo, , code, message] = match;
          const fullRelPath = configDir === "." ? filePart : path.join(configDir, filePart);
          issues.push({
            filePath: fullRelPath.replace(/\\/g, "/"),
            lineNumber: parseInt(lineNo, 10),
            severity: "medium",
            source: "tsc",
            rule: code,
            description: message,
          });
        }
      }
    }
  }
  return issues;
}