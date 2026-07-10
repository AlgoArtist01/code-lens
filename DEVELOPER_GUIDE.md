# Developer Guide

A deeper walkthrough of how the pieces fit together, for anyone extending this codebase.

## High-Level Flow

Every repository goes through the same pipeline, whether triggered synchronously (via individual API calls) or as a single background job:

Upload/Clone → Parse → Static Analysis → AI Review → (optional) Docs → (optional) RAG Index

Each stage writes to Postgres independently, so you can re-run any stage without repeating the others (e.g. re-run AI Review without re-parsing).

## Backend Structure

### `src/routes/`
Each file is a thin Express router scoped to one concern:
- `auth.ts` — register, login, delete account
- `repos.ts` — upload, git clone, list, delete
- `parse.ts` — file walker trigger, tree/symbols endpoints
- `analyze.ts` — general/Python/JS static analysis triggers, issues list
- `aiReview.ts` — per-file AI review (both blocking and streaming variants)
- `jobs.ts` — background job enqueue, status polling, cancellation
- `docs.ts` — documentation generation (README/Architecture/API)
- `rag.ts` — chunking/indexing trigger, chat endpoint, index status

Routes call into `lib/` for actual logic — they should stay thin (auth check, param validation, call a `lib/` function, shape the response).

### `src/lib/`
- `walker.ts` — walks a repo directory, respects ignore rules, detects language per file
- `languages.ts` — extension-to-language mapping, binary file detection
- `extractors.ts` — regex-based symbol extraction (see Known Limitations)
- `generalChecks.ts` — TODO/large-file/duplicate/dead-file detection
- `pythonTools.ts` / `jsTools.ts` — shells out to Ruff/Bandit/Radon and ESLint/tsc, parses their output into a common `GeneralIssue` shape
- `ollama.ts` — HTTP client for Ollama's `/api/generate` and `/api/embeddings`, with timeout, retry, and a serialization queue (`ollamaQueue.ts`) since local inference doesn't parallelize well on CPU
- `aiReview.ts` — prompt template + tolerant response parsing for AI code review (handles the LLM returning an object, array, or wrapped object — all three have been observed in practice)
- `docGen.ts` — builds repository context (languages, dirs, symbols) and prompts for each doc type
- `chunker.ts` — splits file content into overlapping line-based chunks
- `embeddings.ts` — wraps the embedding endpoint, implements cosine similarity
- `jobStatus.ts` — tiny helper for updating `review_jobs` rows during background processing

### `src/worker.ts`
A **separate process** from the API server (`npm run worker` vs `npm run dev`). Listens to the BullMQ queue and runs the full pipeline for background-triggered reviews, updating job progress at each stage. Concurrency is set to 1 — CPU-bound Ollama calls don't benefit from parallel workers on typical local hardware.

### Adding a new static analyzer
1. Write a `run<Tool>(rootDir): Promise<GeneralIssue[]>` function in `pythonTools.ts` or `jsTools.ts` (or a new file for a new language).
2. Shell out via `child_process.execFile`, parse the tool's output format into `GeneralIssue[]`.
3. Call it from `analyze.ts`'s relevant route (or add a new route/language bucket).
4. If it should run as part of the background pipeline too, add it to `worker.ts`'s `processReviewJob`.

## Frontend Structure

### `src/lib/`
- `api.ts` — Axios instance with auth interceptor, shared TypeScript interfaces matching backend response shapes
- `AuthContext.tsx` / `ThemeContext.tsx` — React context providers, wrap the whole app in `App.tsx`
- `fileTree.tsx` — shared tree-building + rendering logic, used by both Repository and Review pages (accepts an optional `onFileClick` to support both "browse" and "select to review" use cases)
- `ProtectedRoute.tsx` — redirects to `/login` if no token present

### `src/pages/`
Each page owns its own data fetching (no global state management beyond Auth/Theme context) — fetch in a `useEffect`, hold results in local `useState`. This keeps pages independently understandable at the cost of some duplication (e.g. several pages independently fetch `/repos`).

### Adding a new page
1. Create the component in `src/pages/`.
2. Add a route in `App.tsx` inside the `<Route element={<Layout />}>` block if it needs the sidebar, or outside it (like Login/Register) if it's a standalone screen.
3. If it needs auth, it's already covered — everything inside `<ProtectedRoute>` requires a valid token.

## Database

Schema lives in `backend/src/db/schema.sql`, applied via `backend/src/db/migrate.ts` (`npm run migrate`). It's additive-only — new tables/columns get appended, there's no down-migration system. For a project this size, that's a deliberate simplicity tradeoff; a real migration framework (e.g. `node-pg-migrate`) would be the natural upgrade if the schema needs to evolve more carefully in production.

## Testing

There's currently one test (`backend/test/health.test.ts`), using Vitest + Supertest. Run it with:
```bash
cd backend
npx vitest run
```
New tests should follow the same pattern — spin up `createApp()` (not the full server with DB/Redis connections) where possible, or mock external calls (Ollama, git, static analysis tools) for anything testing route logic in isolation.

## Common Gotchas

- **Default exports from CommonJS-interop packages** (`pino-http`, `simple-git`, `ignore`) sometimes fail TypeScript's `esModuleInterop` callable check. Use named imports (`import { pinoHttp } from "pino-http"`) instead of default imports when you hit `"This expression is not callable"` errors.
- **ESLint's `lintFiles()`** throws if a glob pattern matches zero files — always check file existence via `fast-glob` before calling it, rather than passing raw glob patterns.
- **Bandit's stdout** includes a progress bar unless run with `-q` — always parse defensively (find the first `{` or `[`) rather than assuming clean JSON.
- **LLM output shape is not guaranteed** — even with `format: "json"` and an explicit schema in the prompt, small local models will sometimes return a bare object instead of an array, or wrap the array under an unexpected key. Parse defensively; see `aiReview.ts`'s `parseAiResponse` for the pattern.

