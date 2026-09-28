import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { registerUser, verifyCredentials } from "@/server/auth/password";
import { UserInputError } from "@/server/errors";
import { isProtectedPath } from "@/server/auth/auth.config";
import { hasTestDb, prisma } from "../helpers/db";

describe.skipIf(!hasTestDb)("registration and credentials", () => {
  it("registers with a bcrypt hash and verifies the password", async () => {
    const email = `New-${randomUUID()}@Test.local`;
    const user = await registerUser(prisma, { name: "New", email, password: "correct horse" });
    expect(user.email).toBe(email.toLowerCase());
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyCredentials(prisma, { email, password: "correct horse" })).toMatchObject({ id: user.id });
    expect(await verifyCredentials(prisma, { email, password: "wrong password" })).toBeNull();
  });

  it("rejects duplicate emails, weak passwords and invalid input", async () => {
    const email = `dup-${randomUUID()}@test.local`;
    await registerUser(prisma, { name: "A", email, password: "password-1" });
    await expect(registerUser(prisma, { name: "B", email, password: "password-2" })).rejects.toBeInstanceOf(UserInputError);
    await expect(registerUser(prisma, { name: "C", email: `x-${randomUUID()}@test.local`, password: "short" })).rejects.toThrow(/8 characters/);
    await expect(registerUser(prisma, { name: "D", email: "not-an-email", password: "password-3" })).rejects.toBeInstanceOf(UserInputError);
  });

  it("returns null for unknown users and malformed input", async () => {
    expect(await verifyCredentials(prisma, { email: `nobody-${randomUUID()}@test.local`, password: "whatever1" })).toBeNull();
    expect(await verifyCredentials(prisma, { email: 5 })).toBeNull();
  });
});

describe("route protection", () => {
  it("protects app pages but not public ones", () => {
    for (const p of ["/dashboard", "/cv", "/cv/x", "/profile", "/settings", "/jobs", "/applications"]) expect(isProtectedPath(p)).toBe(true);
    for (const p of ["/", "/login", "/register", "/cvx", "/api/auth/csrf"]) expect(isProtectedPath(p)).toBe(false);
  });
});
