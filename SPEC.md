# JobMatch AI: Full Product Specification

Source of truth for the whole product. For token efficiency, prefer `docs/spec-overview.md` + the current `docs/phase-N.md` each session. Read this full file only when a cross-phase question comes up.
Working rules (autonomy, architecture, guardrails) live in `CLAUDE.md`. Current state lives in `PROGRESS.md`.

---

## 1. Product

A web application that helps job seekers find relevant jobs and improve their CV for each specific job.
It must work for **any user**, not just software engineers. This is a real product, not a demo landing page. Build working functionality.

### Core workflow
1. User creates a profile.
2. User uploads their CV/resume (PDF or DOCX).
3. The system parses the CV into structured information.
4. User specifies job preferences: target roles, location(s), remote/hybrid/on-site, experience level, salary expectations, work authorization, languages, industries.
5. The system finds relevant jobs from supported job sources.
6. Each job is analyzed against the user's profile and CV.
7. The system explains: why the job matches; which requirements are satisfied; which are missing; which CV parts undersell the user; what to change before applying.
8. The system can generate a tailored CV for that job.
9. The user can save jobs and track applications.
10. The system records application outcomes so the user can later see which kinds of jobs/applications perform best.

### Product rules (never violate)
The product optimizes for **truthful usefulness**, not impressive AI output.
- If the candidate lacks a required skill, say so.
- If evidence is ambiguous, say: "Not enough information in your CV."
- Never hallucinate qualifications.
- If a job is a poor fit, explain why without insulting the candidate.
- Never apply without explicit user action.
- Never claim guaranteed interviews or employment.
- Never fabricate qualifications or conceal missing requirements.
- Never present the score as a hiring probability.
- No unsupported marketing claims.

## 2. Tech stack
Next.js (App Router) + TypeScript, React, Tailwind, PostgreSQL + Prisma, API routes/server actions, Zod, Auth.js (credentials + bcrypt), LLM provider abstraction, PDF/DOCX text extraction, Vitest. Clean modular architecture, no unnecessary microservices. No Docker required.

## 3. Design principles
Clean, professional, minimal, fast, accessible, responsive. Excellent empty/loading/error states. No excessive gradients, no generic "AI startup" clutter. Prioritize useful information over decoration. Use cards, tables, badges, progress indicators, clear typography.
Navigation: `Dashboard | Jobs | My CV | Applications | Profile | Settings`

## 4. Core database models

**User:** id, email, name, createdAt, updatedAt

**CandidateProfile:** userId, headline, summary, yearsExperience, location, desiredRoles, preferredLocations, workMode, salaryExpectation, workAuthorization, languages, industries, createdAt, updatedAt

**Resume:** id, userId, originalFilename, fileType, extractedText, parsedData, createdAt, updatedAt. Keep raw extracted text AND structured parsed data. Preserve the original CV.

**Experience:** company, title, location, startDate, endDate, description, achievements, technologies

**Education:** institution, degree, field, startDate, endDate, description

**Skill:** name, category, proficiency (optional)

**Job:** id, source, sourceJobId, title, company, location, remoteType, employmentType, description, requirements, salary, url, postedAt, expiresAt, fetchedAt. Deduplicate on source + sourceJobId when available, with reasonable fallback dedup otherwise. Retain source, source URL, original URL, retrieval timestamp.

**JobMatch:** overallScore, skillMatch, experienceMatch, educationMatch, locationMatch, languageMatch, seniorityMatch, workAuthorizationMatch, matchedRequirements, missingRequirements, transferableSkills, concerns, recommendation, explanation, createdAt. The score is an internal compatibility/matching score, NOT a probability of being hired.

**CVRecommendation:** jobId, resumeId, recommendationType (headline, summary, experience bullet, skills, project, achievement, ordering), originalText, suggestedText, explanation, priority

**TailoredResume:** baseResumeId, jobId, generatedContent, createdAt

**Application:** jobId, userId, status, appliedAt, notes, interviewDate, outcome, createdAt, updatedAt
Statuses: SAVED, INTERESTED, APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN

Supporting tables as needed: saved searches, LLM cache, rate-limit counters, background queue, job source config.

## 5. CV parsing
Pipeline: Upload -> Extract text -> Clean text -> LLM structured extraction -> Validate with Zod -> Store structured data -> Show to user -> Allow corrections.
Never blindly trust LLM extraction. User can edit: employment, education, skills, projects, achievements, summary. Preserve the original CV.

## 6. Job ingestion
Provider abstraction: `JobSource` -> CompanyCareerPageSource, RSSSource, APIJobSource, ManualJobSource.
Do NOT build scraping that violates site terms or bypasses anti-bot mechanisms.
MVP supports: manual jobs; public feeds/APIs where permitted; a small configurable set of company career pages where automated retrieval is permitted (public Greenhouse/Lever boards via `config/job-sources.json`).
Implement normalization, deduplication, expiration handling. Every job keeps source, source URL, original URL, retrieval timestamp.

## 7. Job parsing
On entry, extract structured data (schema validated): title, company, location, remoteType, employmentType, seniority, requiredSkills, preferredSkills, requiredExperience, requiredEducation, requiredLanguages, workAuthorizationRequirements, responsibilities, salaryInformation, industry.

