import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Fallback rates if DB empty
const FALLBACK: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12, UGX: 0.42, XOF: 2.5, ZAR: 82,
};

/** GET /api/exchange-rates — list all configured rates. Authenticated but read-only. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const rates = await db.exchangeRate.findMany();
    return NextResponse.json({ rates });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/exchange-rates — convert an amount between two currencies. */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { from?: string; to?: string; amount?: number | string };
    const { from, to, amount } = b;
    if (!from || !to || amount === undefined) return apiError("from, to, amount are required", 400);

    // direct lookup or via NGN
    const rates = await db.exchangeRate.findMany();
    const map = new Map(rates.map((r) => [`${r.base}/${r.quote}`, r.rate]));

    let rate: number;
    if (from === to) rate = 1;
    else if (map.has(`${from}/${to}`)) rate = map.get(`${from}/${to}`)!;
    else {
      const fromNGN = FALLBACK[from] ?? 1;
      const toNGN = FALLBACK[to] ?? 1;
      rate = toNGN / fromNGN;
    }
    const converted = Number(amount) * rate;
    return NextResponse.json({ from, to, amount: Number(amount), rate, converted });
  } catch (e) {
    return apiCatch(e);
  }
}
