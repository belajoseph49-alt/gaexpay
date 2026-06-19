import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

// Simulated crypto wallet balances for the demo user
const DEMO_CRYPTO_WALLETS = [
  { code: "BTC", balance: 0.04582, address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  { code: "ETH", balance: 1.2847, address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
  { code: "USDT", balance: 2850.50, address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
  { code: "USDC", balance: 1240.00, address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e" },
  { code: "BNB", balance: 3.582, address: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2" },
  { code: "SOL", balance: 12.45, address: "7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2" },
  { code: "PI", balance: 1850.0, address: "pi_network_adaeze_okonkwo_4729" },
  { code: "TRX", balance: 4580.0, address: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" },
];

// Crypto prices in USD
const CRYPTO_PRICES_USD: Record<string, number> = {
  BTC: 67500, ETH: 3450, BNB: 585, SOL: 145, XRP: 0.52, ADA: 0.45,
  DOT: 7.2, MATIC: 0.72, LTC: 84, TRX: 0.12,
  USDT: 1.0, USDC: 1.0, BUSD: 1.0, DAI: 1.0,
  PI: 47.35,
};

export async function GET() {
  const wallets = DEMO_CRYPTO_WALLETS.map((w) => {
    const priceUSD = CRYPTO_PRICES_USD[w.code] || 0;
    const valueUSD = w.balance * priceUSD;
    return {
      ...w,
      priceUSD,
      valueUSD,
    };
  });

  const totalValueUSD = wallets.reduce((s, w) => s + w.valueUSD, 0);
  const totalValueNGN = totalValueUSD / 0.00065;

  return NextResponse.json({
    wallets,
    totalValueUSD,
    totalValueNGN,
  });
}
