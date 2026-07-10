import { Router } from "express";
import { pgPool } from "../lib/db.js";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";
import { deleteRepoFolder } from "../lib/storage.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "email and password (min 8 chars) required" });
    return;
  }

  const existing = await pgPool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const result = await pgPool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [email, passwordHash]
  );
  const user = result.rows[0];
  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const result = await pgPool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email } });
});

authRouter.delete("/account", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;

  const reposResult = await pgPool.query("SELECT id FROM repositories WHERE user_id = $1", [userId]);
  for (const row of reposResult.rows) {
    await deleteRepoFolder(row.id);
  }

  await pgPool.query("DELETE FROM users WHERE id = $1", [userId]);
  res.status(204).send();
});