# Decisions

One line each: decision (reason).

- 2026-09-28: Next.js 16.3 from create-next-app; route protection lives in `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`).
- 2026-09-28: Prisma pinned to 7.10.0 (npm `latest` points at an 8.0 RC). Prisma 7 needs `prisma.config.ts` plus the `@prisma/adapter-pg` driver adapter. Client is generated into `src/generated/prisma` (gitignored, built by `postinstall`).
- 2026-09-28: vitest 5 plus `@types/node` 24 (Prisma's dev tooling needs vitest 5 as a peer; vitest 5 needs newer node types).
- 2026-09-28: The user's `.env` has no `DATABASE_URL`, so a local `jobmatch_ai` / `jobmatch_ai_test` database was created on the existing Postgres 14. Local-only values (DB URLs, generated `AUTH_SECRET`) go in `.env.local`, which is loaded before `.env`. `.env` is never read or modified.
- 2026-09-28: `npm audit` reports high-severity advisories in `mysql2` and `deepmerge-ts`, both transitive dev dependencies of the Prisma CLI tooling. They are not used at runtime, so no forced downgrade.
- 2026-09-28: Auth.js v5 (beta) with JWT sessions, which the credentials provider requires. `requireUser()` also checks that the user still exists, so a JWT issued before account deletion stops working.
- 2026-09-28: Jobs, matches, recommendations, tailored CVs and applications all carry `userId` directly, so authorization is a simple equality filter everywhere (no shared-job table).
- 2026-09-28: `Resume.parsedData` (validated `ParsedCvSchema` JSON) is the canonical, editable CV. Experience/Education/Skill rows are rebuilt from it on every save. Projects, achievements and languages live only in the JSON.
- 2026-09-28: Dates in CVs are stored as strings exactly as written ("Mar 2019", "Present"), not coerced to DateTime, so the text is not altered.
- 2026-09-28: `ParsedCvSchema` uses strict objects, so extra or hallucinated keys fail validation. A deterministic grounding check additionally flags employers, titles, degrees and skills not found in the source text.
- 2026-09-28: Contact details (emails, phones, URLs) are removed before any LLM call. The name line is not removed, because it cannot be detected reliably; the mock provider never leaves the server anyway.
- 2026-09-28: The mock LLM provider dispatches on a `TASK: <name>` header line in each prompt and runs a deterministic rule-based parser, so the app works fully without an API key.
- 2026-09-28: `AnthropicProvider` defaults to `claude-opus-5` (configurable via `ANTHROPIC_MODEL`), uses `output_config.format` JSON schema, and enables server-side refusal fallbacks (`fallbacks: "default"`).
- 2026-09-28: The LLM cache is per user (the key includes `userId`), so cached results can never leak across accounts.
- 2026-09-28: CV parsing runs synchronously in the upload request (explicit user action). A parse failure keeps the upload with status FAILED and offers "Retry parsing".
- 2026-09-28: "Clear LLM data" deletes the cache, matches, recommendations and tailored CVs, but keeps the user's (possibly edited) CV data, which can be deleted separately.
- 2026-09-28: Uploaded files are stored under `UPLOAD_DIR/<userId>/<resumeId>.<ext>` with 0600 permissions. They are served only through an authenticated route as an attachment with `no-store`.
