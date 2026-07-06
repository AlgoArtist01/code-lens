import "dotenv/config";
import { Worker, Job } from "bullmq";
import { config } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { pgPool } from "./lib/db.js";
import { repoPath } from "./lib/storage.js";
import { walkRepository } from "./lib/walker.js";
import { extractSymbols } from "./lib/extractors.js";
import {
  detectTodos,
  detectLargeFile,
  detectDuplicateFiles,
  detectDeadFiles,
  GeneralIssue,
} from "./lib/generalChecks.js";
import { runRuff, runBandit, runRadon } from "./lib/pythonTools.js";
import { runEslint, runTsc } from "./lib/jsTools.js";
import { reviewFile } from "./lib/aiReview.js";
import { ReviewJobData } from "./lib/queue.js";
import { updateJobProgress, completeJob, failJob } from "./lib/jobStatus.js";

const connection = { url: config.redis.url };

async function saveIssues(repoId: string, issues: GeneralIssue[]): Promise<void> {
  for (const issue of issues) {
    await pgPool.query(
      `INSERT INTO issues (repository_id, file_path, line_number, severity, source, rule, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [repoId, issue.filePath, issue.lineNumber, issue.severity, issue.source, issue.rule, issue.description]
    );
  }
}

async function processReviewJob(job: Job<ReviewJobData>): Promise<void> {
  const { repositoryId } = job.data;
  const jobRecordResult = await pgPool.query(
    "SELECT id FROM review_jobs WHERE bullmq_job_id = $1",
    [job.id]
  );
  const jobRecordId = jobRecordResult.rows[0]?.id;
  if (!jobRecordId) throw new Error("Job record not found");

  const rootDir = repoPath(repositoryId);

  // Stage 1: Parse
  await updateJobProgress(jobRecordId, 10, "parsing");
  const { files, directories } = await walkRepository(rootDir);

  await pgPool.query("DELETE FROM files WHERE repository_id = $1", [repositoryId]);
  await pgPool.query("DELETE FROM directories WHERE repository_id = $1", [repositoryId]);

  for (const dir of directories) {
    const parentPath = dir.includes("/") || dir.includes("\\")
      ? dir.split(/[/\\]/).slice(0, -1).join("/")
      : null;
    await pgPool.query(
      `INSERT INTO directories (repository_id, path, parent_path) VALUES ($1, $2, $3)`,
      [repositoryId, dir.replace(/\\/g, "/"), parentPath]
    );
  }

  for (const file of files) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const directoryPath = normalizedPath.includes("/")
      ? normalizedPath.split("/").slice(0, -1).join("/")
      : null;

    const fileResult = await pgPool.query(
      `INSERT INTO files (repository_id, path, directory_path, language, size_bytes, line_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [repositoryId, normalizedPath, directoryPath, file.language, file.sizeBytes, file.lineCount]
    );
    const fileId = fileResult.rows[0].id;

    if (file.language && file.content) {
      const symbols = extractSymbols(file.language, file.content);
      for (const symbol of symbols) {
        await pgPool.query(
          `INSERT INTO symbols (file_id, repository_id, type, name, line_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [fileId, repositoryId, symbol.type, symbol.name, symbol.lineNumber]
        );
      }
    }
  }
  await job.updateProgress(30);

  // Stage 2: Static analysis (general + python + js/ts, all in one background pass)
  await updateJobProgress(jobRecordId, 40, "static-analysis");
  await pgPool.query("DELETE FROM issues WHERE repository_id = $1", [repositoryId]);

  const generalIssues: GeneralIssue[] = [];
  for (const file of files) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    if (file.content) generalIssues.push(...detectTodos(normalizedPath, file.content));
    generalIssues.push(...detectLargeFile(normalizedPath, file.lineCount));
  }
  generalIssues.push(
    ...detectDuplicateFiles(files.map((f) => ({ path: f.relativePath.replace(/\\/g, "/"), content: f.content })))
  );
  generalIssues.push(
    ...detectDeadFiles(
      files.map((f) => ({ path: f.relativePath.replace(/\\/g, "/"), content: f.content, language: f.language }))
    )
  );
  await saveIssues(repositoryId, generalIssues);

  const [ruffIssues, banditIssues, radonIssues, eslintIssues, tscIssues] = await Promise.all([
    runRuff(rootDir),
    runBandit(rootDir),
    runRadon(rootDir),
    runEslint(rootDir),
    runTsc(rootDir),
  ]);
  await saveIssues(repositoryId, [...ruffIssues, ...banditIssues, ...radonIssues, ...eslintIssues, ...tscIssues]);
  await job.updateProgress(60);

  // Stage 3: AI review (only code files, capped to avoid huge repos taking forever)
  await updateJobProgress(jobRecordId, 70, "ai-review");
  const codeFiles = files.filter((f) => f.language && f.content).slice(0, 10); // cap for demo purposes

  for (let i = 0; i < codeFiles.length; i++) {
    const file = codeFiles[i];
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const result = await reviewFile(normalizedPath, file.content!);
    if (!result.rawFailed) {
      await saveIssues(repositoryId, result.issues);
    }
    const progress = 70 + Math.floor((i + 1) / codeFiles.length * 25);
    await updateJobProgress(jobRecordId, progress, `ai-review (${i + 1}/${codeFiles.length})`);
  }

  await pgPool.query("UPDATE repositories SET status = 'completed' WHERE id = $1", [repositoryId]);
  await completeJob(jobRecordId);
}

const worker = new Worker<ReviewJobData>(
  "repo-review",
  async (job) => {
    try {
      await processReviewJob(job);
    } catch (err: any) {
      const jobRecordResult = await pgPool.query(
        "SELECT id FROM review_jobs WHERE bullmq_job_id = $1",
        [job.id]
      );
      const jobRecordId = jobRecordResult.rows[0]?.id;
      if (jobRecordId) await failJob(jobRecordId, err.message ?? "Unknown error");
      throw err; // let BullMQ handle retry
    }
  },
  { connection, concurrency: 1 } // 1 at a time — CPU-bound Ollama calls don't parallelize well locally
);

worker.on("completed", (job) => logger.info(`Job ${job.id} completed`));
worker.on("failed", (job, err) => logger.error({ err }, `Job ${job?.id} failed`));

logger.info("Worker started, listening for repo-review jobs");