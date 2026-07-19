/**
 * mini-services/payment-service/src/lib/crypto.ts
 *
 * AES-256-GCM authenticated encryption for sensitive data at rest.
 * Reused from GaexPay core standard.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — GCM standard
const SALT_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits → AES-256

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
 * Returns `salt:iv:authTag:ciphertext` (all hex).
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
 * success, or null on failure.
 */
export function decrypt(ciphertext: string, password?: string): string | null {
  if (!ciphertext || typeof ciphertext !== "string") return null;
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
 * Encrypt a JSON-serialisable value.
 */
export function encryptJSON(value: unknown, password?: string): string {
  return encrypt(JSON.stringify(value), password);
}

/**
 * Decrypt a string produced by `encryptJSON()` and parse it back as JSON.
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
