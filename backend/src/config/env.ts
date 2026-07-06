import "dotenv/config";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  env: req("NODE_ENV", "development"),
  port: parseInt(req("PORT", "4000"), 10),
  db: {
    host: req("POSTGRES_HOST", "localhost"),
    port: parseInt(req("POSTGRES_PORT", "5432"), 10),
    user: req("POSTGRES_USER", "app"),
    password: req("POSTGRES_PASSWORD", "app"),
    database: req("POSTGRES_DB", "app_db"),
  },
  redis: {
    url: req("REDIS_URL", "redis://localhost:6379"),
  },
  logLevel: req("LOG_LEVEL", "info"),
  jwt: {
    secret: req("JWT_SECRET", "dev-secret-change-me"),
    expiresIn: req("JWT_EXPIRES_IN", "7d"),
  },
  ollama: {
    url: req("OLLAMA_URL", "http://localhost:11434"),
    model: req("OLLAMA_MODEL", "qwen2.5-coder:3b"),
  },
};

