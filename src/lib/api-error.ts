/**
 * src/lib/api-error.ts
 *
 * Sanitized API error helpers.
 *
 * The single most important rule: NEVER send `String(e)`, `e.message`, or a
 * stack trace to the client. An unhandled Prisma error can leak the database
 * schema; a `TypeError` can leak file paths. So all client-visible errors go
 * through `apiError`, and all `catch` blocks go through `apiCatch`.
 *
 * Server-side, we log the full error with `console.error` so it ends up in
 * `dev.log` for debugging.
 */

import { NextResponse } from "next/server";

/**
 * Build a clean JSON error response. The message is sent verbatim — callers
 * are responsible for ensuring it does not contain internal details.
 *
 *   return apiError("Insufficient balance", 400);
 */
export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Build a clean 429 Too Many Requests response with a `Retry-After` header
 * rounded up to the next second (HTTP spec requires seconds).
 */
export function apiRateLimited(retryAfterMs: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

/**
 * Top-level catch handler. Logs the full error server-side, then returns a
 * generic 500 to the client. Use this in every route's outermost try/catch:
 *
 *   } catch (e) {
 *     return apiCatch(e);
 *   }
 */
export function apiCatch(e: unknown): NextResponse {
  // Server-side log with full context. We do NOT surface this to the client.
  console.error("[apiCatch] unhandled error:", e);

  // Zod validation errors — surface the (safe) issue list. The message field
  // of a ZodError is "validation failed" with no internal info, but we still
  // route it through a safe extraction just in case.
  if (e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown[] }).issues)) {
    try {
      const issues = (e as { issues: { path: unknown[]; message: string }[] }).issues;
      const first = issues[0];
      if (first) {
        const path = first.path.length > 0 ? first.path.join(".") : "value";
        return apiError(`Invalid ${path}`, 400);
      }
    } catch {
      // fall through to generic 500
    }
  }

  // Known HTTP-shaped errors (anything with { status, message }). We trust
  // these because they were thrown explicitly by our own code — but still
  // validate the shape before echoing the message.
  if (
    e &&
    typeof e === "object" &&
    "status" in e &&
    typeof (e as { status: unknown }).status === "number" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    const { status, message } = e as { status: number; message: string };
    // Only allow 4xx statuses — anything 5xx gets the generic message so we
    // don't leak server state via an accidentally-thrown 500-with-message.
    if (status >= 400 && status < 500 && message.length > 0 && message.length < 500) {
      return apiError(message, status);
    }
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 },
  );
}
