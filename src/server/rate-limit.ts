import type { Db } from "@/server/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/**
 * Fixed-window counter stored in Postgres. The increment is a single atomic
 * upsert, so concurrent requests cannot both slip under the limit.
 */
export async function consumeRateLimit(
  db: Db,
  params: { userId: string; action: string; limit: number; windowMs: number; now?: Date },
): Promise<RateLimitResult> {
  const now = params.now ?? new Date();
  const start = windowStart(now, params.windowMs);
  const row = await db.rateLimitCounter.upsert({
    where: { userId_action_windowStart: { userId: params.userId, action: params.action, windowStart: start } },
    create: { userId: params.userId, action: params.action, windowStart: start, count: 1 },
    update: { count: { increment: 1 } },
  });
  return {
    allowed: row.count <= params.limit,
    remaining: Math.max(0, params.limit - row.count),
    resetAt: new Date(start.getTime() + params.windowMs),
  };
}
