import type { ZodType } from "zod";
import type { Db } from "@/server/db";
import { consumeRateLimit } from "@/server/rate-limit";
import { contentHash, readCache, writeCache } from "./cache";
import { LLMError, type LLMProvider } from "./types";

export interface StructuredTask<T> {
  userId: string;
  prompt: { name: string; version: string };
  /** The minimal input the prompt is built from; its hash is the cache key. */
  input: string;
  buildPrompt: (input: string) => string;
  schema: ZodType<T>;
  /** Skip the cache read (explicit "regenerate" by the user). */
  force?: boolean;
}

export interface RunDeps {
  db: Db;
  provider: LLMProvider;
  rateLimit: { limit: number; windowMs: number };
}

export interface StructuredResult<T> {
  data: T;
  cached: boolean;
}

/** Cache first, then rate limit, then call the provider (validated + one retry). */
export async function runStructured<T>(task: StructuredTask<T>, deps: RunDeps): Promise<StructuredResult<T>> {
  const key = {
    userId: task.userId,
    promptName: task.prompt.name,
    promptVersion: task.prompt.version,
    contentHash: contentHash(task.input),
  };

  if (!task.force) {
    const hit = await readCache(deps.db, key, task.schema);
    if (hit !== null) return { data: hit, cached: true };
  }

  const limit = await consumeRateLimit(deps.db, {
    userId: task.userId,
    action: `llm:${task.prompt.name}`,
    ...deps.rateLimit,
  });
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil((limit.resetAt.getTime() - Date.now()) / 60000));
    throw new LLMError(`You have reached the limit for this action. Try again in about ${minutes} minute(s).`, "RATE_LIMITED");
  }

  const data = await deps.provider.generateStructured(task.buildPrompt(task.input), task.schema);
  await writeCache(deps.db, key, deps.provider.name, data);
  return { data, cached: false };
}
