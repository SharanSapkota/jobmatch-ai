# JobMatch AI: Spec Overview

Cross-cutting product rules, data model and scoring. Read this every session, plus only the current `docs/phase-N.md`.
Working rules (autonomy, architecture, guardrails) live in `CLAUDE.md`.

---

## 1. Product

A web application that helps job seekers find relevant jobs and improve their CV for each specific job.
It must work for **any user**, not just software engineers. This is a real product, not a demo landing page.

### Core workflow

1. User creates a profile.
2. User uploads their CV/resume (PDF or DOCX).
3. The system parses the CV into structured information.
4. User specifies job preferences: target roles, location(s), remote/hybrid/on-site, experience level, salary expectations, work authorization, languages, industries.
5. The system finds relevant jobs from supported job sources.
6. Each job is analyzed against the user's profile and CV.
7. The system explains: why the job matches; which requirements are satisfied; which are missing; which parts of the CV undersell the user; what to change before applying.
8. The system can generate a tailored CV for that specific job.
9. The user can save jobs and track applications.
10. The system records application outcomes so the user can later see which types of jobs/applications perform best.

### Product rules (never violate)

The product optimizes for **truthful usefulness**, not impressive AI output.

- If the candidate lacks a required skill, say so.
- If evidence is ambiguous, say: **"Not enough information in your CV."**
- Never hallucinate qualifications.
- If a job is a poor fit, explain why without insulting the candidate.
- Never apply to a job without explicit user action.
- Never claim guaranteed interviews or employment.
- Never fabricate qualifications or conceal missing requirements.
- Never present the score as a hiring probability.
- No unsupported marketing claims (e.g. "Get hired 5x faster").

---

## 2. Tech stack

- Next.js (App Router) with TypeScript, React, Tailwind CSS
- PostgreSQL with Prisma ORM
- API routes / server actions where appropriate
- Zod for validation
- Auth.js (credentials + bcrypt)
- LLM access through a provider abstraction
- PDF/DOCX text extraction
- Vitest for tests
- Clean modular architecture, no unnecessary microservices

---

## 3. Design principles

Feels like a serious SaaS product.

- Clean, professional, minimal, fast, accessible, responsive
- Excellent empty, loading and error states
- No excessive gradients, no generic "AI startup" clutter
- Prioritize useful information over decoration
- Use cards, tables, badges, progress indicators and clear typography

### Navigation

`Dashboard | Jobs | My CV | Applications | Profile | Settings`

---

## 4. Core database models

PostgreSQL via Prisma. All user-owned tables carry `userId` (directly or through a parent) and every query is scoped by it.

### User
`id, email, name, createdAt, updatedAt`

### CandidateProfile
`userId, headline, summary, yearsExperience, location, desiredRoles, preferredLocations, workMode, salaryExpectation, workAuthorization, languages, industries, createdAt, updatedAt`

### Resume
`id, userId, originalFilename, fileType, extractedText, parsedData, createdAt, updatedAt`
Keep both the raw extracted text and the structured parsed representation. Preserve the original CV.

### Experience
`company, title, location, startDate, endDate, description, achievements, technologies`

### Education
`institution, degree, field, startDate, endDate, description`

### Skill
`name, category, proficiency (optional)`

### Job
`id, source, sourceJobId, title, company, location, remoteType, employmentType, description, requirements, salary, url, postedAt, expiresAt, fetchedAt`
Deduplicate on `source + sourceJobId` when available, with a reasonable fallback (e.g. normalized company + title + location hash) when not.
Every job also retains: source, source URL, original URL, retrieval timestamp.

### JobMatch
Connects a candidate to a job.
`overallScore, skillMatch, experienceMatch, educationMatch, locationMatch, languageMatch, seniorityMatch, workAuthorizationMatch, matchedRequirements, missingRequirements, transferableSkills, concerns, recommendation, explanation, createdAt`
The score is an **internal compatibility/matching score**, not an objective probability of being hired. Label it that way everywhere.

