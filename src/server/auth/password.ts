import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Db } from "@/server/db";
import { UserInputError } from "@/server/errors";

const BCRYPT_COST = 12;

export const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")).pipe(z.string().max(254)),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(200),
});

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function registerUser(db: Db, input: unknown) {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) throw new UserInputError(parsed.error.issues[0].message);
  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new UserInputError("An account with this email already exists.");
  const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  return { id: user.id, email: user.email, name: user.name };
}

// Compared against when the email is unknown, so response time does not reveal
// whether an account exists.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Fh5Z8Fq3Xq9YH9WwQGx5X1Yc1nTjDa";

export async function verifyCredentials(db: Db, input: unknown) {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return null;
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}
