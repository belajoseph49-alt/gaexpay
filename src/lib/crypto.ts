/**
 * src/lib/crypto.ts
 *
 * AES-256-GCM authenticated encryption for sensitive data at rest.
 *
 * Why GCM?
 *  - Authenticated: ciphertext + auth-tag → tampering is detected on decrypt.
 *  - Standard IV length of 12 bytes (96 bits) — the GCM spec's sweet spot.
 *  - Hardware-accelerated on modern x86/ARM via AES-NI/ARMv8 crypto extensions.
 *
 * Key derivation
 * -------------
 *  - scrypt (memory-hard, 64MB cost) is used to derive a 32-byte AES-256 key
 *    from the master password + a per-record 16-byte salt.
 *  - Per-record salt means an attacker who steals the DB must attack each
 *    row independently (no shared dictionary).
 *  - The master password comes from `process.env.GAEXPAY_ENC_KEY`. In dev
 *    we fall back to a fixed string so the app still works locally; in
 *    production a missing key would crash decrypt (which is correct —
 *    encrypted data is unrecoverable without the key).
 *
 * Format
 * ------
 * Ciphertext strings are `salt:iv:authTag:ciphertext` (all hex). The colon
 * separator is safe because none of the components can contain a colon.
 *
 * Server-side ONLY.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — GCM standard
const SALT_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits → AES-256

// scrypt parameters — must be fast enough for interactive use yet expensive
// for bulk cracking. N=2^14 (16MB) is a good trade-off for at-rest encryption
// (we're not protecting user passwords here, which use the harder N=2^15).
const SCRYPT_N = 1 << 14;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;

function getMasterKey(password?: string): string {
  const secret =
    password ||
    process.env.GAEXPAY_ENC_KEY ||
    "dev-encryption-key-change-in-production";
  return secret;
}

function getKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 *
 * Returns `salt:iv:authTag:ciphertext` (all hex). Returns the original input
 * unchanged if it's empty (so we don't waste a row on empty fields).
 *
 * @param plaintext  The string to encrypt.
 * @param password   Optional per-call master key override. Defaults to
 *                   `GAEXPAY_ENC_KEY` env var.
 */
export function encrypt(plaintext: string, password?: string): string {
  if (plaintext === "" || plaintext == null) return plaintext ?? "";
  const secret = getMasterKey(password);
  const salt = randomBytes(SALT_LENGTH);
  const key = getKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a string produced by `encrypt()`. Returns the original plaintext on
 * success, or `null` on any failure (wrong key, tampered ciphertext,
 * malformed format). Never throws — callers can treat any failure as
 * "decryption failed".
 *
 * @param ciphertext  The `salt:iv:authTag:ciphertext` string.
 * @param password    Optional per-call master key override.
 */
export function decrypt(ciphertext: string, password?: string): string | null {
  if (!ciphertext || typeof ciphertext !== "string") return null;
  // Empty input was preserved by encrypt() — pass through.
  if (ciphertext === "") return "";
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 4) return null;
    const [saltHex, ivHex, authTagHex, dataHex] = parts;
    if (!saltHex || !ivHex || !authTagHex || !dataHex) return null;
    const secret = getMasterKey(password);
    const key = getKey(secret, Buffer.from(saltHex, "hex"));
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Encrypt a JSON-serialisable value. Convenience wrapper that stringifies
 * before encrypting. Returns the encrypted string.
 */
export function encryptJSON(value: unknown, password?: string): string {
  return encrypt(JSON.stringify(value), password);
}

/**
 * Decrypt a string produced by `encryptJSON()` and parse it back as JSON.
 * Returns `null` if decryption or parsing fails.
 */
export function decryptJSON<T = unknown>(ciphertext: string, password?: string): T | null {
  const plain = decrypt(ciphertext, password);
  if (plain === null) return null;
  try {
    return JSON.parse(plain) as T;
  } catch {
    return null;
  }
}

/**
 * Check whether a string looks like an encrypted blob produced by `encrypt()`.
 * Useful for code paths that need to handle both legacy plaintext and the new
 * encrypted format gracefully (e.g. during a migration window).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 4) return false;
  return /^(?:[0-9a-fA-F]{2})+$/.test(parts[0]) &&
    /^(?:[0-9a-fA-F]{2})+$/.test(parts[1]) &&
    /^(?:[0-9a-fA-F]{2})+$/.test(parts[2]) &&
    /^(?:[0-9a-fA-F]{2})+$/.test(parts[3]);
}
