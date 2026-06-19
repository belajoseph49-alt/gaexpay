/**
 * src/lib/rate-limit.ts
 *
 * In-memory sliding-window rate limiter for GaexPay API routes.
 *
 * Implementation notes
 * --------------------
 *  - One `Map<string, number[]>` per process — sufficient for our single-node
 *    deployment. (For multi-node deployments, swap this for Redis.)
 *  - Each entry stores the timestamps of requests within the current window.
 *    On every call we drop timestamps older than `windowMs` ago, then check
 *    the surviving count.
 *  - The Map grows unboundedly in pathological cases (one request per IP),
 *    so we run a periodic sweeper that evicts empty entries. For typical
 *    fintech traffic (dozens of unique users per minute) this is fine.
 *
 * Defaults
 * --------
 *  - General API: 100 requests per 15 minutes per identifier.
 *  - Money-moving endpoints (transfer, trade, cashout, swap): 10 per minute.
 *  - Auth-sensitive endpoints (login, password reset): 5 per minute.
 */

interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix-ms timestamp when the oldest request in the window expires — useful
   * for setting `Retry-After` headers. */
  retryAfterMs: number;
}

// Map key → sorted ascending list of request timestamps within window.
const buckets = new Map<string, number[]>();

// Periodic GC — every 5 minutes, drop any bucket whose window is entirely in
// the past. We lazy-start the interval on the first `rateLimit` call to keep
// testability simple and avoid running timers in modules that never rate-limit.
let gcStarted = false;
const GC_INTERVAL_MS = 5 * 60 * 1000;

function startGc(): void {
  if (gcStarted) return;
  gcStarted = true;
  // Use setInterval rather than a Next.js cron because rate-limit state lives
  // only in this process's memory.
  const handle = setInterval(() => {
    const now = Date.now();
    // Default window for GC purposes is 15 minutes — any bucket with all
    // timestamps older than that is dead.
    const maxAge = 15 * 60 * 1000;
    for (const [key, timestamps] of buckets) {
      const cutoff = now - maxAge;
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        buckets.delete(key);
      } else {
        buckets.set(key, fresh);
      }
    }
  }, GC_INTERVAL_MS);
  // Don't keep the event loop alive just for GC.
  if (typeof handle.unref === "function") handle.unref();
}

/**
 * Check the rate limit for `identifier`.
 *
 * @param identifier  Stable key — IP, `user:<id>`, etc.
 * @param limit       Max requests allowed in the window.
 * @param windowMs    Window size in milliseconds.
 * @returns `{ success, remaining, retryAfterMs }`. NOTE: this function does
 *          NOT mutate the bucket — call it to *check*, then `recordRateLimit`
 *          to actually count the request. In practice you want `rateLimit`
 *          below which both checks and records.
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  startGc();
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = buckets.get(identifier) ?? [];
  const fresh = existing.filter((t) => t > cutoff);
  const remaining = Math.max(0, limit - fresh.length);
  const success = fresh.length < limit;
  const retryAfterMs = fresh.length > 0 ? Math.max(0, fresh[0] + windowMs - now) : 0;
  return { success, remaining, retryAfterMs };
}

/**
 * Record a request against the rate-limit bucket. Called after a request
 * passes the check so that future requests see it.
 */
export function recordRateLimit(identifier: string, windowMs: number): void {
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = buckets.get(identifier) ?? [];
  const fresh = existing.filter((t) => t > cutoff);
  fresh.push(now);
  buckets.set(identifier, fresh);
}

/**
 * Convenience: check + record in one call. Returns whether the request is
 * allowed. If it isn't, the bucket is NOT mutated (we don't punish rejected
 * requests beyond the natural window expiry).
 *
 * @param identifier  Stable key — IP, `user:<id>`, etc.
 * @param limit       Max requests allowed in the window.
 * @param windowMs    Window size in milliseconds.
 */
export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number; retryAfterMs: number } {
  const result = checkRateLimit(identifier, limit, windowMs);
  if (result.success) {
    recordRateLimit(identifier, windowMs);
  }
  return result;
}

// ---------- Pre-baked policies ----------

/** General API policy: 100 requests / 15 min / identifier. */
export const GENERAL_LIMIT = { limit: 100, windowMs: 15 * 60 * 1000 };

/** Money-moving endpoints: 10 requests / 1 min / identifier. */
export const SENSITIVE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

/** Auth-sensitive endpoints (login, reset, OTP resend): 5 / 1 min. */
export const AUTH_LIMIT = { limit: 5, windowMs: 60 * 1000 };

/** Convenience wrapper applying the general policy. */
export function rateLimitGeneral(identifier: string) {
  return rateLimit(identifier, GENERAL_LIMIT.limit, GENERAL_LIMIT.windowMs);
}

/** Convenience wrapper applying the sensitive (money-moving) policy. */
export function rateLimitSensitive(identifier: string) {
  return rateLimit(identifier, SENSITIVE_LIMIT.limit, SENSITIVE_LIMIT.windowMs);
}

/** Convenience wrapper applying the auth-sensitive policy. */
export function rateLimitAuth(identifier: string) {
  return rateLimit(identifier, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs);
}