## 8. Matching engine
Hybrid, not "send everything to an LLM".
1. Deterministic first: skills, years of experience, education, location, work mode, language, authorization, seniority.
2. LLM semantic analysis: transferable experience, equivalent technologies, domain similarity, responsibility similarity, evidence in CV, missing evidence, concerns.

Examples: "Built BullMQ-based distributed processing pipeline" vs "message queues and async processing" = strong semantic match. "Used PostgreSQL" vs "10 years of PostgreSQL administration" = NOT equivalent.
Classify each requirement: EXACT | STRONG_TRANSFERABLE | PARTIAL | MISSING | UNKNOWN.

## 9. Match score
Default weights (configurable in one config file): Skills 30, Experience 20, Responsibilities 20, Seniority 10, Location 5, Language 5, Education 5, Authorization 5.
Show components, not only a single number. Do not claim it predicts hiring probability.

## 10. CV recommendation engine (most important feature)
For each job identify:
1. **Strong evidence:** what already matches (e.g. "Job requires distributed systems. Your CV contains a production BullMQ pipeline.").
2. **Missing evidence:** what the job asks for that the CV doesn't show (e.g. "No Kubernetes experience appears in the CV.").
3. **Undersold experience:** relevant but poorly presented (e.g. "Worked on data processing." -> "Built and optimized a Python data-processing pipeline for high-volume sensor streams."). Only suggest changes supported by the candidate's real information.
4. **Ordering:** move the most relevant experience higher.
5. **Keywords:** job terminology that genuinely corresponds to existing experience. No keyword stuffing.

NEVER invent technologies, responsibilities, metrics, job titles, achievements, certifications, employment, education. Enforce with a deterministic fabrication checker.

## 11. Tailored CV generation
"Generate tailored CV" produces a revised CV using only facts from the original.
Allowed: rewording, reordering sections, emphasizing relevant achievements, clarity, adjusting summary, selecting relevant skills.
Not allowed: inventing experience, changing dates, adding unsupported technologies, inventing metrics or responsibilities.
Show a clear diff (Original vs Tailored) so the user can review every change.

## 12. UI
**Dashboard:** recommended jobs, recently added jobs, saved jobs, applications, interview pipeline, CV improvement suggestions.
**Job cards:** company, role, location, remote type, match level, top matching skills, major gaps, posted date. Click opens the analysis page.
**Job analysis page:**
- Top: title, company, location/work mode, "Compatibility: NN%" (internal score), buttons [Save] [Apply] [Tailor CV]
- Why this matches (bullets with CV evidence)
- Your strongest matches
- Potential gaps (e.g. "Kubernetes: not found in CV", "Finnish: job requires Finnish")
- Transferable experience (legitimate equivalents)
- CV improvements: each with Current / Suggested / Why / Priority

## 13. Search
Filters: role, location, remote, experience, salary, employment type, technology, language. Users can save search preferences.

## 14. Recommendation process
Background process periodically finds new jobs matching preferences. It recommends; the user decides. Never auto-apply.

## 15. Application tracker
Flow: Saved -> Interested -> Applied -> Screening -> Interview -> Offer / Rejected. Notes allowed.
Record: application date, interview dates, rejection reason if known, referral, recruiter, salary, outcome.

## 16. Analytics
Descriptive statistics once enough data exists: applications by role, location, source, experience level, technology; interview rate; response rate; time from application to response.
Be careful with small samples ("3 applications -> 1 interview" is not a reliable rate). Show sample sizes prominently.

## 17. LLM architecture
```typescript
interface LLMProvider {
  generateStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>
}
```
Provider-agnostic. Separate prompt files: CV extraction, job extraction, job matching, CV recommendation, tailored CV. Structured outputs; prompts in dedicated files.

## 18. Security
Authentication, authorization, user isolation, secure file handling, file type validation, size limits, server-side validation, rate limiting on LLM operations, secrets in env vars, no API keys client-side. No user may access another user's resumes, jobs, applications, or analyses.

## 19. Privacy
Delete CV, delete account, delete application history, clear LLM-generated data. Send LLM providers only the minimum data needed.

## 20. Cost control
Caching, structured extraction, deduplication, analysis only when needed, stored job parsing, stored match results, regeneration only on explicit request. No LLM call when a user merely opens a job.

## 21. Landing page
Headline: "Find the jobs that actually fit you."
Subheadline: "Upload your CV, discover relevant jobs, understand your gaps, and tailor your application before you apply."
Sections: Upload your CV / Discover relevant jobs / Understand your match / Improve your CV / Track applications.
CTA: "Analyze my CV". No unsupported claims.

## 22. Phases
1. Setup, database, auth, CV upload, CV parsing, editable profile
2. Job model, manual jobs, job parsing, matching engine, analysis UI
3. CV recommendations, tailored CV generation, diff UI
4. Job sources, discovery, deduplication
5. Application tracker, analytics

Build in order. Finish and verify each phase before starting the next.

## 23. Testing
Fixtures: Candidate A (backend engineer), B (frontend engineer), C (data scientist), plus several varied jobs including a non-tech job.
Test: CV parsing validation, job parsing validation, matching logic, authorization, recommendation generation, deduplication, application state transitions, and that matching separates genuine matches from superficial keyword matches.

## 24. Developer experience
`.env.example`, `README.md` (setup, env vars, DB, running locally, tests, adding a job source, configuring the LLM provider), migrations, seed script. Sensible TypeScript types, avoid `any`, business logic outside React components, reusable services.