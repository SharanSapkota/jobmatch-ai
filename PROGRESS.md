# Progress

Current phase: **1: complete.** Next: **Phase 2** (job model, manual jobs, job parsing, matching engine, analysis UI).

## Phase 1: Foundation, auth, CV upload and parsing, editable profile

### Done
- Setup: Next.js 16, TS strict, Tailwind 4, Prisma 7, Zod 4, Vitest 5, ESLint; scripts `typecheck lint test build db:migrate db:seed`
- Database: schema for all phases, initial migration, seed (demo@jobmatch.local / demo-password)
- Auth: Auth.js credentials + bcrypt, register/login/logout, `proxy.ts` route protection, `requireUser()` / `getApiUser()`
- LLM layer: `LLMProvider`, `MockProvider` (deterministic), `AnthropicProvider`, Zod validation + one retry, per-user DB cache (hash + prompt version), Postgres rate limiter
- CV upload: magic-byte + extension check, 5 MB limit, unpdf/mammoth extraction, cleaning, private storage (0600, outside public/), authenticated download
- CV parsing: `cv-extraction` prompt (versioned), strict `ParsedCvSchema`, contact redaction before LLM, normalized Experience/Education/Skill rows, grounding warnings
- UI: landing page, app shell and nav, dashboard, My CV (full editor: add/remove/reorder, download, re-run, delete), profile, settings (clear AI data, delete account); Jobs and Applications show labelled "not available yet" states
- Tests: 49 passing (schema, parser fixtures A/B/C, file validation, PDF/DOCX extraction, retry, cache, rate limit, auth, authorization, privacy)
- Verified end-to-end against `next start` with the mock provider: PDF + DOCX upload, parse, edit, reload, download, spoofed/invalid files rejected, user B gets 404 on user A's CV

### In progress
- none

### Blocked
- none

### Known limitations
- Client-side editor interactions were checked through the same API the editor calls, not by clicking in a browser
- Scanned (image-only) PDFs are rejected; no OCR
- The mock parser is rule-based and expects conventional section headings

### Next
- Phase 2 per `docs/phase-2.md`

## Notes
- `SPEC.md` is the full product spec. This file used to be a copy of it.
- Local DBs `jobmatch_ai` / `jobmatch_ai_test` and `AUTH_SECRET` are configured in `.env.local` (see DECISIONS.md).
