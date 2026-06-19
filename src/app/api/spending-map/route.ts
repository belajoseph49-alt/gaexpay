import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// Simulated merchant locations (lat/lng for African cities)
const LOCATIONS: Record<string, { lat: number; lng: number; city: string; country: string }> = {
  "Spencer Supermarket": { lat: 6.4474, lng: 3.4084, city: "Lagos", country: "Nigeria" },
  "Chicken Republic": { lat: 6.4541, lng: 3.3947, city: "Lagos", country: "Nigeria" },
  "Uber Lagos": { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria" },
  "FilmHouse Cinema": { lat: 6.4541, lng: 3.4084, city: "Lagos", country: "Nigeria" },
  "HealthPlus Pharmacy": { lat: 6.4474, lng: 3.4474, city: "Lagos", country: "Nigeria" },
  "Jumia Pickup Hub": { lat: 9.0765, lng: 7.3986, city: "Abuja", country: "Nigeria" },
  "Ikeja Electric": { lat: 6.6018, lng: 3.3515, city: "Lagos", country: "Nigeria" },
  "DSTV": { lat: -26.2041, lng: 28.0473, city: "Johannesburg", country: "South Africa" },
  "MTN MoMo": { lat: 0.3476, lng: 32.5825, city: "Kampala", country: "Uganda" },
  "Orange Money": { lat: 5.3600, lng: -4.0083, city: "Abidjan", country: "Côte d'Ivoire" },
  "Airtel Money": { lat: -1.2921, lng: 36.8219, city: "Nairobi", country: "Kenya" },
};

export async function GET() {
  const transactions = await db.transaction.findMany({
    where: {
      userId: DEMO_USER_ID,
      status: "completed",
      direction: "debit",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Group by counterparty and simulate location
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
    const loc = LOCATIONS[name] || { lat: 6.5244 + (Math.random() - 0.5) * 2, lng: 3.3792 + (Math.random() - 0.5) * 2, city: "Lagos", country: "Nigeria" };

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
  });
}
