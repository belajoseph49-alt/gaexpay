import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";
import { getCryptoRates, FIAT_USD_RATE } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

/**
 * Initial crypto holdings used to seed the demo user's crypto wallets on first
 * access. Mirrors `prisma/seed-crypto-wallets.ts` so the wallets route is
 * self-bootstrapping — if a fresh DB has no crypto wallets, we create them
 * here on the first GET request.
 */
const SEED_CRYPTOS: { code: string; balance: number }[] = [
  { code: "BTC", balance: 0.04582 },
  { code: "ETH", balance: 1.2847 },
  { code: "USDT", balance: 2850.5 },
  { code: "USDC", balance: 1240.0 },
  { code: "BNB", balance: 3.582 },
  { code: "SOL", balance: 12.45 },
  { code: "PI", balance: 1850.0 },
  { code: "TRX", balance: 4580.0 },
];

/**
 * Deterministically derive a deposit address for a (userId, currency) pair.
 * Same input always produces the same address, so the user sees a stable
 * deposit address per crypto across page reloads.
 *
 * Uses SHA-256(userId + ":" + currency) and formats the digest with the
 * appropriate per-chain prefix (bc1q… for BTC, 0x… for EVM chains, etc).
 */
function depositAddress(userId: string, currency: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${userId}:${currency}`)
    .digest("hex");
  switch (currency) {
    case "BTC":
      return "bc1q" + hash.slice(0, 38);
    case "ETH":
    case "USDT":
    case "USDC":
    case "DAI":
    case "BUSD":
    case "MATIC":
      return "0x" + hash.slice(0, 40);
    case "BNB":
      return "bnb1" + hash.slice(0, 38);
    case "SOL":
      return hash.slice(0, 44);
    case "TRX":
      return "T" + hash.slice(0, 33).toUpperCase();
    case "PI":
      return "pi_network_" + hash.slice(0, 12);
    case "XRP":
      return "r" + hash.slice(0, 33);
    case "LTC":
      return "ltc1q" + hash.slice(0, 38);
    case "ADA":
      return "addr1q" + hash.slice(0, 50);
    case "DOT":
      return hash.slice(0, 46);
    default:
      return "0x" + hash.slice(0, 40);
  }
}

/** Fetch the demo user's crypto wallets from the DB; seed on first access. */
async function getCryptoWallets() {
  let wallets = await db.wallet.findMany({
    where: { userId: DEMO_USER_ID, type: "crypto" },
    orderBy: { currency: "asc" },
  });

  if (wallets.length === 0) {
    // Seed on first access — keeps the route self-bootstrapping.
    await db.wallet.createMany({
      data: SEED_CRYPTOS.map((w) => ({
        userId: DEMO_USER_ID,
        currency: w.code,
        balance: w.balance,
        ledgerBalance: w.balance,
        type: "crypto",
        label: "Crypto Wallet",
        isDefault: false,
        status: "active",
      })),
    });
    wallets = await db.wallet.findMany({
      where: { userId: DEMO_USER_ID, type: "crypto" },
      orderBy: { currency: "asc" },
    });
  }

  return wallets;
}

/**
 * GET /api/crypto/wallets
 *
 * Returns the demo user's crypto wallet balances with REAL CoinGecko prices,
 * deterministic deposit addresses, USD + NGN portfolio values, and 24h change.
 */
export async function GET() {
  const wallets = await getCryptoWallets();

  const { rates, priceMap } = await getCryptoRates();
  const NGN_PER_USD = FIAT_USD_RATE.NGN;

  const walletsWithDetails = wallets.map((w) => {
    const priceUSD = priceMap[w.currency] ?? 0;
    const rateMeta = rates.find((r) => r.code === w.currency);
    const valueUSD = w.balance * priceUSD;
    const valueNGN = valueUSD * NGN_PER_USD;
    return {
      id: w.id,
      code: w.currency,
      name: rateMeta?.name ?? w.currency,
      symbol: rateMeta?.symbol ?? "",
      icon: rateMeta?.icon ?? "",
      color: rateMeta?.color ?? "",
      network: rateMeta?.network ?? "",
      type: rateMeta?.type ?? "",
      balance: w.balance,
      ledgerBalance: w.ledgerBalance,
      address: depositAddress(DEMO_USER_ID, w.currency),
      priceUSD,
      valueUSD,
      valueNGN,
      change24h: rateMeta?.change24h ?? 0,
    };
  });

  const totalValueUSD = walletsWithDetails.reduce((s, w) => s + w.valueUSD, 0);
  const totalValueNGN = walletsWithDetails.reduce((s, w) => s + w.valueNGN, 0);

  return NextResponse.json({
    wallets: walletsWithDetails,
    totalValueUSD,
    totalValueNGN,
    source: "CoinGecko",
  });
}
