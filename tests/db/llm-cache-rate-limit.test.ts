import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BaseProvider } from "@/server/llm/base-provider";
import { runStructured } from "@/server/llm/run-structured";
import { LLMError } from "@/server/llm/types";
import { consumeRateLimit, windowStart } from "@/server/rate-limit";
import { createTestUser, hasTestDb, prisma } from "../helpers/db";

class CountingProvider extends BaseProvider {
  readonly name = "counting";
  calls = 0;
  protected async generateRaw(prompt: string): Promise<unknown> {
    this.calls++;
    return { echo: prompt.length };
  }
}

const Schema = z.strictObject({ echo: z.number() });
const HOUR = 60 * 60 * 1000;

function task(userId: string, input: string, version = "test@1", force = false) {
  return { userId, prompt: { name: "test", version }, input, buildPrompt: (i: string) => `TASK: test\n${i}`, schema: Schema, force };
}

describe.skipIf(!hasTestDb)("rate limiter", () => {
  it("allows up to the limit within a window, then blocks", async () => {
    const user = await createTestUser("rl");
    const now = new Date("2026-01-01T10:15:00Z");
    const params = { userId: user.id, action: "llm:test", limit: 2, windowMs: HOUR, now };
    expect((await consumeRateLimit(prisma, params)).allowed).toBe(true);
    const second = await consumeRateLimit(prisma, params);
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    const third = await consumeRateLimit(prisma, params);
    expect(third.allowed).toBe(false);
    expect(third.resetAt.toISOString()).toBe("2026-01-01T11:00:00.000Z");
  });

  it("starts a fresh count in the next window and per action", async () => {
    const user = await createTestUser("rl2");
    const base = { userId: user.id, limit: 1, windowMs: HOUR };
    const t0 = new Date("2026-01-01T10:59:00Z");
    expect((await consumeRateLimit(prisma, { ...base, action: "a", now: t0 })).allowed).toBe(true);
    expect((await consumeRateLimit(prisma, { ...base, action: "a", now: t0 })).allowed).toBe(false);
    expect((await consumeRateLimit(prisma, { ...base, action: "b", now: t0 })).allowed).toBe(true);
    const t1 = new Date("2026-01-01T11:00:00Z");
    expect((await consumeRateLimit(prisma, { ...base, action: "a", now: t1 })).allowed).toBe(true);
  });

  it("counts concurrent requests atomically", async () => {
    const user = await createTestUser("rl3");
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit(prisma, { userId: user.id, action: "c", limit: 3, windowMs: HOUR, now })),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });

  it("aligns windows to fixed boundaries", () => {
    expect(windowStart(new Date("2026-01-01T10:59:59Z"), HOUR).toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });
});

describe.skipIf(!hasTestDb)("LLM cache via runStructured", () => {
  const deps = (provider: CountingProvider, limit = 100) => ({ db: prisma, provider, rateLimit: { limit, windowMs: HOUR } });

  it("calls the provider once, then serves the cached result", async () => {
    const user = await createTestUser("cache");
    const provider = new CountingProvider();
    const first = await runStructured(task(user.id, "same input"), deps(provider));
    const second = await runStructured(task(user.id, "same input"), deps(provider));
    expect(first.cached).toBe(false);
    expect(second).toEqual({ data: first.data, cached: true });
    expect(provider.calls).toBe(1);
  });

  it("misses on different content, prompt version, or user", async () => {
    const user = await createTestUser("cache2");
    const other = await createTestUser("cache3");
    const provider = new CountingProvider();
    await runStructured(task(user.id, "input"), deps(provider));
    await runStructured(task(user.id, "input changed"), deps(provider));
    await runStructured(task(user.id, "input", "test@2"), deps(provider));
    await runStructured(task(other.id, "input"), deps(provider));
    expect(provider.calls).toBe(4);
  });

  it("bypasses the cache on explicit regeneration", async () => {
    const user = await createTestUser("cache4");
    const provider = new CountingProvider();
    await runStructured(task(user.id, "x"), deps(provider));
    const again = await runStructured(task(user.id, "x", "test@1", true), deps(provider));
    expect(again.cached).toBe(false);
    expect(provider.calls).toBe(2);
  });

  it("does not count cache hits against the rate limit, and blocks when exceeded", async () => {
    const user = await createTestUser("cache5");
    const provider = new CountingProvider();
    await runStructured(task(user.id, "one"), deps(provider, 1));
    await runStructured(task(user.id, "one"), deps(provider, 1));
    const error = await runStructured(task(user.id, "two"), deps(provider, 1)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("RATE_LIMITED");
    expect(provider.calls).toBe(1);
  });
});
