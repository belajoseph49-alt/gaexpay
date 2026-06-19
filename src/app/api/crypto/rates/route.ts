import { NextResponse } from "next/server";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

/**
 * GET /api/crypto/rates
 *
 * Returns REAL live crypto prices from the CoinGecko public API
 * (no API key needed), cached for 60s to stay within rate limits.
 *
 * Response shape (kept stable for the existing views):
 *   {
 *     rates: Array<{
 *       code, name, symbol, icon, network, type, color,
 *       priceUSD,
 *       prices: Record<fiat, number>,
 *       change24h,        // real % from CoinGecko
 *       volume24h,        // real 24h volume in USD
 *       marketCap,        // real market cap in USD
 *       lastUpdated,
 *     }>,
 *     timestamp,
 *     fiatCurrencies: string[],
 *   }
 *
 * - Pi Network (PI) is pre-mainnet and not on CoinGecko → fixed $47.35.
 * - Currencies not supported by CoinGecko (XAF, XOF, UGX, ETB, etc.) are
 *   converted via USD using a static fallback rate table.
 */
export async function GET() {
  const { rates, timestamp } = await getCryptoRates();

  return NextResponse.json({
    rates,
    timestamp,
    fiatCurrencies: Object.keys(FIAT_USD_RATE),
    source: "CoinGecko",
    cached: Date.now() - timestamp < 60_000,
  });
}
