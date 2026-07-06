import { Pool } from "pg";
import { config } from "../config/env.js";

export const pgPool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function checkDb(): Promise<boolean> {
  try {
    await pgPool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
