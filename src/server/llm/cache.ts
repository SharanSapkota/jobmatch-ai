import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import type { Db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export function contentHash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export interface CacheKey {
  userId: string;
  promptName: string;
  promptVersion: string;
  contentHash: string;
}

/** Returns the cached value only if it still validates against the current schema. */
export async function readCache<T>(db: Db, key: CacheKey, schema: ZodType<T>): Promise<T | null> {
  const row = await db.llmCache.findUnique({ where: { userId_promptName_promptVersion_contentHash: key } });
  if (!row) return null;
  const parsed = schema.safeParse(row.result);
  return parsed.success ? parsed.data : null;
}

export async function writeCache(db: Db, key: CacheKey, provider: string, result: unknown): Promise<void> {
  const json = result as Prisma.InputJsonValue;
  await db.llmCache.upsert({
    where: { userId_promptName_promptVersion_contentHash: key },
    create: { ...key, provider, result: json },
    update: { provider, result: json, createdAt: new Date() },
  });
}
