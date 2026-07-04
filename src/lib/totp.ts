/**
 * src/lib/totp.ts
 *
 * TOTP (Time-based One-Time Password) — RFC 6238 — implementation using only
 * Node.js built-in `crypto`. Compatible with Google Authenticator, Microsoft
 * Authenticator, Authy, 1Password, etc.
 *
 * Design
 * -----
 *  - 20-byte secret (160 bits, base32-encoded to 32 chars) — RFC 4226 §4, R6.
 *  - 30-second period, 6 digits, SHA-1 HMAC (the de-facto default that every
 *    authenticator app uses by default).
 *  - Verification accepts ±1 time step (±30s) to absorb clock drift between
 *    the user's phone and the server, with constant-time comparison.
 *  - Recovery codes are 12-hex-char codes formatted as XXXX-XXXX-XXXX. They
 *    are returned to the user ONCE at enrollment; the server stores only
 *    SHA-256 hashes so a DB leak cannot recover usable codes.
 *
 * Server-side ONLY — `import` this from API routes / server components, never
 * from a client component.
 */

import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new TOTP secret (20 random bytes → 32-char base32 string). */
export function generateTOTPSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Generate the `otpauth://` URL that QR-code scanners (Google Authenticator,
 * etc.) understand. Format specified in
 * https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
export function generateTOTPURI(
  email: string,
  secret: string,
  issuer = "GaexPay",
): string {
  return (
    `otpauth://totp/${encodeURIComponent(issuer + ":" + email)}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1` +
    `&digits=6` +
    `&period=30`
  );
}

/**
 * Verify a 6-digit TOTP token against a stored secret. Constant-time
 * comparison via `timingSafeEqual`. Accepts tokens from the previous, current,
 * and next 30-second windows (window=1) by default to absorb clock skew.
 *
 * Returns true if the token matches any of the windows; false otherwise.
 */
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }
  if (key.length === 0) return false;
  const now = Math.floor(Date.now() / 1000);
  const tokenBuf = Buffer.from(token);
  for (let offset = -window; offset <= window; offset++) {
    const counter = Math.floor(now / 30) + offset;
    const buf = Buffer.alloc(8);
    // Counter is a 64-bit big-endian integer.
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac("sha1", key).update(buf).digest();
    const offsetByte = hmac[hmac.length - 1] & 0xf;
    const code =
      (((hmac[offsetByte] & 0x7f) << 24) |
        ((hmac[offsetByte + 1] & 0xff) << 16) |
        ((hmac[offsetByte + 2] & 0xff) << 8) |
        (hmac[offsetByte + 3] & 0xff)) %
      1000000;
    const expected = code.toString().padStart(6, "0");
    const expectedBuf = Buffer.from(expected);
    // Both buffers are 6 bytes of ASCII digits — safe to compare in constant time.
    if (tokenBuf.length === expectedBuf.length) {
      if (timingSafeEqual(tokenBuf, expectedBuf)) return true;
    }
  }
  return false;
}

/**
 * Generate 10 single-use recovery codes, formatted as `XXXX-XXXX-XXXX`
 * (12 hex chars each). The caller MUST:
 *   1. Display them to the user exactly once.
 *   2. Store `hashRecoveryCode(code)` for each one in the DB.
 *   3. Cross a code off the list when it's used (replace its hash with null).
 */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => {
    const bytes = randomBytes(6);
    const hex = bytes.toString("hex").toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  });
}

/**
 * Hash a recovery code for storage. Uses SHA-256 (single-round — recovery
 * codes are 12 hex chars of entropy which is already strong enough that an
 * additional KDF round is unnecessary; the per-code salt would also bloat the
 * storage row). The hash is sufficient to prevent recovery from a DB dump.
 *
 * The caller should normalise the code (uppercase, no spaces) before hashing.
 */
export function hashRecoveryCode(code: string): string {
  const normalised = code.trim().toUpperCase().replace(/\s+/g, "");
  return createHash("sha256").update(normalised).digest("hex");
}

/**
 * Verify a recovery code against a list of stored hashes. Constant-time per
 * comparison. Returns the index of the matched hash (so the caller can null
 * it out) or -1 if no match.
 */
export function findRecoveryCodeIndex(
  code: string,
  hashes: (string | null)[],
): number {
  const candidate = hashRecoveryCode(code);
  const candidateBuf = Buffer.from(candidate);
  for (let i = 0; i < hashes.length; i++) {
    const h = hashes[i];
    if (!h) continue;
    const storedBuf = Buffer.from(h);
    if (storedBuf.length === candidateBuf.length) {
      try {
        if (timingSafeEqual(storedBuf, candidateBuf)) return i;
      } catch {
        // length mismatch — shouldn't happen but be defensive
      }
    }
  }
  return -1;
}
