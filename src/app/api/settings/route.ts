import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/settings
 *
 * Update the authenticated user's preferences. Currently supports:
 *   - language  (LanguageCode: en, fr, ru, zh, ar, es, de, ew, ff, sw, ln, ha)
 *   - currency  (ISO 4217 code, e.g. NGN, USD)
 *   - themePreference (light | dark | system)
 *   - emailNotif / pushNotif / smsNotif (booleans)
 *
 * Body shape:
 *   { "language": "fr" } | { "currency": "USD" } | ...
 *
 * Returns 200 with the updated preference subset. Rejects unknown keys.
 */
const ALLOWED_KEYS = new Set([
  "language", "currency", "themePreference",
  "emailNotif", "pushNotif", "smsNotif",
]);

const ALLOWED_LANGUAGES = new Set([
  "en", "fr", "ru", "zh", "ar", "es", "de", "ew", "ff", "sw", "ln", "ha",
]);

const ALLOWED_THEMES = new Set(["light", "dark", "system"]);

export async function PATCH(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return apiError("Body must be an object", 400);
    }
    const obj = body as Record<string, unknown>;

    // Build the update payload, validating each allowed field.
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!ALLOWED_KEYS.has(key)) {
        return apiError(`Unknown setting: ${key}`, 400);
      }
      if (key === "language") {
        if (typeof value !== "string" || !ALLOWED_LANGUAGES.has(value)) {
          return apiError("Invalid language code", 400);
        }
        data.language = value;
      } else if (key === "currency") {
        if (typeof value !== "string" || value.length < 2 || value.length > 10) {
          return apiError("Invalid currency code", 400);
        }
        data.currency = value.toUpperCase();
      } else if (key === "themePreference") {
        if (typeof value !== "string" || !ALLOWED_THEMES.has(value)) {
          return apiError("Invalid theme", 400);
        }
        data.themePreference = value;
      } else {
        // Boolean toggles
        if (typeof value !== "boolean") {
          return apiError(`${key} must be boolean`, 400);
        }
        data[key] = value;
      }
    }

    if (Object.keys(data).length === 0) {
      return apiError("No valid fields to update", 400);
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: {
        language: true, currency: true, themePreference: true,
        emailNotif: true, pushNotif: true, smsNotif: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * GET /api/settings
 *
 * Return the authenticated user's preferences (no sensitive fields).
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        language: true, currency: true, themePreference: true,
        emailNotif: true, pushNotif: true, smsNotif: true,
      },
    });
    if (!user) return apiError("User not found", 404);

    return NextResponse.json({ user });
  } catch (e) {
    return apiCatch(e);
  }
}
