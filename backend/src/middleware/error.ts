import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not found", path: req.path });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
