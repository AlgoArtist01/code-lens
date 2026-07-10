# Setup Guide

Everything you need installed before running this project locally. Written for Windows (native, no Docker); Linux/Mac users can skip the WSL step and use native package managers instead.

---

## 1. Node.js 20+

Download: https://nodejs.org (LTS version)

Verify:
```bash
node --version
npm --version
```

---

## 2. PostgreSQL 16+

Download: https://www.postgresql.org/download/windows/

During install:
- Set a password for the `postgres` superuser (remember it)
- Keep default port `5432`
- When Stack Builder opens at the end, click **Cancel** — not needed

### Create the app database and user

Open **SQL Shell (psql)** from the Start Menu. Press Enter through the connection prompts (Server, Port, Username) until asked for the `postgres` user's password, then run:

```sql
CREATE USER app WITH PASSWORD 'app';
CREATE DATABASE app_db OWNER app;
```

Exit with `\q`.

### (Optional) Add `psql` to PATH

If you want to run `psql` directly from a regular terminal:
1. Search "Environment Variables" in the Start Menu
2. Edit **Path** (User variables)
3. Add: `C:\Program Files\PostgreSQL\<version>\bin`
4. Restart your terminal

---

## 3. Redis (via WSL2)

Windows doesn't support Redis natively — run it inside WSL2 (Windows Subsystem for Linux).

```powershell
wsl --install
```
Restart your machine if prompted.

Open the WSL (Ubuntu) terminal:
```bash
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

Verify:
```bash
redis-cli ping
```
Should return `PONG`.

**Note:** WSL's Redis instance is reachable from Windows at `localhost:6379`. You'll need to start it manually (`sudo service redis-server start`) each time you restart your machine, unless you set up WSL to auto-start it.

Alternative for Windows users who don't want WSL: [Memurai](https://www.memurai.com/get-memurai) — a native Windows Redis-compatible server.

---

## 4. Python 3.11+

Download: https://www.python.org/downloads/windows/

**During install, check "Add python.exe to PATH."**

Verify:
```bash
python --version
pip --version
```

### Install static analysis tools

```bash
pip install ruff bandit radon
```

Verify:
```bash
ruff --version
bandit --version
radon --version
```

---

## 5. Ollama (local LLM runtime)

Download: https://ollama.com/download/windows

Runs as a background service on `localhost:11434` once installed.

### Pull required models

```bash
ollama pull qwen2.5-coder:3b
ollama pull nomic-embed-text
```

- `qwen2.5-coder:3b` — code review, documentation generation, chat (~2GB). A `7b` variant is also supported (better quality, slower on CPU-only machines) — pull it with `ollama pull qwen2.5-coder:7b` and update `OLLAMA_MODEL` in `.env` if you prefer it.
- `nomic-embed-text` — embeddings for repository chat/RAG (~270MB)

Verify both are installed:
```bash
ollama list
```

**Hardware note:** these models run on CPU if you don't have a dedicated GPU. Expect roughly 30-90 seconds per AI review/chat response on a modern laptop CPU with the 3b model — this is expected, not a bug.

---

## 6. Git

Usually already installed if you're using GitHub. Verify:
```bash
git --version
```
If missing: https://git-scm.com/download/win

---

## 7. Clone and configure the project

```bash
git clone <your-repo-url>
cd ai-code-review
```

Copy environment files:
```bash
cp .env.example .env
cp .env.example backend/.env
```

Edit both `.env` files — key values:

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=<any-random-string>
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:3b

---

## 8. Install dependencies and run migrations

```bash
cd backend
npm install
npm run migrate
```

Verify tables were created:
```bash
psql -U app -d app_db -h localhost -c "\dt"
```
Should list: `chunks`, `directories`, `documents`, `files`, `issues`, `repositories`, `review_jobs`, `symbols`, `upload_jobs`, `users`.

---

## 9. Run everything (3 terminals)

**Terminal 1 — Backend API:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Background worker:**
```bash
cd backend
npm run worker
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173**, register an account, and upload or clone a repository.

---

## Checklist Summary

| Component     | Install                                      | Verify command                  |
|----------------|-----------------------------------------------|----------------------------------|
| Node.js        | nodejs.org                                    | `node --version`                |
| PostgreSQL     | postgresql.org                                | `psql --version` (if on PATH)   |
| Redis (WSL)    | `wsl --install` then `apt install redis-server` | `redis-cli ping`               |
| Python         | python.org (check "Add to PATH")              | `python --version`               |
| ruff/bandit/radon | `pip install ruff bandit radon`             | `ruff --version`                 |
| Ollama         | ollama.com                                    | `ollama list`                    |
| Git            | git-scm.com                                   | `git --version`                  |

---

## Troubleshooting

**`ECONNREFUSED` on Redis** — WSL's Redis isn't running. Open WSL, run `sudo service redis-server start`.

**`psql: command not found`** — either use the SQL Shell (psql) app from the Start Menu instead, or add Postgres's `bin` folder to your PATH (see step 2).

**Ollama responses take 60-90+ seconds** — expected on CPU-only hardware with no dedicated GPU. Consider the smaller `3b` model over `7b` if speed matters more than output quality for your use case.

**`npm install` fails with EPERM/ENOTEMPTY on Windows** — usually a locked file from an antivirus scan or an open editor/terminal in that folder. Close everything touching the project folder, delete `node_modules` manually via File Explorer if needed, then retry.
