# Phase 2: Jobs, Job Parsing, Matching Engine, Analysis Page

## Deliverables
1. **Job model usage:** manual job creation (paste title, company, location, description, URL), normalization, dedup (`source+sourceJobId`, else hash of normalized company+title+location), expiration handling.
2. **Job parsing:** `job-extraction` prompt, Zod `ParsedJobSchema` (title, company, location, remoteType, employmentType, seniority, requiredSkills, preferredSkills, requiredExperience, requiredEducation, requiredLanguages, workAuthorizationRequirements, responsibilities, salaryInformation, industry). Parse once, store, never re-parse unless requested.
3. **Skill normalization:** alias map (e.g. "postgres" = "postgresql", "k8s" = "kubernetes", "js" = "javascript"), in `src/server/modules/skills`. Must be usable outside tech (e.g. "Excel", "patient care", "forklift license").
4. **Deterministic matcher** (pure functions): skills, years of experience, education, location, work mode, languages, work authorization, seniority. Each requirement gets EXACT / STRONG_TRANSFERABLE / PARTIAL / MISSING / UNKNOWN.
   - Quantified requirements ("10 years of X") are NOT satisfied by a mention of X. Compute years from experience dates when possible, otherwise UNKNOWN or PARTIAL.
5. **Semantic analysis:** `job-matching` prompt, sent only the relevant CV evidence and unresolved requirements (not the whole CV). LLM may upgrade MISSING/UNKNOWN to STRONG_TRANSFERABLE/PARTIAL only with quoted CV evidence; validate that the quoted evidence exists in the CV text, otherwise downgrade.
6. **Scoring:** weights in `config/match-weights.ts`, weighted component score, stored in JobMatch. Label "internal compatibility score" everywhere.
7. **Jobs list page:** job cards (company, role, location, remote type, match level, top matching skills, major gaps, posted date), empty/loading/error states.
8. **Job analysis page:** layout from SPEC section 12 (why it matches, strongest matches, gaps, transferable experience, component breakdown), buttons [Save] [Apply] [Tailor CV]. "Apply" opens the original URL only; it never submits anything. Analysis is computed on explicit "Analyze" click and cached; "Re-analyze" is explicit.
9. **Dashboard v1:** recently added jobs, saved jobs, top matches.

## Tests
- Fixtures: Candidates A (backend), B (frontend), C (data scientist); 6+ jobs including one non-tech job
- BullMQ pipeline vs "message queues and async processing" -> STRONG_TRANSFERABLE
- "Used PostgreSQL" vs "10 years PostgreSQL administration" -> not EXACT
- Frontend candidate vs backend job scores lower than backend candidate; keyword-only overlap does not produce a high score
- Job parsing validation, dedup, expiration, weights config, authorization (user isolation on jobs and matches)

## Done when
Add a job manually, analyze it against the fixture CV with the mock provider, see the component breakdown and gaps. All checks pass. Update PROGRESS.md.
