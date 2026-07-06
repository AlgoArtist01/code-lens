import { Router } from "express";
import { checkDb } from "../lib/db.js";
import { checkRedis } from "../lib/redis.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
  const ok = db && redis;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    db: db ? "up" : "down",
    redis: redis ? "up" : "down",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
