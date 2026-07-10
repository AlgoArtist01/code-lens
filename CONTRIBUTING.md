# Contributing

Thanks for considering a contribution to this project. It started as a structured learning project (built sprint-by-sprint) and welcomes improvements, bug fixes, and honest feedback.

## Getting Set Up

Follow the [Getting Started](./README.md#getting-started) section in the README first. You'll need Node.js, PostgreSQL, Redis, Python (for the static analyzers), and Ollama running locally.

## Development Workflow

1. Fork the repository and create a branch from `main`:
```bash
   git checkout -b feature/your-feature-name
```
2. Make your changes. Keep commits focused — one logical change per commit where reasonable.
3. Run the backend typecheck before committing:
```bash
   cd backend
   npx tsc -p tsconfig.json
```
4. Run the frontend typecheck:
```bash
   cd frontend
   npx tsc -p tsconfig.json
```
5. Run linting:
```bash
   npm run lint
```
6. Open a pull request against `main` with a clear description of what changed and why.

## Code Style

- TypeScript everywhere (backend and frontend) — avoid `any` where a real type is feasible.
- Backend routes stay thin — business logic belongs in `lib/`, not inline in route handlers.
- Frontend pages can hold local state and API calls directly; shared logic (file tree, auth, theming) belongs in `lib/`.
- Match existing formatting rather than introducing a new style in a single file.

## Reporting Bugs

Open an issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Relevant logs (backend terminal output, browser console errors)

## Known Limitations Worth Knowing Before Contributing

- Symbol extraction is regex-based, not AST-based (see README's Known Limitations section). A tree-sitter-based rewrite would be a substantial, welcome contribution.
- No automated test suite beyond a single health-check test. Additional tests (especially around static analysis parsing and RAG retrieval) are very welcome.
- The RAG vector search uses in-memory cosine similarity over Postgres rows rather than a dedicated vector database — fine at small scale, but a real bottleneck for very large repositories. Contributions adding pgvector or an external vector store would be valuable.

## Questions

Open an issue for anything unclear — this project values clarity over assuming context.