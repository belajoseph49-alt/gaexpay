import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CRYPTOCURRENCIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// Simulated live crypto prices (in USD)
const CRYPTO_PRICES_USD: Record<string, number> = {
  BTC: 67500,
  ETH: 3450,
  BNB: 585,
  SOL: 145,
  XRP: 0.52,
  ADA: 0.45,
  DOT: 7.2,
  MATIC: 0.72,
  LTC: 84,
  TRX: 0.12,
  USDT: 1.0,
  USDC: 1.0,
  BUSD: 1.0,
  DAI: 1.0,
  PI: 47.35, // Pi Network - special rate (simulated pre-mainnet value)
};

// Fiat to USD conversion rates
const FIAT_TO_USD: Record<string, number> = {
  NGN: 0.00065, USD: 1, EUR: 1.08, GBP: 1.27, GHS: 0.079, KES: 0.0078,
  UGX: 0.00027, XOF: 0.0017, XAF: 0.0017, ZAR: 0.054, ETB: 0.018,
  RWF: 0.00078, TZS: 0.00039, EGP: 0.021, MAD: 0.10, DZD: 0.0074,
  TND: 0.32, BIF: 0.00035, CDF: 0.00037, AOA: 0.0011, MZN: 0.016,
  ZMW: 0.039, BWP: 0.074, CNY: 0.14, JPY: 0.0067, CAD: 0.73,
  AUD: 0.66, CHF: 1.13, AED: 0.27, SAR: 0.27, INR: 0.012, BRL: 0.20,
};

export async function GET() {
  const now = Date.now();
  // Add small random fluctuation to simulate live prices
  const rates = CRYPTOCURRENCIES.map((crypto) => {
    const basePrice = CRYPTO_PRICES_USD[crypto.code] || 0;
    const fluctuation = 1 + (Math.random() - 0.5) * 0.02; // ±1% fluctuation
    const priceUSD = basePrice * fluctuation;

    // Convert to major fiat currencies
    const prices: Record<string, number> = {};
    for (const [fiat, usdRate] of Object.entries(FIAT_TO_USD)) {
      prices[fiat] = priceUSD / usdRate;
    }

    return {
      ...crypto,
      priceUSD,
      prices,
      change24h: (Math.random() - 0.5) * 10, // -5% to +5%
      volume24h: Math.random() * 1000000000,
      marketCap: priceUSD * (crypto.code === "BTC" ? 19000000 : crypto.code === "ETH" ? 120000000 : 1000000000),
      lastUpdated: now,
    };
  });

  return NextResponse.json({
    rates,
    timestamp: now,
    fiatCurrencies: Object.keys(FIAT_TO_USD),
  });
}
