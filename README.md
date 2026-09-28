# JobMatch AI

JobMatch AI helps job seekers find jobs that fit and improve their CV for each one. Its rule is to be truthfully useful: it never invents qualifications, never hides missing requirements, and never presents its compatibility score as a hiring probability.

Product spec: [`SPEC.md`](SPEC.md) (overview in [`docs/spec-overview.md`](docs/spec-overview.md)). Build status: [`PROGRESS.md`](PROGRESS.md).

## Stack

Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, PostgreSQL with Prisma 7 (`@prisma/adapter-pg`), Auth.js v5 (credentials + bcrypt), Zod 4, Vitest.

## Setup

Requirements: Node 20+ and a running PostgreSQL server. Docker is not required.

```bash
npm install                       # also runs `prisma generate`
cp .env.example .env.local        # then fill in the values
createdb jobmatch_ai && createdb jobmatch_ai_test
npm run db:migrate                # apply migrations to DATABASE_URL
npm run db:seed                   # demo user: demo@jobmatch.local / demo-password
npm run dev                       # http://localhost:3000
```

Environment variables are loaded from `.env.local`, then `.env` (Next.js, Prisma and Vitest all use this order).

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `TEST_DATABASE_URL` | for DB tests | Separate database for `npm test`. DB tests are skipped if it is unset |
| `AUTH_SECRET` | yes | Auth.js signing secret (`openssl rand -base64 33`) |
| `AUTH_TRUST_HOST` | for `next start` | Set to `true` when not running on Vercel |
| `LLM_PROVIDER` | no | `mock` or `anthropic` (see below) |
| `ANTHROPIC_API_KEY` | for `anthropic` | Server-side only; never sent to the browser |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5` |
| `LLM_RATE_LIMIT_PER_HOUR` | no | Per-user, per-operation LLM call limit (default 20) |
| `UPLOAD_DIR` | no | Private CV storage directory (default `storage/uploads`) |
| `MAX_UPLOAD_BYTES` | no | Upload size limit (default 5 MB) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit tests, plus DB tests when `TEST_DATABASE_URL` is set) |
| `npm run db:migrate` | Create and apply migrations (development) |
| `npm run db:deploy` | Apply existing migrations (CI or production) |
| `npm run db:seed` | Seed the demo user |
| `npm run samples:cv` | Write sample PDF and DOCX CVs to `samples/` for manual testing |

## Configuring the LLM provider

All LLM access goes through `LLMProvider.generateStructured(prompt, schema)` in `src/server/llm/`:

- **`MockProvider`** is deterministic and needs no API key. CV extraction uses a rule-based parser (`src/server/modules/parsing/heuristic-cv-parser.ts`). It is used by default when there is no API key, and always in tests.
- **`AnthropicProvider`** uses the Anthropic Messages API with JSON-schema structured outputs. Set `ANTHROPIC_API_KEY` (and optionally `LLM_PROVIDER=anthropic`).

Every response is validated with Zod. If validation fails, the request is retried once with the validation errors, and after that the user sees an error. Results are cached in `LlmCache`, keyed by user, prompt version and a hash of the input, so the same CV is never sent twice. Emails, phone numbers and URLs are removed from CV text before it is sent to any provider.

Prompts live in `src/server/prompts/`, one file per task, each with a version string. Bump the version whenever a prompt changes; that invalidates cached results.

## Architecture

```
src/
  app/                 Routes (landing, auth, app pages, API route handlers)
  auth.ts              Auth.js instance (credentials provider)
  proxy.ts             Redirects signed-out users away from app pages
  components/          UI components (no business logic)
  server/
    auth/              Auth config, password hashing, requireUser()/getApiUser()
    llm/               Provider interface, mock + Anthropic providers, cache, runStructured
    prompts/           Versioned prompt builders
    modules/           Business logic: parsing, resumes, profile, account
    storage/           Private file storage
    rate-limit.ts      Postgres fixed-window rate limiter
prisma/                Schema (all phases), migrations, seed
tests/                 Vitest: unit/, db/, fixtures/, helpers/
```

Services take the user id explicitly, and every query is scoped by it. Accessing another user's record returns "not found".

## Adding a job source

Job sources arrive in phase 4. Only permitted sources will be supported: manual entry, public APIs and feeds where allowed, and public Greenhouse or Lever boards configured in `config/job-sources.json`. There will be no scraping that bypasses terms of service or anti-bot measures.
