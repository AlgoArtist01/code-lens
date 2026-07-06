import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { connectRedis } from "./lib/redis.js";

async function main() {
  await connectRedis();
  const app = createApp();
  app.listen(config.port, () => {
    logger.info(`Backend listening on :${config.port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
