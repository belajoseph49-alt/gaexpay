/**
 * src/lib/api-client.ts
 *
 * Server-side helpers for centralized API config management.
 *
 * Used by:
 *  - The admin API-management UI (api-configs routes)
 *  - Other server modules that need to call an external service via the
 *    configured credentials (e.g. /api/crypto, /api/exchange-rates).
 *
 * All functions are safe to call server-side only.
 */

import { db } from "@/lib/db";

/**
 * Get the active API config for a service category.
 * Prefers enabled + default, then any enabled config, ordered by createdAt.
 */
export async function getApiConfig(service: string) {
  return db.apiConfig.findFirst({
    where: { service, enabled: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Get all enabled API configs for a service category.
 */
export async function getApiConfigs(service: string) {
  return db.apiConfig.findMany({
    where: { service, enabled: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Get a specific API config by id.
 */
export async function getApiConfigById(id: string) {
  return db.apiConfig.findUnique({ where: { id } });
}

/**
 * Log an API call to ApiLog + update the parent ApiConfig counters.
 *
 * On `level === "error"`, increments failedRequests, sets lastErrorAt + lastError.
 * Always increments totalRequests + sets lastUsedAt.
 */
export async function logApiCall(
  apiConfigId: string,
  level: "info" | "warn" | "error",
  message: string,
  data?: {
    endpoint?: string;
    statusCode?: number;
    responseTimeMs?: number;
    requestBody?: string;
    responseBody?: string;
  },
) {
  await Promise.all([
    db.apiLog.create({
      data: { apiConfigId, level, message, ...data },
    }),
    db.apiConfig.update({
      where: { id: apiConfigId },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 },
        ...(level === "error" && {
          lastErrorAt: new Date(),
          lastError: message,
          failedRequests: { increment: 1 },
        }),
      },
    }),
  ]);
}

/**
 * Parse the credentials JSON string into a plain object.
 * Returns `{}` on parse failure.
 */
export function parseCredentials(credentialsJson: string | null | undefined): Record<string, string> {
  if (!credentialsJson) return {};
  try {
    const parsed = JSON.parse(credentialsJson);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, string>
      : {};
  } catch {
    return {};
  }
}

/**
 * Serialize a credentials object to a JSON string for storage.
 * Masks nothing — only call this with already-sanitized data.
 */
export function serializeCredentials(creds: Record<string, string>): string {
  return JSON.stringify(creds);
}

/**
 * Mask a credential value for display — shows first 4 + last 4 chars, masks the middle.
 * Empty / very short values are returned as-is (so empty stays empty).
 */
export function maskCredential(value: string | undefined | null): string {
  if (!value) return "";
  if (value.length <= 8) return value ? "•".repeat(value.length) : "";
  return `${value.slice(0, 4)}${"•".repeat(Math.min(value.length - 8, 16))}${value.slice(-4)}`;
}

/**
 * Sanitize a credentials object for logging — replaces values with masked versions.
 * Used so we never accidentally write plaintext secrets to ApiLog.requestBody.
 */
export function sanitizeCredentialsForLog(creds: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    out[k] = maskCredential(v);
  }
  return out;
}
