/**
 * src/lib/auth.ts
 *
 * Password hashing + JWT-like signed token utilities for GaexPay.
 *
 * Design decisions
 * ----------------
 *  - Uses Node.js built-in `crypto` only — no bcrypt/argon2 dependency. The
 *    `crypto.scrypt` function is the same KDF that powers modern Linux PAM
 *    modules and is well-suited to interactive password hashing.
 *  - Passwords are stored as `saltHex:hashHex` (both 32-byte values). The salt
 *    is per-password, so an attacker who steals the DB cannot use a single
 *    rainbow table across rows.
 *  - Tokens are HMAC-SHA256 signed JWT-shaped strings (header.payload.sig),
 *    base64url-encoded. We do NOT use `jsonwebtoken` to avoid an extra dep —
 *    the shape we emit is JWT-compatible (alg=HS256, typ=JWT) so any standard
 *    JWT parser can decode/verify them with the same secret.
 *  - The HMAC secret comes from `process.env.GAEXPAY_JWT_SECRET`. We fall back
 *    to a hard-coded dev secret ONLY when `NODE_ENV !== "production"` so a
 *    misconfigured production deploy refuses to issue tokens rather than
 *    silently signing with a known value.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { DEMO_USER_ID } from "@/lib/gaexpay";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number },
) => Promise<Buffer>;

// scrypt parameters — N=2^15 (32MB memory), r=8, p=1. Roughly ~150ms per hash
// on commodity hardware, which is fast enough for login yet expensive enough
// to make bulk GPU cracking uneconomical.
const SCRYPT_KEYLEN = 32;
const SCRYPT_N = 1 << 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
// V8's default `maxmem` is 32MB which is exactly `128 * N * r` for our params
// — too tight (some OpenSSL builds reject it). Bump to 64MB to be safe across
// Node.js / Bun / bun-runtime.
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

// Token TTL — 7 days. Sessions are stateless; rotation is the client's
// responsibility (re-issue on app open).
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  const env = process.env.GAEXPAY_JWT_SECRET;
  if (env && env.length >= 16) return env;
  if (process.env.NODE_ENV === "production") {
    // In production we MUST NOT silently fall back. Throw so the deploy is
    // loudly broken rather than signing tokens with a public value.
    throw new Error(
      "GAEXPAY_JWT_SECRET is missing or too short in production. Set it to a 32+ char random string.",
    );
  }
  return "dev-secret-change-in-production";
}

/** Convert a Buffer to a base64url string (no padding, URL-safe chars). */
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

/** Convert a base64url string back to a Buffer. */
function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Hash a plaintext password using scrypt.
 * Returns `saltHex:hashHex` (both 64-char hex strings).
 */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string");
  }
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored `saltHex:hashHex` value.
 * Constant-time comparison via `timingSafeEqual` to avoid timing side-channels.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (typeof plain !== "string" || typeof stored !== "string") return false;
  const sep = stored.indexOf(":");
  if (sep <= 0 || sep >= stored.length - 1) return false;
  const saltHex = stored.slice(0, sep);
  const hashHex = stored.slice(sep + 1);
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const derived = await scrypt(plain, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  // Both buffers are SCRYPT_KEYLEN bytes; timingSafeEqual requires equal lengths.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

interface TokenPayload {
  sub: string; // user id
  iat: number; // issued at (unix seconds)
  exp: number; // expiry (unix seconds)
}

/**
 * Issue a JWT-shaped, HMAC-SHA256-signed token for the given user id.
 * Format: `base64url(header).base64url(payload).base64url(signature)`.
 */
export function generateToken(userId: string): string {
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("generateToken: userId must be a non-empty string");
  }
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: userId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${b64url(sig)}`;
}

/**
 * Verify a token's signature and expiry. Returns `{ userId }` on success or
 * `null` if the signature is invalid, the token is malformed, or it has
 * expired. Never throws — callers can treat any failure as "unauthenticated".
 */
export function verifyToken(token: string): { userId: string } | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }
  // Recompute the signature with the SAME secret and compare in constant time.
  const expectedSig = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest();
  let providedSig: Buffer;
  try {
    providedSig = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;
  // Signature OK — decode the payload and check expiry.
  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return { userId: payload.sub };
}

/**
 * Demo user id — exported here so other modules can import auth-related
 * utilities from a single place. In production this is NEVER used as a real
 * principal; it only acts as a development fallback for local demo logins.
 */
export { DEMO_USER_ID };
