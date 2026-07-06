import { Router } from "express";
import { pgPool } from "../lib/db.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { reviewQueue } from "../lib/queue.js";
import { createJobRecord } from "../lib/jobStatus.js";

export const jobsRouter = Router();

async function verifyRepoOwnership(repoId: string, userId: string): Promise<boolean> {
  const result = await pgPool.query(
    "SELECT id FROM repositories WHERE id = $1 AND user_id = $2",
    [repoId, userId]
  );
  return result.rows.length > 0;
}

// Enqueues full pipeline (parse -> static analysis -> AI review) as a background job.
// Returns immediately — this is the "upload immediately returns" behavior from the spec.
jobsRouter.post("/repo/:id/review", requireAuth, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const bullJob = await reviewQueue.add(
    "review",
    { repositoryId: id, userId: req.user!.userId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
  );

  const jobRecordId = await createJobRecord(id, bullJob.id!);

  res.status(202).json({
    message: "Review job queued",
    jobId: jobRecordId,
    bullmqJobId: bullJob.id,
  });
});

jobsRouter.get("/repo/:id/review/:jobId", requireAuth, async (req: AuthedRequest, res) => {
  const { id, jobId } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const result = await pgPool.query(
    "SELECT id, status, progress, current_stage, error, created_at, updated_at FROM review_jobs WHERE id = $1 AND repository_id = $2",
    [jobId, id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(result.rows[0]);
});

jobsRouter.post("/repo/:id/review/:jobId/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const { id, jobId } = req.params;
  if (!(await verifyRepoOwnership(id, req.user!.userId))) {
    res.status(404).json({ error: "Repository not found" });
    return;
  }

  const result = await pgPool.query(
    "SELECT bullmq_job_id, status FROM review_jobs WHERE id = $1 AND repository_id = $2",
    [jobId, id]
  );
  const record = result.rows[0];
  if (!record) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (record.status === "completed" || record.status === "failed") {
    res.status(400).json({ error: `Cannot cancel a job that is already ${record.status}` });
    return;
  }

  const bullJob = await reviewQueue.getJob(record.bullmq_job_id);
  if (bullJob) {
    await bullJob.remove();
  }

  await pgPool.query(
    "UPDATE review_jobs SET status = 'cancelled', updated_at = now() WHERE id = $1",
    [jobId]
  );

  res.json({ message: "Job cancelled" });
});