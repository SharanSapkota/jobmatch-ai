import { z } from "zod";
import type { Db } from "@/server/db";
import { UserInputError } from "@/server/errors";

const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable();

const stringList = z
  .array(z.string().trim().min(1).max(100))
  .max(30)
  .transform((items) => Array.from(new Set(items)));

export const ProfileInputSchema = z.strictObject({
  headline: shortText(200),
  summary: shortText(4000),
  yearsExperience: z.number().int().min(0).max(70).nullable(),
  location: shortText(200),
  desiredRoles: stringList,
  preferredLocations: stringList,
  workMode: z.enum(["REMOTE", "HYBRID", "ONSITE", "ANY"]),
  salaryExpectation: shortText(200),
  workAuthorization: shortText(500),
  languages: stringList,
  industries: stringList,
});

export type ProfileInput = z.input<typeof ProfileInputSchema>;

export async function getProfile(db: Db, userId: string) {
  return db.candidateProfile.findUnique({ where: { userId } });
}

export async function updateProfile(db: Db, userId: string, input: unknown) {
  const parsed = ProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new UserInputError(`${first.path.join(".") || "Profile"}: ${first.message}`);
  }
  return db.candidateProfile.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });
}

/** Splits a comma- or newline-separated form field into a list. */
export function parseListField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
