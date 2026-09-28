# Phase 4: Job Sources, Discovery, Search

## Deliverables
1. **JobSource interface:** `fetchJobs(config): Promise<RawJob[]>`; implementations `ManualJobSource`, `RSSSource`, `APIJobSource`, `CompanyCareerPageSource` (Greenhouse and Lever public board JSON endpoints only).
2. **Config:** `config/job-sources.json` (enabled flag, type, board slug, company name, fetch interval). Placeholders are fine; document how to edit.
3. **Compliance:** respect robots.txt and terms, identify with a clear User-Agent, timeouts, per-source rate limiting, no bypassing anti-bot measures, no HTML scraping of sites that disallow it.
4. **Ingestion pipeline:** fetch -> normalize -> dedup (source+sourceJobId, fallback hash) -> store with source, source URL, original URL, fetchedAt -> parse with LLM only for new or changed jobs (content hash) -> mark missing jobs as expired.
5. **Background process:** cron-triggered route (secured by `CRON_SECRET`) plus Postgres-backed queue: refresh sources, then compute matches for new jobs for users with saved preferences. Batch and cap LLM use per user per day. Cheap deterministic pre-filter before any LLM call.
6. **Search:** filters for role, location, remote, experience, salary, employment type, technology, language; Postgres full-text search; saved searches (create, edit, delete); "new since last visit".
7. **Recommendations:** dashboard section "Recommended for you", ranked by internal compatibility score, with the user free to dismiss. Never auto-apply.
8. **Settings page:** manage saved searches, notification preferences (in-app only), data controls.

## Tests
- Each source adapter against recorded fixture responses (no network in tests)
- Dedup (same job from two sources, reposts, missing sourceJobId), expiration handling
- Cron route rejects missing/incorrect secret; queue is idempotent
- Search filters, saved search isolation between users
- LLM call cap enforced

## Done when
Configure one Greenhouse or Lever board, run ingestion, see jobs deduplicated and searchable, see recommendations appear for the demo user. All checks pass. Update PROGRESS.md.