### CVRecommendation
`jobId, resumeId, recommendationType, originalText, suggestedText, explanation, priority`
Types include: headline, summary, experience bullet, skills, project, achievement, ordering.

### TailoredResume
`baseResumeId, jobId, generatedContent, createdAt`

### Application
`jobId, userId, status, appliedAt, notes, interviewDate, outcome, createdAt, updatedAt`

Statuses: `SAVED, INTERESTED, APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN`

Tracker also records: application date, interview dates, rejection reason if known, referral, recruiter, salary, outcome.

### Supporting tables (add as needed)
Saved search preferences, LLM result cache (content hash + prompt version), rate-limit counters, background job queue, job source configuration.

---

## 5. Match score

Transparent, component-based, weights configurable in **one config file**.

Default weights:

| Component | Weight |
|---|---|
| Skills | 30% |
| Experience | 20% |
| Responsibilities | 20% |
| Seniority | 10% |
| Location | 5% |
| Language | 5% |
| Education | 5% |
| Authorization | 5% |

- Show the components to the user, not only a single number.
- Label the total as an **internal compatibility score**.
- Do not claim it predicts hiring probability.

### Requirement classification

Every job requirement is classified as one of:

`EXACT | STRONG_TRANSFERABLE | PARTIAL | MISSING | UNKNOWN`

Examples the system must get right:

- "Built BullMQ-based distributed processing pipeline" vs "message queues and asynchronous processing" -> **strong transferable/semantic match**.
- "Used PostgreSQL" vs "10 years of PostgreSQL administration" -> **NOT equivalent** (quantified requirement is not satisfied by a mere mention).

### Hybrid matching

1. **Deterministic first:** skills, years of experience, education, location, work mode, language, authorization, seniority.
2. **Then LLM semantic analysis:** transferable experience, equivalent technologies, domain similarity, responsibility similarity, evidence in the CV, missing evidence, potential concerns.

Never just send the whole CV and job description to an LLM asking "is this a match?".

---

## 6. LLM architecture

```typescript
interface LLMProvider {
  generateStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>
}
```

- The rest of the app never depends directly on one model provider.
- Separate prompt files for: CV extraction, job extraction, job matching, CV recommendation, tailored CV generation.
- Use structured outputs whenever possible. Keep prompts in dedicated files.

## 7. Security

Authentication, authorization, strict user isolation, secure file handling, file type validation, file size limits, server-side validation, rate limiting on expensive LLM operations, secrets only in environment variables, no API keys in client code.
A user's CV and job-search data is private. No user may ever access another user's resumes, jobs, applications, matches or analyses.

## 8. Privacy

CVs are sensitive personal data. Provide: delete CV, delete account, delete application history, clear LLM-generated data.
Send LLM providers only the minimum data needed for each analysis.

## 9. Cost control

Caching, structured extraction, deduplication, analysis only when needed, stored job parsing, stored match results, regeneration only on explicit user request.
Never call an LLM merely because the user opened a job.

---

## 10. Phase map

| Phase | Scope | File |
|---|---|---|
| 1 | Setup, database, auth, CV upload, CV parsing, editable profile | `docs/phase-1.md` |
| 2 | Job model, manual jobs, job parsing, matching engine, analysis UI | `docs/phase-2.md` |
| 3 | CV recommendations, tailored CV generation, diff UI | `docs/phase-3.md` |
| 4 | Job sources, discovery, deduplication, search, recommendation process | `docs/phase-4.md` |
| 5 | Application tracker, analytics | `docs/phase-5.md` |

Do not build everything at once. Finish and verify each phase before starting the next.

## 11. Landing page

- Headline: **"Find the jobs that actually fit you."**
- Subheadline: "Upload your CV, discover relevant jobs, understand your gaps, and tailor your application before you apply."
- Sections: 1. Upload your CV, 2. Discover relevant jobs, 3. Understand your match, 4. Improve your CV, 5. Track applications.
- CTA: **"Analyze my CV"**
- No unsupported claims.