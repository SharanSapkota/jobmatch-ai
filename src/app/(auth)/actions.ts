"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/server/db";
import { UserInputError } from "@/server/errors";
import { registerUser } from "@/server/auth/password";

export interface AuthFormState {
  error?: string;
  email?: string;
  name?: string;
}

function safeRedirect(value: FormDataEntryValue | null): string {
  // Only same-site relative paths, never protocol-relative URLs.
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  try {
    await signIn("credentials", {
      email,
      password: String(formData.get("password") ?? ""),
      redirectTo: safeRedirect(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "Incorrect email or password.", email };
    throw error; // Includes Next's redirect signal on success.
  }
  return {};
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  try {
    await registerUser(prisma, input);
  } catch (error) {
    if (error instanceof UserInputError) return { error: error.message, email: input.email, name: input.name };
    throw error;
  }
  await signIn("credentials", { email: input.email, password: input.password, redirectTo: "/cv" });
  return {};
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
