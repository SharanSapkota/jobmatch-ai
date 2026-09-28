# Phase 1: Foundation, Auth, CV Upload and Parsing, Editable Profile

Read `spec-overview.md` first. Rules in `CLAUDE.md`.

## Deliverables
1. **Project setup:** create-next-app (App Router, TS strict, Tailwind), Prisma, Zod, Vitest, ESLint. Scripts: `typecheck`, `lint`, `test`, `build`, `db:migrate`, `db:seed`.
2. **Database:** Prisma schema for ALL models in spec-overview section 4 (so later phases need no reshaping), first migration, seed script (demo user).
3. **Auth:** Auth.js credentials (email + bcrypt), register/login/logout, protected routes via middleware, session helper `requireUser()` used by every server action/route.
4. **LLM layer:** `LLMProvider` interface, `MockProvider`, `AnthropicProvider`, env selection, Zod validation with one retry, DB cache keyed by content hash + prompt version, rate-limit table + helper.
5. **CV upload:** route handler accepting PDF/DOCX, validate by content (magic bytes) and size limit (5 MB), extract text (pdf-parse or unpdf, mammoth), clean text, store original file privately (not in a public path), store `extractedText`.
6. **CV parsing:** `cv-extraction` prompt, Zod `ParsedCvSchema` (experience, education, skills, projects, achievements, summary, languages), store in `Resume.parsedData` and normalized Experience/Education/Skill rows.
7. **My CV page:** show extracted data, full edit UI for employment, education, skills, projects, achievements, summary; add/remove/reorder entries; link to original file; delete CV.
8. **Profile page:** headline, summary, yearsExperience, location, desiredRoles, preferredLocations, workMode, salaryExpectation, workAuthorization, languages, industries.
9. **Landing page** per spec-overview section 11, plus app shell with navigation.
10. **Privacy:** delete CV, delete account (cascade), clear LLM-generated data.

## Tests
- CV parsing validation (valid, malformed, and hallucinated-field LLM output rejected by Zod)
- File validation (wrong type, spoofed extension, oversize)
- Authorization: user A cannot read, edit or delete user B's resume or profile
- Rate limiter and LLM cache behavior

## Done when
Typecheck, lint, tests and build pass. Upload a PDF and a DOCX with the mock provider, see parsed data, edit it, save it, reload and see the edits. Update PROGRESS.md and report in 15 lines or fewer.
