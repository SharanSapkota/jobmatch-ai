import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

export { prisma };

export async function createTestUser(label = "user") {
  return prisma.user.create({
    data: { email: `${label}-${randomUUID()}@test.local`, name: label, passwordHash: "x" },
  });
}
