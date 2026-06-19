import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Known merchant → city mapping (the hardcoded LOCATIONS map is fine — it maps
// real merchant names from the seeded transaction data to their city/country).
// ---------------------------------------------------------------------------
const LOCATIONS: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  "Spencer Supermarket": { lat: 6.4474, lng: 3.4084, city: "Lagos", country: "Nigeria" },
  "Chicken Republic": { lat: 6.4541, lng: 3.3947, city: "Lagos", country: "Nigeria" },
  "Uber Lagos": { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria" },
  "FilmHouse Cinema": { lat: 6.4541, lng: 3.4084, city: "Lagos", country: "Nigeria" },
  "HealthPlus Pharmacy": { lat: 6.4474, lng: 3.4474, city: "Lagos", country: "Nigeria" },
  "Jumia Pickup Hub": { lat: 9.0765, lng: 7.3986, city: "Abuja", country: "Nigeria" },
  "Jumia Stores": { lat: 6.6018, lng: 3.3515, city: "Lagos", country: "Nigeria" },
  "Ikeja Electric": { lat: 6.6018, lng: 3.3515, city: "Lagos", country: "Nigeria" },
  "DSTV": { lat: -26.2041, lng: 28.0473, city: "Johannesburg", country: "South Africa" },
  "DSTV Nigeria": { lat: 6.4541, lng: 3.4084, city: "Lagos", country: "Nigeria" },
  "MTN MoMo": { lat: 0.3476, lng: 32.5825, city: "Kampala", country: "Uganda" },
  "Orange Money": { lat: 5.3600, lng: -4.0083, city: "Abidjan", country: "Côte d'Ivoire" },
  "Airtel Money": { lat: -1.2921, lng: 36.8219, city: "Nairobi", country: "Kenya" },
};

// ---------------------------------------------------------------------------
// Country → capital city coordinate map. Used to assign a deterministic
// location for unknown merchants based on the user's country (from their
// User.country profile field). Falls back to Lagos/Nigeria if the user's
// country isn't in the map.
// ---------------------------------------------------------------------------
const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  Nigeria: { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria" },
  Ghana: { lat: 5.6037, lng: -0.1870, city: "Accra", country: "Ghana" },
  Kenya: { lat: -1.2921, lng: 36.8219, city: "Nairobi", country: "Kenya" },
  Uganda: { lat: 0.3476, lng: 32.5825, city: "Kampala", country: "Uganda" },
  "Côte d'Ivoire": { lat: 5.3600, lng: -4.0083, city: "Abidjan", country: "Côte d'Ivoire" },
  "South Africa": { lat: -26.2041, lng: 28.0473, city: "Johannesburg", country: "South Africa" },
  Senegal: { lat: 14.7167, lng: -17.4677, city: "Dakar", country: "Senegal" },
  Cameroon: { lat: 3.8671, lng: 11.5167, city: "Yaoundé", country: "Cameroon" },
  Tanzania: { lat: -6.7924, lng: 39.2083, city: "Dar es Salaam", country: "Tanzania" },
  Rwanda: { lat: -1.9706, lng: 30.1044, city: "Kigali", country: "Rwanda" },
  Ethiopia: { lat: 9.0320, lng: 38.7469, city: "Addis Ababa", country: "Ethiopia" },
  Egypt: { lat: 30.0444, lng: 31.2357, city: "Cairo", country: "Egypt" },
  Morocco: { lat: 34.0209, lng: -6.8416, city: "Rabat", country: "Morocco" },
  "DR Congo": { lat: -4.4419, lng: 15.2663, city: "Kinshasa", country: "DR Congo" },
  Zambia: { lat: -15.3875, lng: 28.3228, city: "Lusaka", country: "Zambia" },
  "United States": { lat: 40.7128, lng: -74.0060, city: "New York", country: "United States" },
  "United Kingdom": { lat: 51.5074, lng: -0.1278, city: "London", country: "United Kingdom" },
};

// ---------------------------------------------------------------------------
// Deterministic offset generator — when an unknown merchant maps to the
// user's city, we apply a small deterministic offset to its lat/lng so
// multiple merchants in the same city don't all stack on the same point.
// The offset is derived from a hash of the merchant name (stable per name).
// ---------------------------------------------------------------------------
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function deterministicOffset(name: string): { dLat: number; dLng: number } {
  const h1 = hashStr(name + ":lat");
  const h2 = hashStr(name + ":lng");
  // ±0.05 degrees (~5.5 km) deterministic offset
  const dLat = ((h1 % 1000) / 1000 - 0.5) * 0.1;
  const dLng = ((h2 % 1000) / 1000 - 0.5) * 0.1;
  return { dLat, dLng };
}

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Fetch the user's profile so we can map unknown merchants to their
    // country/city instead of using random coordinates.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { country: true, city: true },
    });
    const userCountry = user?.country || "Nigeria";
    const userCity = user?.city || undefined;

    // Look up the centroid for the user's country. If their city is set,
    // try to use a country centroid whose city matches.
    const fallbackCentroid =
      (userCity && Object.values(COUNTRY_CENTROIDS).find((c) => c.city === userCity)) ||
      COUNTRY_CENTROIDS[userCountry] ||
      COUNTRY_CENTROIDS.Nigeria;

    // Pull real debit transactions for the user
    const transactions = await db.transaction.findMany({
      where: {
        userId,
        status: "completed",
        direction: "debit",
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, amount: true, currency: true, category: true,
        counterpartyName: true, description: true, createdAt: true,
      },
    });

    // Group by counterparty and resolve location
    const locationMap: Record<string, {
      name: string;
      lat: number;
      lng: number;
      city: string;
      country: string;
      totalSpent: number;
      txCount: number;
      category: string;
    }> = {};

    for (const t of transactions) {
      const name = t.counterpartyName || t.description || "Unknown";

      // 1. Known merchant → use the hardcoded LOCATIONS map
      // 2. Unknown merchant → fall back to the USER'S country/city (not random)
      //    with a deterministic per-name offset so merchants in the same city
      //    don't all stack on the same point.
      let loc = LOCATIONS[name];
      let source: "known" | "user-city" = "known";
      if (!loc) {
        const off = deterministicOffset(name);
        loc = {
          lat: fallbackCentroid.lat + off.dLat,
          lng: fallbackCentroid.lng + off.dLng,
          city: userCity || fallbackCentroid.city,
          country: userCountry,
        };
        source = "user-city";
      }
      void source; // reserved for future UI badge ("inferred location")

      if (!locationMap[name]) {
        locationMap[name] = {
          name,
          lat: loc.lat,
          lng: loc.lng,
          city: loc.city,
          country: loc.country,
          totalSpent: 0,
          txCount: 0,
          category: t.category,
        };
      }
      locationMap[name].totalSpent += t.amount;
      locationMap[name].txCount += 1;
    }

    const locations = Object.values(locationMap).sort((a, b) => b.totalSpent - a.totalSpent);

    // Group by city
    const cityMap: Record<string, { city: string; country: string; totalSpent: number; txCount: number; merchants: number }> = {};
    for (const loc of locations) {
      const key = `${loc.city}, ${loc.country}`;
      if (!cityMap[key]) {
        cityMap[key] = { city: loc.city, country: loc.country, totalSpent: 0, txCount: 0, merchants: 0 };
      }
      cityMap[key].totalSpent += loc.totalSpent;
      cityMap[key].txCount += loc.txCount;
      cityMap[key].merchants += 1;
    }

    const cities = Object.values(cityMap).sort((a, b) => b.totalSpent - a.totalSpent);

    const totalSpent = locations.reduce((s, l) => s + l.totalSpent, 0);

    return NextResponse.json({
      locations,
      cities,
      totalSpent,
      merchantCount: locations.length,
      cityCount: cities.length,
      // Include the user's profile country/city so the frontend can display
      // the inferred-location attribution in the UI.
      userLocation: {
        country: userCountry,
        city: userCity || null,
        inferredFromProfile: !userCity
          ? Object.values(COUNTRY_CENTROIDS).some((c) => c.city === fallbackCentroid.city) && fallbackCentroid.city !== userCity
          : false,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
