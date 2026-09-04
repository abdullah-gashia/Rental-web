/**
 * A small fixed-window rate limiter kept in process memory.
 *
 * Honest about what it is: one Node process, one map. It survives nothing —
 * not a restart, not a second serverless instance — so it will not stop a
 * determined distributed attacker. What it does stop is the realistic case: one
 * script hammering one endpoint from one session, filling the disk or the mail
 * queue before anybody notices.
 *
 * If this ever needs to hold under real load, the same interface can be backed
 * by Redis or Upstash without touching the call sites.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drops expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count++;

  if (existing.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, remaining: limit - existing.count, retryAfter: 0 };
}
