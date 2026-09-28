import type { CandidateProfile } from "@/generated/prisma/client";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

/** Which profile fields matching will rely on are still missing. */
export function profileChecklist(p: CandidateProfile | null): ChecklistItem[] {
  return [
    { label: "Target roles", done: !!p && p.desiredRoles.length > 0 },
    { label: "Preferred locations or remote preference", done: !!p && (p.preferredLocations.length > 0 || p.workMode === "REMOTE") },
    { label: "Years of experience", done: p?.yearsExperience != null },
    { label: "Languages", done: !!p && p.languages.length > 0 },
    { label: "Work authorization", done: !!p?.workAuthorization },
  ];
}
