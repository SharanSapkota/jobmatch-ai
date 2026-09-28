# Phase 3: CV Recommendations, Tailored CV, Diff UI

## Deliverables
1. **Fabrication checker** (pure, heavily tested), `src/server/modules/truthfulness`: given source CV (parsed) and generated output, verify
   - every skill/technology traces to the source (with alias normalization)
   - employers, titles, education institutions, and dates match exactly
   - every number/metric appears in the source
   - no new certifications
   Returns violations with location and reason.
2. **Recommendation engine:** `cv-recommendation` prompt and Zod schema. Produces: strong evidence, missing evidence, undersold experience (current -> suggested + why + priority), ordering recommendations, keyword recommendations (only terms genuinely matching existing experience). Every suggestion runs through the fabrication checker; violating items are dropped or flagged, never shown as valid.
3. **Missing evidence handling:** state plainly what the CV does not show. Never suggest adding it as if the candidate has it. May suggest "if you have this experience, add it" clearly labeled as conditional.
4. **Tailored CV generation:** `tailored-cv` prompt, output structured CV JSON in the same shape as parsed data. Allowed: rewording, reordering, emphasis, summary adjustment, skill selection. Fabrication checker must pass or the result is rejected with a user-visible message and one retry with the violation list.
5. **Diff UI:** side by side Original vs Tailored per section (summary, each experience, skills, ordering), highlighted changes, per-change accept/reject, flagged items visibly marked. Final "Save tailored version" stores TailoredResume.
6. **Export:** download tailored CV as DOCX (and/or PDF). Text must match what the user accepted.
7. **Analysis page:** add the CV improvements section (Current / Suggested / Why / Priority).

## Tests
- Fabrication checker: catches invented tech, changed dates, invented metrics, new employer, new certification; allows rewording and reordering
- Recommendation and tailoring with mock provider, including adversarial mock output that fabricates (must be rejected)
- Authorization on TailoredResume and CVRecommendation
- Regeneration only on explicit action (cache hit otherwise)

## Done when
From a job analysis page: view recommendations, generate a tailored CV, review the diff, accept or reject changes, export. Fabricated mock output is blocked. All checks pass. Update PROGRESS.md.
