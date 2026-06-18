import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Fallback rates if DB empty
const FALLBACK: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12, UGX: 0.42, XOF: 2.5, ZAR: 82,
};

export async function GET() {
  const rates = await db.exchangeRate.findMany();
  return NextResponse.json({ rates });
}

export async function POST(req: Request) {
  const { from, to, amount } = await req.json();
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
}
