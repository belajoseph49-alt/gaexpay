/**
 * src/lib/rate-limit.ts
 *
 * Distributed sliding-window rate limiter for GaexPay API routes.
 * Uses Redis in production, falls back to an in-memory Map if REDIS_URL is not set.
 */

import Redis from "ioredis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterMs: number;
}

// Global Redis client instance
const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

// Fallback in-memory map
const memoryBuckets = new Map<string, number[]>();

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (redis) {
    // Redis logic using ZSET for sliding window
    const key = `rl:${identifier}`;
    
    // We execute a quick pipeline:
    // 1. Remove older requests
    // 2. Count surviving requests
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, cutoff);
    pipeline.zcard(key);
    // Optionally fetch the oldest request to calculate retryAfterMs
    pipeline.zrange(key, 0, 0, "WITHSCORES");
    
    const results = await pipeline.exec();
    
    if (!results) {
      return { success: true, remaining: limit, retryAfterMs: 0 };
    }
    
    const count = results[1][1] as number;
    const oldestReq = results[2][1] as string[];
    
    const remaining = Math.max(0, limit - count);
    const success = count < limit;
    
    let retryAfterMs = 0;
    if (count > 0 && oldestReq && oldestReq.length >= 2) {
      const oldestScore = parseInt(oldestReq[1], 10);
      retryAfterMs = Math.max(0, oldestScore + windowMs - now);
    }
    
    return { success, remaining, retryAfterMs };
  } else {
    // In-memory fallback
    const existing = memoryBuckets.get(identifier) ?? [];
    const fresh = existing.filter((t) => t > cutoff);
    memoryBuckets.set(identifier, fresh); // Garbage collect
    
    const remaining = Math.max(0, limit - fresh.length);
    const success = fresh.length < limit;
    const retryAfterMs = fresh.length > 0 ? Math.max(0, fresh[0] + windowMs - now) : 0;
    return { success, remaining, retryAfterMs };
  }
}

export async function recordRateLimit(identifier: string, windowMs: number): Promise<void> {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (redis) {
    const key = `rl:${identifier}`;
    const pipeline = redis.pipeline();
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    // Expire the key after the window to save memory
    pipeline.pexpire(key, windowMs);
    await pipeline.exec();
  } else {
    const existing = memoryBuckets.get(identifier) ?? [];
    const fresh = existing.filter((t) => t > cutoff);
    fresh.push(now);
    memoryBuckets.set(identifier, fresh);
  }
}

export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
): Promise<{ success: boolean; remaining: number; retryAfterMs: number }> {
  const result = await checkRateLimit(identifier, limit, windowMs);
  if (result.success) {
    await recordRateLimit(identifier, windowMs);
  }
  return result;
}

// ---------- Pre-baked policies ----------

export const GENERAL_LIMIT = { limit: 100, windowMs: 15 * 60 * 1000 };
export const SENSITIVE_LIMIT = { limit: 10, windowMs: 60 * 1000 };
export const AUTH_LIMIT = { limit: 5, windowMs: 60 * 1000 };

export async function rateLimitGeneral(identifier: string) {
  return rateLimit(identifier, GENERAL_LIMIT.limit, GENERAL_LIMIT.windowMs);
}

export async function rateLimitSensitive(identifier: string) {
  return rateLimit(identifier, SENSITIVE_LIMIT.limit, SENSITIVE_LIMIT.windowMs);
}

export async function rateLimitAuth(identifier: string) {
  return rateLimit(identifier, AUTH_LIMIT.limit, AUTH_LIMIT.windowMs);
}
