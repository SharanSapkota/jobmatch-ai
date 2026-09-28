"use server";

import { signOut } from "@/auth";
import { prisma } from "@/server/db";
import { getStorage } from "@/server/container";
import { requireUser } from "@/server/auth/session";
import { clearLlmData, deleteAccount } from "@/server/modules/account/account-service";

export interface SettingsState {
  status: "idle" | "done" | "error";
  message?: string;
}

export async function clearLlmDataAction(): Promise<SettingsState> {
  const user = await requireUser();
  const r = await clearLlmData(prisma, user.id);
  const total = r.cacheEntries + r.matches + r.recommendations + r.tailoredResumes;
  return { status: "done", message: total === 0 ? "There was no AI-generated data to clear." : `Cleared ${total} AI-generated item(s).` };
}

export async function deleteAccountAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const confirmation = String(formData.get("confirmEmail") ?? "").trim().toLowerCase();
  if (confirmation !== user.email.toLowerCase()) {
    return { status: "error", message: "Type your email address exactly to confirm." };
  }
  await deleteAccount(prisma, getStorage(), user.id);
  await signOut({ redirectTo: "/?deleted=1" });
  return { status: "done" };
}
