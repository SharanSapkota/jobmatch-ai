import type { ParsedCv } from "./cv-schema";

export interface GroundingWarning {
  path: string;
  value: string;
  message: string;
}

function normalise(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}+#]+/gu, " ").trim();
}

/**
 * Deterministic check that extracted facts actually occur in the CV text.
 * Employers, institutions, job titles and skills that cannot be found are
 * flagged so the user can verify them; nothing is silently trusted.
 */
export function checkGrounding(parsed: ParsedCv, sourceText: string): GroundingWarning[] {
  const haystack = ` ${normalise(sourceText)} `;
  const found = (value: string) => {
    const needle = normalise(value);
    return needle.length === 0 || haystack.includes(` ${needle} `) || haystack.includes(needle);
  };
  const warnings: GroundingWarning[] = [];
  const check = (path: string, value: string | null, what: string) => {
    if (value && !found(value)) {
      warnings.push({ path, value, message: `${what} "${value}" was not found in your original CV text. Please verify it.` });
    }
  };

  parsed.experience.forEach((e, i) => {
    check(`experience.${i}.company`, e.company, "Employer");
    check(`experience.${i}.title`, e.title, "Job title");
    e.technologies.forEach((t, j) => check(`experience.${i}.technologies.${j}`, t, "Technology"));
  });
  parsed.education.forEach((e, i) => {
    check(`education.${i}.institution`, e.institution, "Institution");
    check(`education.${i}.degree`, e.degree, "Degree");
  });
  parsed.skills.forEach((s, i) => check(`skills.${i}.name`, s.name, "Skill"));
  return warnings;
}
