import { NextResponse } from "next/server";
import { convertAmount } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

/**
 * POST /api/crypto/convert
 * Body: { from: "BTC", to: "NGN", amount: 0.01 }
 *
 * Uses REAL live prices from CoinGecko (via the shared cached lib).
 * Supports crypto↔crypto, crypto↔fiat, and fiat↔fiat.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { from, to, amount } = body;

  if (!from || !to || !amount || amount <= 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { rate, converted, fromType, toType } = await convertAmount(
      String(from).toUpperCase(),
      String(to).toUpperCase(),
      Number(amount),
    );

    return NextResponse.json({
      from,
      to,
      amount: Number(amount),
      rate,
      converted,
      fromType,
      toType,
      source: "CoinGecko",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Conversion failed" },
      { status: 500 },
    );
  }
}
