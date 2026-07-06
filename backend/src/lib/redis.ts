import { createClient } from "redis";
import { config } from "../config/env.js";
import { logger } from "./logger.js";

export const redisClient = createClient({ url: config.redis.url });

redisClient.on("error", (err) => logger.error({ err }, "Redis client error"));

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function checkRedis(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}
