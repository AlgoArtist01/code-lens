import { pgPool } from "./db.js";

export async function createJobRecord(repositoryId: string, bullmqJobId: string): Promise<string> {
  const result = await pgPool.query(
    `INSERT INTO review_jobs (repository_id, bullmq_job_id, status)
     VALUES ($1, $2, 'queued') RETURNING id`,
    [repositoryId, bullmqJobId]
  );
  return result.rows[0].id;
}

export async function updateJobProgress(
  jobRecordId: string,
  progress: number,
  stage: string
): Promise<void> {
  await pgPool.query(
    `UPDATE review_jobs SET status = 'active', progress = $1, current_stage = $2, updated_at = now()
     WHERE id = $3`,
    [progress, stage, jobRecordId]
  );
}

export async function completeJob(jobRecordId: string): Promise<void> {
  await pgPool.query(
    `UPDATE review_jobs SET status = 'completed', progress = 100, updated_at = now() WHERE id = $1`,
    [jobRecordId]
  );
}

export async function failJob(jobRecordId: string, error: string): Promise<void> {
  await pgPool.query(
    `UPDATE review_jobs SET status = 'failed', error = $1, updated_at = now() WHERE id = $2`,
    [error, jobRecordId]
  );
}