import { NextResponse } from "next/server";
import { CRYPTOCURRENCIES } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// Crypto prices in USD (same as rates API)
const CRYPTO_PRICES_USD: Record<string, number> = {
  BTC: 67500, ETH: 3450, BNB: 585, SOL: 145, XRP: 0.52, ADA: 0.45,
  DOT: 7.2, MATIC: 0.72, LTC: 84, TRX: 0.12,
  USDT: 1.0, USDC: 1.0, BUSD: 1.0, DAI: 1.0,
  PI: 47.35,
};

const FIAT_TO_USD: Record<string, number> = {
  NGN: 0.00065, USD: 1, EUR: 1.08, GBP: 1.27, GHS: 0.079, KES: 0.0078,
  UGX: 0.00027, XOF: 0.0017, XAF: 0.0017, ZAR: 0.054, ETB: 0.018,
  RWF: 0.00078, TZS: 0.00039, EGP: 0.021, MAD: 0.10, DZD: 0.0074,
  TND: 0.32, BIF: 0.00035, CDF: 0.00037, AOA: 0.0011, MZN: 0.016,
  ZMW: 0.039, BWP: 0.074, CNY: 0.14, JPY: 0.0067, CAD: 0.73,
  AUD: 0.66, CHF: 1.13, AED: 0.27, SAR: 0.27, INR: 0.012, BRL: 0.20,
};

export async function POST(req: Request) {
  const body = await req.json();
  const { from, to, amount } = body;

  if (!from || !to || !amount || amount <= 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const fromCrypto = CRYPTO_PRICES_USD[from] !== undefined;
  const toCrypto = CRYPTO_PRICES_USD[to] !== undefined;

  let rate: number;
  let converted: number;

  if (fromCrypto && !toCrypto) {
    // Crypto to fiat
    const cryptoPriceUSD = CRYPTO_PRICES_USD[from];
    const fiatRate = FIAT_TO_USD[to] || 1;
    rate = cryptoPriceUSD / fiatRate;
    converted = amount * rate;
  } else if (!fromCrypto && toCrypto) {
    // Fiat to crypto
    const cryptoPriceUSD = CRYPTO_PRICES_USD[to];
    const fiatRate = FIAT_TO_USD[from] || 1;
    const amountUSD = amount * fiatRate;
    rate = cryptoPriceUSD > 0 ? fiatRate / cryptoPriceUSD : 0;
    converted = amountUSD / cryptoPriceUSD;
  } else if (fromCrypto && toCrypto) {
    // Crypto to crypto
    const fromPrice = CRYPTO_PRICES_USD[from];
    const toPrice = CRYPTO_PRICES_USD[to];
    rate = fromPrice / toPrice;
    converted = amount * rate;
  } else {
    // Fiat to fiat (shouldn't reach here normally)
    const fromRate = FIAT_TO_USD[from] || 1;
    const toRate = FIAT_TO_USD[to] || 1;
    rate = toRate / fromRate;
    converted = amount * rate;
  }

  return NextResponse.json({
    from,
    to,
    amount: Number(amount),
    rate,
    converted,
    fromType: fromCrypto ? "crypto" : "fiat",
    toType: toCrypto ? "crypto" : "fiat",
  });
}
