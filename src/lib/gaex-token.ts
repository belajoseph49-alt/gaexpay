/**
 * src/lib/gaex-token.ts — GAEX platform token constants (Task 17-c)
 *
 * The GAEX token is GaexPay's native platform/utility token. Since it isn't
 * listed on external exchanges yet, we simulate its price from a deterministic
 * formula that derives from the current BTC price (so the chart looks alive
 * without ever needing an external oracle). Real price history is generated
 * on-the-fly from a fixed seed so the chart is stable across page reloads.
 */

import { getCryptoPriceMap } from "@/lib/coingecko";

/** Canonical seed price (USD) used as the "current" GAEX price baseline. */
export const GAEX_BASE_PRICE_USD = 2.4;

/**
 * Deterministic pseudo-random walk seeded by a day index. Returns a price in
 * USD. Same day → same price, so the chart is stable across reloads.
 */
export function gaexPriceOn(dayIndex: number): number {
  // Simple LCG-style walk anchored to the base price.
  let seed = (dayIndex + 1) * 9301 + 49297;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let price = GAEX_BASE_PRICE_USD * 0.78; // start below current to show upward trend
  for (let i = 0; i <= dayIndex; i++) {
    const drift = (rand() - 0.45) * 0.06; // slight upward bias
    price = price * (1 + drift);
    // Clamp to a believable range
    if (price < GAEX_BASE_PRICE_USD * 0.5) price = GAEX_BASE_PRICE_USD * 0.5;
    if (price > GAEX_BASE_PRICE_USD * 1.6) price = GAEX_BASE_PRICE_USD * 1.6;
  }
  return Number(price.toFixed(4));
}

/** Number of days of price history we expose. */
export const GAEX_HISTORY_DAYS = 90;

/**
 * Build the full price-history array (oldest → newest). The last entry is the
 * "current" price, which is also lightly jittered by the BTC price so multiple
 * reloads within a session produce marginally different "live" ticks.
 */
export async function getGaexPriceHistory(): Promise<
  { date: string; price: number; volume: number }[]
> {
  const out: { date: string; price: number; volume: number }[] = [];
  const priceMap = await getCryptoPriceMap().catch(() => ({} as Record<string, number>));
  const btc = priceMap.BTC ?? 67500;
  // A tiny multiplier derived from BTC's current price makes the "latest" tick
  // move with the live market without breaking determinism too much.
  const liveJitter = (btc / 67500 - 1) * 0.02;
  const today = new Date();
  for (let i = GAEX_HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const idx = GAEX_HISTORY_DAYS - 1 - i;
    let p = gaexPriceOn(idx);
    if (i === 0) p = Number((p * (1 + liveJitter)).toFixed(4));
    out.push({
      date: d.toISOString().slice(0, 10),
      price: p,
      volume: Math.round(800_000 + Math.sin(idx) * 320_000 + (idx * 4_200)),
    });
  }
  return out;
}

/** Get the current GAEX token info bundle. */
export async function getGaexTokenInfo() {
  const history = await getGaexPriceHistory();
  const latest = history[history.length - 1];
  const prev = history[history.length - 2] ?? latest;
  const price = latest.price;
  const change24h = ((price - prev.price) / prev.price) * 100;

  // Static tokenomics — these match the seed in `prisma/seed-staking.ts`.
  const totalSupply = 1_000_000_000; // 1B GAEX
  const circulatingSupply = 385_000_000; // 38.5% circulating
  const marketCap = price * circulatingSupply;

  const tokenomics = [
    { label: "Team & Advisors", percent: 15, color: "#10B981", description: "Core team + advisors, 24-month vesting" },
    { label: "Community & Ecosystem", percent: 30, color: "#14B8A6", description: "Airdrops, grants, community rewards" },
    { label: "Staking Rewards", percent: 25, color: "#0EA5E9", description: "Distributed over 5 years to stakers" },
    { label: "Liquidity", percent: 15, color: "#F59E0B", description: "DEX/CEX liquidity provisioning" },
    { label: "Treasury", percent: 15, color: "#8B5CF6", description: "Foundation treasury for grants + runway" },
  ];

  const utilities = [
    { icon: "Percent", title: "Fee Discount", description: "Up to 50% off transfer, swap, and bill payment fees when paying with GAEX.", value: "50% off" },
    { icon: "Rocket", title: "Staking Boost", description: "Stake GAEX to unlock higher APY on BTC/ETH/USDT/PI pools (up to +3% bonus).", value: "+3% APY" },
    { icon: "Vote", title: "Governance", description: "Vote on platform upgrades, fee changes, and new feature listings — 1 GAEX = 1 vote.", value: "1 GAEX = 1 vote" },
    { icon: "Gift", title: "Cashback Multiplier", description: "Hold GAEX to multiply cashback on every card spend and merchant payment.", value: "Up to 5x" },
  ];

  return {
    symbol: "GAEX",
    name: "GaexPay Token",
    priceUSD: price,
    change24h,
    marketCap,
    totalSupply,
    circulatingSupply,
    history,
    tokenomics,
    utilities,
    contractAddress: "0xGAEX7a3F9c1b2D8e5A6f4C7d9E2b1a8F3c4D5e6B",
    chain: "GaexPay Chain (ERC-20 compatible)",
  };
}
