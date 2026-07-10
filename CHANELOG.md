# Changelog

All notable changes to this project are documented here, organized by development sprint.

## [Unreleased]

## Sprint 8 — Repository Chat (RAG)
### Added
- File chunking with overlap for embedding generation
- Embeddings via Ollama (`nomic-embed-text`)
- Vector similarity search (Postgres + in-memory cosine similarity)
- Chat endpoint answering questions grounded in retrieved code context
- Frontend chat interface with source citations (file, line range, relevance score)
- Index status tracking to avoid redundant re-indexing

## Sprint 7 — AI Documentation Generator
### Added
- README, Architecture, and API doc generation via LLM
- Repository context builder (languages, directories, symbols, imports) feeding doc prompts
- Frontend documentation viewer with tabbed markdown rendering

## Sprint 6 — Dashboard
### Added
- Full React frontend: Dashboard, Repository detail, AI Review, Settings, Profile pages
- Risk spectrum visualization, issue/language/complexity/security charts
- Collapsible file tree component (shared across Repository and Review pages)
- Dark/light theme system
- Delete account flow

## Sprint 5 — Background Processing
### Added
- BullMQ + Redis job queue for the full review pipeline (parse → static analysis → AI review)
- Job status tracking, progress updates, and cancellation
- Separate worker process, decoupled from the API server

## Sprint 4 — AI Review Engine
### Added
- Ollama integration for per-file AI code review
- Streaming review responses (Server-Sent Events)
- Retry logic, timeout handling, and rate limiting
- Tolerant JSON parsing for inconsistent LLM output shapes

## Sprint 3 — Static Code Analysis
### Added
- Python analysis via Ruff, Bandit, Radon
- JavaScript/TypeScript analysis via ESLint and the TypeScript compiler
- General checks: TODO detection, large-file detection, duplicate files, possibly-dead files
- Unified `issues` table across all analyzers with severity classification

## Sprint 2 — Repository Parsing Engine
### Added
- File walker with ignore rules (node_modules, .git, dist, venv, build)
- Language detection across 10 languages
- Regex-based symbol extraction (functions, classes, imports, comments)
- Repository file tree and symbol browsing endpoints

## Sprint 1 — Authentication + Repository Management
### Added
- Register/login with JWT and bcrypt password hashing
- Repository upload (ZIP) and Git clone
- Repository list and delete

## Sprint 0 — Project Foundation
### Added
- Monorepo structure (backend/frontend)
- Docker Compose for Postgres, Redis, and both services
- Health check endpoint, structured logging
- GitHub Actions CI, pre-commit hooks