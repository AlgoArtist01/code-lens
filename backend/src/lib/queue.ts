import { Queue, QueueEvents } from "bullmq";
import { config } from "../config/env.js";

const connection = {
  url: config.redis.url,
};

export interface ReviewJobData {
  repositoryId: string;
  userId: string;
}

export const reviewQueue = new Queue<ReviewJobData>("repo-review", { connection });
export const reviewQueueEvents = new QueueEvents("repo-review", { connection });