# JobMatch AI: Standing Rules

Product spec: read `docs/spec-overview.md` and ONLY the current phase file `docs/phase-N.md`.
State: read `PROGRESS.md` first. Decisions: `DECISIONS.md`.

## Operating mode: autonomous
- Do NOT ask "shall I run/install/proceed?". Just do it.
- Make reasonable engineering decisions yourself. Log non-trivial ones as one line in
  DECISIONS.md (decision + reason), then continue.
- Stop and ask only if:
  1. A required secret is missing and blocks ALL progress.
  2. An action is destructive and irreversible outside this project directory.
  3. The spec contradicts itself in a way that changes the architecture.
- On failure (install, migration, test, build): diagnose and fix. Try 3 distinct approaches
  before calling it blocked. If still blocked, record it in PROGRESS.md, skip to the next
  independent task, continue.
- Never run `git push`. Never touch files outside this directory. Never read or print `.env`.
- No Docker. The database is `DATABASE_URL` from `.env`. To check reachability, run a Prisma
  command and see if it fails. If the DB is unreachable, keep building pure-logic modules and
  tests, mark DB-dependent steps PENDING in PROGRESS.md, and continue.

## Working loop
1. Take the next unfinished item in the current phase.
2. Implement it fully. No stubs presented as working features. No TODOs in core logic.
3. Write tests alongside the code.
4. Verify: typecheck, lint, tests, `next build`. Fix all failures before moving on.
5. Commit locally (conventional commits). Update PROGRESS.md (done / in progress / blocked / next).
6. Do not start the next phase until the current one passes typecheck, tests and build.
   Finish each phase with a report of at most 15 lines: implemented, files changed, tests
   (results), limitations, next step.

## Token discipline
- Run tests, lint and build with quiet output. Show only failures. Never paste full logs.
- Don't re-read files you just wrote. Don't narrate. No long explanations.
- Use standard tooling (create-next-app, Auth.js, Prisma defaults) over custom solutions.
- Read only files relevant to the current task. Never read node_modules, .next, lockfiles.

## Architecture
- Next.js App Router, TypeScript strict, Tailwind, Prisma + PostgreSQL, Zod, Auth.js
  (credentials + bcrypt), Vitest.
- Business logic in `src/server/modules/*` (matching, scoring, parsing, recommendations,
  tailoring, jobs, applications, analytics): pure and framework-free where possible.
  React components contain no business logic.
- No `any` unless unavoidable and commented. Validate all external input with Zod server-side.
- PostgreSQL is the only datastore. Rate limiting and the background queue use Postgres tables
  plus a cron-triggered route. No Redis.
- Every query is scoped by the authenticated user id. Write authorization tests proving user A
  cannot read or modify user B's resumes, jobs, matches, applications or tailored CVs.
- Uploads: validate type (PDF/DOCX by content, not just extension), enforce a size limit,
  never serve files from a public path.
- Privacy: delete CV, delete account, delete application history, clear LLM-generated data.

## LLM layer
- `LLMProvider.generateStructured<T>(prompt, schema)`. Implement `AnthropicProvider` and
  `MockProvider`, chosen by `LLM_PROVIDER`. Default to mock when no API key is set.
- Mock returns deterministic fixture-based outputs so the app and all tests run without a key.
- Prompts live in `src/server/prompts/`, one file each: cv-extraction, job-extraction,
  job-matching, cv-recommendation, tailored-cv. Each has a version string.
- Validate every LLM response with Zod. On failure retry once with the error message, then fail
  gracefully with a user-visible error.
- Cache results in the DB keyed by content hash + prompt version. Never call an LLM on page
  view. Regenerate only on explicit user action.
- Send the minimum data needed. Never send email or contact details.

## Truthfulness guardrails (highest priority, enforce in code, not only prompts)
- Deterministic fabrication checker for tailored CVs and recommendations: every skill or
  technology must trace to the source CV (with alias normalization); employers, titles and
  dates must match exactly; every number or metric must appear in the source. Violations are
  rejected or visibly flagged, never silently shown.
- Each requirement is classified EXACT / STRONG_TRANSFERABLE / PARTIAL / MISSING / UNKNOWN.
  Ambiguous evidence says "Not enough information in your CV."
- Quantified requirements ("10 years of PostgreSQL administration") are NOT satisfied by a
  mere mention of the technology.
- The score is labelled "internal compatibility score" everywhere. It is never a hiring
  probability. Show the component breakdown. Weights are configurable in one config file.
- Never auto-apply, never promise interviews or employment, never hide missing requirements.
- Analytics show sample sizes prominently and warn on small samples.

## Testing
- Fixtures: Candidate A (backend), B (frontend), C (data scientist), plus at least 6 varied
  jobs, including one non-tech job.
- Include tests separating genuine matches from keyword matches (BullMQ pipeline vs "message
  queues"; "used PostgreSQL" vs "10 years PostgreSQL administration").
- Cover: CV parsing validation, job parsing validation, matching, scoring, authorization,
  recommendations, fabrication checker, deduplication, application state transitions.

## Job sources
- Only legitimate sources: manual entry, public APIs/RSS where permitted, and a config-driven
  adapter for public Greenhouse/Lever boards from `config/job-sources.json`.
- No scraping that bypasses terms or anti-bot measures.
- Every job keeps source, source URL, original URL and fetchedAt.

## Developer experience
- Maintain `.env.example`, `README.md` (setup, env vars, DB, running, tests, adding a job
  source, configuring the LLM provider), Prisma migrations, and a seed script.