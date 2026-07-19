/**
 * src/lib/csrf.ts
 *
 * Stateless, signed CSRF token (a.k.a. "double-submit cookie" variant).
 *
 * Design
 * -----
 *  - Token format: `payload.signature` where:
 *      payload    = 32 hex chars (16 random bytes)
 *      signature  = HMAC-SHA256(payload, server-secret) hex digest
 *  - The server keeps NO state — verification is just "re-compute the HMAC and
 *    constant-time compare". This means tokens are valid for the lifetime of
 *    the HMAC secret (no expiry), which is fine because we pair them with
 *    SameSite=Strict cookies (the actual session-bound protection).
 *  - The classic CSRF attack vector is "an attacker site tricks the user's
 *    browser into making a cross-site POST with the user's cookies". Our
 *    defense: every mutation request MUST include a valid `X-CSRF-Token`
 *    header that an attacker site cannot read (because it would have to read
 *    a same-origin resource first, which the SameSite cookie + CORS blocks).
 *
 *  - Exempt paths:
 *      /api/auth/*  — login/signup happen before the user has a session, so
 *                     they can't fetch a CSRF token. Their own anti-abuse is
 *                     rate-limit + email/password verification.
 *
 * Server-side ONLY.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function getCSRFSecret(): string {
  // We deliberately reuse the JWT secret — there's no security benefit to a
  // separate secret (both protect server-issued tokens), and reusing reduces
  // operational config burden. The HMAC tag space is disjoint from the JWT
  // space because CSRF tokens use a different format.
  return (
    process.env.GAEXPAY_JWT_SECRET ||
    process.env.GAEXPAY_CSRF_SECRET ||
    "dev-secret-change-in-production"
  );
}

/**
 * Generate a fresh CSRF token. The same token can be reused for an entire
 * session — it does not need to be rotated per request — but rotating it is
 * harmless and slightly improves hygiene.
 */
export function generateCSRFToken(): string {
  const payload = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", getCSRFSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verify a CSRF token's signature. Constant-time comparison via
 * `timingSafeEqual`. Never throws.
 *
 * Returns true iff the signature matches what the server would have produced
 * for the given payload.
 */
export function verifyCSRFToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0 || dotIdx >= token.length - 1) return false;
  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  // Reject obviously malformed inputs before calling the HMAC.
  if (!/^[0-9a-fA-F]+$/.test(payload) || !/^[0-9a-fA-F]+$/.test(sig)) {
    return false;
  }
  const expectedSig = createHmac("sha256", getCSRFSecret())
    .update(payload)
    .digest("hex");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  try {
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Should the given request path be exempt from CSRF protection?
 *
 * We exempt:
 *  - All auth endpoints under /api/auth/* (login/signup/forgot/reset happen
 *    without a session and therefore can't fetch a CSRF token first).
 *  - The CSRF token-issuing endpoint itself (else it couldn't bootstrap).
 *
 * Everything else (including mutation routes like /api/transfer, /api/cards,
 * /api/kyc/submit, etc.) MUST present a valid token on POST/PUT/PATCH/DELETE.
 */
export function isCSRFExemptPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/csrf" || pathname.startsWith("/api/csrf/")) return true;
  return false;
}

/**
 * Is this HTTP method "mutation" → CSRF check required?
 * GET/HEAD/OPTIONS are safe-idempotent and don't need CSRF (they're
 * read-only). Everything else mutates server state and must present a token.
 */
export function isMutationMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}
