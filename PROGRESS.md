# Progress

Current phase: **1: Foundation, auth, CV upload and parsing, editable profile**

## Phase 1

### Done
- Project setup: Next.js 16, TS strict, Tailwind 4, Prisma 7, Zod 4, Vitest 5, ESLint; scripts `typecheck lint test build db:migrate db:seed`
- Database: full schema for all phases, first migration applied to local `jobmatch_ai`, seed script (demo user)
- LLM layer: `LLMProvider`, `MockProvider`, `AnthropicProvider`, Zod validation + one retry, per-user DB cache (hash + prompt version), Postgres rate limiter
- CV upload/parsing services: magic-byte validation, 5 MB limit, unpdf/mammoth extraction, cleaning, contact redaction, private storage, `ParsedCvSchema`, normalized rows, grounding check
- Auth services and wiring: Auth.js credentials, `proxy.ts`, `requireUser()` / `getApiUser()`
- Resume API routes: upload, get, update, re-parse, delete, download original
- Tests (45 passing): CV schema, parser fixtures A/B/C, file validation, PDF/DOCX extraction, retry, cache, rate limiter, authorization, privacy

### In progress
- UI: landing page, auth pages, app shell, My CV editor, Profile, Settings

### Blocked
- none

### Next
- Build the UI, run the end-to-end check with the mock provider (PDF + DOCX), then write the phase 1 report

## Notes
- `SPEC.md` is the full product spec. This file used to be a copy of it.
