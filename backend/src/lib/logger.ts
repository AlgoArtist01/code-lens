import pino from "pino";
import { config } from "../config/env.js";

export const logger = pino({
  level: config.logLevel,
  transport:
    config.env === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
