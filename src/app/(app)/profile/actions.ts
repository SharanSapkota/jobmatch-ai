"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { UserInputError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { parseListField, updateProfile } from "@/server/modules/profile/profile-service";

export interface ProfileFormState {
  status: "idle" | "saved" | "error";
  message?: string;
}

export async function updateProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const user = await requireUser();
  const text = (key: string) => String(formData.get(key) ?? "");
  const years = text("yearsExperience").trim();
  try {
    await updateProfile(prisma, user.id, {
      headline: text("headline"),
      summary: text("summary"),
      yearsExperience: years === "" ? null : Number(years),
      location: text("location"),
      desiredRoles: parseListField(formData.get("desiredRoles")),
      preferredLocations: parseListField(formData.get("preferredLocations")),
      workMode: text("workMode"),
      salaryExpectation: text("salaryExpectation"),
      workAuthorization: text("workAuthorization"),
      languages: parseListField(formData.get("languages")),
      industries: parseListField(formData.get("industries")),
    });
  } catch (error) {
    if (error instanceof UserInputError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { status: "saved", message: "Profile saved." };
}
