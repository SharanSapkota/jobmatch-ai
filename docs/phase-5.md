# Phase 5: Application Tracker and Analytics

## Deliverables
1. **State machine** (pure module): allowed transitions
   SAVED -> INTERESTED, APPLIED, WITHDRAWN
   INTERESTED -> APPLIED, WITHDRAWN
   APPLIED -> SCREENING, REJECTED, WITHDRAWN
   SCREENING -> INTERVIEW, REJECTED, WITHDRAWN
   INTERVIEW -> OFFER, REJECTED, WITHDRAWN
   OFFER -> WITHDRAWN (declined)
   REJECTED, WITHDRAWN are terminal. Invalid transitions are rejected server-side. Record transition timestamps (history table).
2. **Tracker UI:** Kanban board or list by status, drag or button to move, notes, and fields: appliedAt, interviewDates, rejectionReason, referral, recruiter, salary, outcome. "Apply" from a job page only opens the original URL and offers "Mark as applied".
3. **Data controls:** delete application history.
4. **Dashboard:** applications summary and interview pipeline.
5. **Analytics page:** descriptive stats: applications by role, location, source, experience level, technology; response rate; interview rate; time from application to first response.
   - Show sample size (n) beside every number.
   - Below n < 10 in a group: show counts only, no percentages, with a "too few applications to draw conclusions" note.
   - Never imply causation or predictions. Correlate with internal compatibility score only as descriptive ("applications with score band X: n=..., interviews=...").
6. **Empty states** when no data, explaining what will appear and when.

## Tests
- Every valid and invalid state transition
- Authorization on applications and analytics (no cross-user leakage)
- Analytics calculations, small-sample suppression, time-to-response, grouping by technology
- Deleting history removes analytics data

## Done when
Move a job through the full pipeline, record outcome fields, view analytics with correct n and small-sample warnings. All checks pass. Update PROGRESS.md and write a final summary with known limitations.
