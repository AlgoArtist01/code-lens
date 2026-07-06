import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { pgPool } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pgPool.query(sql);
  logger.info("Migration applied");
  await pgPool.end();
}

migrate().catch((err) => {
  logger.error({ err }, "Migration failed");
  process.exit(1);
});