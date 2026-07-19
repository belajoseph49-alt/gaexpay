import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import {
  COUNTRY_SERVICES,
  SERVICE_CATEGORIES,
  getCountryServices,
  getCategoryServices,
  listServicedCountries,
  type ServiceCategory,
} from "@/lib/country-services";
import { COUNTRIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

/**
 * Normalize whatever the user (or the user profile) gave us as a "country"
 * into a 2-letter ISO-3166 alpha-2 code that exists in COUNTRY_SERVICES.
 *
 * Accepts:
 *   - direct ISO codes (NG, gh, Ke)  — case-insensitive
 *   - full country names (Nigeria, "côte d'ivoire") — case-insensitive,
 *     partial match on the canonical name in COUNTRIES
 *
 * Returns the uppercased ISO code, or `null` if no match.
 */
function normalizeCountryCode(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Direct ISO code (2 letters).
  if (/^[A-Za-z]{2}$/.test(s)) {
    const up = s.toUpperCase();
    return COUNTRY_SERVICES[up] ? up : null;
  }

  // Full name — match against COUNTRIES.
  const lower = s.toLowerCase();
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase() === lower,
  );
  if (match && COUNTRY_SERVICES[match.code]) return match.code;

  // Partial / "contains" fallback (e.g. "Côte d'Ivoire" vs "cote d'ivoire").
  const loose = COUNTRIES.find(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase()),
  );
  if (loose && COUNTRY_SERVICES[loose.code]) return loose.code;

  return null;
}

/**
 * GET /api/country-services
 *
 * Returns the real service-provider directory for a country, optionally
 * narrowed down to a single city and/or category.
 *
 * Query params:
 *   - country   ISO-3166 alpha-2 code (e.g. NG, GH, KE, ZA).
 *               If omitted, falls back to the authenticated user's `country`.
 *   - city      Free-text city name (e.g. "Lagos"). Optional.
 *   - category  One of SERVICE_CATEGORIES (transport, restaurants,
 *               supermarkets, hospitals, pharmacies, internetProviders,
 *               universities, fuelStations, electricity, water, tv,
 *               insurance, government). Optional.
 *
 * Examples:
 *   GET /api/country-services                       → auto-detect country, all categories
 *   GET /api/country-services?country=NG            → all categories for Nigeria
 *   GET /api/country-services?country=NG&city=Lagos → all categories in Lagos
 *   GET /api/country-services?country=NG&category=internetProviders
 *   GET /api/country-services?country=KE&city=Nairobi&category=hospitals
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const url = new URL(req.url);
    const qCountryRaw = url.searchParams.get("country")?.trim() ?? "";
    const qCountry = normalizeCountryCode(qCountryRaw) || (qCountryRaw ? qCountryRaw.toUpperCase() : "");
    const qCity = url.searchParams.get("city")?.trim() || undefined;
    const qCategory = url.searchParams.get("category")?.trim() || undefined;

    // 1. Resolve the target country — explicit query param first, then the
    //    authenticated user's saved country, then a default of NG.
    let country = qCountry || undefined;
    let resolvedFrom = "query";
    let userCity: string | undefined;

    if (!country) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { country: true, city: true },
      });
      if (user?.country) {
        const norm = normalizeCountryCode(user.country);
        if (norm) {
          country = norm;
          resolvedFrom = "profile";
        }
      }
      if (user?.city) {
        userCity = user.city;
      }
    }

    // If the caller didn't pass a city but we resolved the country from the
    // profile, use the user's saved city as the default filter so the
    // response is "what's near me" rather than "every provider in country".
    const city = qCity ?? (resolvedFrom === "profile" ? userCity : undefined);

    // 2. Validate category (if supplied).
    if (qCategory && !SERVICE_CATEGORIES.includes(qCategory as ServiceCategory)) {
      return apiError(
        `Invalid category. Must be one of: ${SERVICE_CATEGORIES.join(", ")}`,
        400,
      );
    }

    // 3. No country at all — return the full index of serviced countries.
    if (!country) {
      return NextResponse.json({
        countries: listServicedCountries(),
        categories: SERVICE_CATEGORIES,
        services: {},
      });
    }

    // 4. Unknown country — 404.
    const services = getCountryServices(country);
    if (!services) {
      return apiError(
        `No service directory for country "${country}". Supported: ${listServicedCountries().join(", ")}`,
        404,
      );
    }

    // 5. Build the response payload. If `category` is supplied, return only
    //    that one (city-filtered where applicable). Otherwise return every
    //    category, each city-filtered where applicable.
    let payload: Record<string, unknown>;
    if (qCategory) {
      const filtered = getCategoryServices(country, qCategory, city);
      payload = { [qCategory]: filtered };
    } else {
      payload = {};
      for (const cat of SERVICE_CATEGORIES) {
        payload[cat] = getCategoryServices(country, cat, city);
      }
    }

    // 6. Count helpers for the client.
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(payload)) {
      counts[k] = Array.isArray(v) ? v.length : 0;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      country,
      resolvedFrom,
      city: city ?? null,
      category: qCategory ?? null,
      categories: qCategory ? [qCategory] : SERVICE_CATEGORIES,
      counts,
      total,
      services: payload,
      // Convenience: the full map so the SPA can render a country picker.
      servicedCountries: listServicedCountries(),
      allCountries: Object.keys(COUNTRY_SERVICES),
    });
  } catch (e) {
    return apiCatch(e);
  }
}
