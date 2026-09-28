import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  // The JWT can outlive the account (e.g. after deletion), so confirm it exists.
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
}

/** For pages and server actions: redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** For route handlers: returns null so the caller can respond 401. */
export async function getApiUser(): Promise<SessionUser | null> {
  return currentUser();
}
