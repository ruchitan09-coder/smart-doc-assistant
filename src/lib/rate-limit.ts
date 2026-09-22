import { prisma } from "@/lib/prisma";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Seconds until the current window resets. Only meaningful when !allowed. */
  retryAfterSeconds: number;
}

/**
 * Atomic fixed-window rate limiter backed by Postgres.
 *
 * Deliberately NOT an in-memory counter: this app deploys to serverless
 * (Vercel), where each invocation can land on a different instance and
 * in-memory state doesn't persist between cold starts. A single upsert
 * with a CASE expression keeps the check-and-increment atomic under
 * concurrent requests, without adding Redis or any other new
 * infrastructure to the project.
 *
 * @param key unique bucket key, e.g. `chat:${userId}`
 * @param limit max requests allowed per window
 * @param windowSeconds window length in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimitBucket" (key, "windowStart", count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN "RateLimitBucket"."windowStart" < now() - (${windowSeconds}::text || ' seconds')::interval
          THEN 1
        ELSE "RateLimitBucket".count + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" < now() - (${windowSeconds}::text || ' seconds')::interval
          THEN now()
        ELSE "RateLimitBucket"."windowStart"
      END
    RETURNING count, "windowStart"
  `;

  const row = rows[0];
  const elapsedSeconds = (Date.now() - row.windowStart.getTime()) / 1000;
  const retryAfterSeconds = Math.max(0, Math.ceil(windowSeconds - elapsedSeconds));

  return {
    allowed: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    limit,
    retryAfterSeconds,
  };
}

/** Throws a Response-friendly error object routes can turn into a 429. */
export class RateLimitExceededError extends Error {
  constructor(public result: RateLimitResult) {
    super("Rate limit exceeded");
  }
}

/** Convenience wrapper: checks the limit and throws if it's exceeded. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const result = await checkRateLimit(key, limit, windowSeconds);
  if (!result.allowed) throw new RateLimitExceededError(result);
  return result;
}
