/**
 * CoinGecko live price feed — shared module
 *
 * Used by `/api/crypto/rates`, `/api/crypto/convert`, `/api/crypto/swap`,
 * `/api/crypto/wallets`, and `/api/crypto/trade`.
 *
 * - Fetches real prices from the public CoinGecko API (no API key needed).
 * - Caches the full payload for 60s in module-scope memory to avoid
 *   hitting CoinGecko's rate limit (~30 calls/min for the free tier).
 * - Falls back to a static USD price table if CoinGecko is unreachable so
 *   the app keeps working offline.
 * - Pi Network (PI) is pre-mainnet and not listed on CoinGecko — we use a
 *   fixed price of $47.35.
 */

import { CRYPTOCURRENCIES } from "@/lib/gaexpay";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Pi Network fixed pre-mainnet USD price */
export const PI_PRICE_USD = 47.35;

/** Cache TTL in milliseconds */
const CACHE_TTL_MS = 60_000;

/** Map of our crypto codes → CoinGecko coin IDs */
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOT: "polkadot",
  MATIC: "matic-network",
  LTC: "litecoin",
  TRX: "tron",
  BUSD: "binance-usd",
  DAI: "dai",
  // PI is not on CoinGecko — handled separately
};

/** Reverse lookup: CoinGecko id → our crypto code */
const COINGECKO_ID_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COINGECKO_IDS).map(([code, id]) => [id, code]),
);

/** Currencies supported natively by CoinGecko's `vs_currencies` param */
const CG_FIATS = ["usd", "ngn", "eur", "gbp", "ghs", "kes", "zar"] as const;

/**
 * Fallback USD exchange rates for currencies NOT supported by CoinGecko's
 * simple/price endpoint (mostly African CFA francs). Value = 1 USD in this
 * currency. Used both as the conversion rate and as a safety net when
 * CoinGecko's response is missing a particular fiat.
 */
export const FIAT_USD_RATE: Record<string, number> = {
  // 1 USD = X units of this currency
  USD: 1,
  NGN: 1535.0,
  EUR: 0.873,
  GBP: 0.757,
  GHS: 14.95,
  KES: 129.4,
  ZAR: 16.49,
  // African currencies not on CoinGecko's vs_currencies list
  XAF: 598.5,
  XOF: 598.5,
  UGX: 3685.0,
  ETB: 138.5,
  RWF: 1280.0,
  TZS: 2585.0,
  EGP: 48.6,
  MAD: 9.95,
  DZD: 134.5,
  TND: 3.13,
  BIF: 2950.0,
  CDF: 2700.0,
  AOA: 920.0,
  MZN: 63.5,
  ZMW: 25.6,
  BWP: 13.55,
  // International
  CNY: 7.24,
  JPY: 156.4,
  CAD: 1.366,
  AUD: 1.513,
  CHF: 0.895,
  AED: 3.6725,
  SAR: 3.75,
  INR: 83.4,
  BRL: 5.18,
};

// ---------------------------------------------------------------------------
// Fallback USD price table (used only if CoinGecko is unreachable)
// ---------------------------------------------------------------------------
const FALLBACK_PRICES_USD: Record<string, number> = {
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
  PI: PI_PRICE_USD,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CryptoRate {
  code: string;
  name: string;
  symbol: string;
  icon: string;
  network: string;
  type: string;
  color: string;
  special?: boolean;
  priceUSD: number;
  prices: Record<string, number>; // per-fiat prices
  change24h: number; // percentage
  marketCap: number;
  volume24h: number;
  lastUpdated: number;
}

interface CachedPayload {
  rates: CryptoRate[];
  priceMap: Record<string, number>; // code → USD price
  timestamp: number;
}

// ---------------------------------------------------------------------------
// In-memory cache (module-scope, single-flight)
// ---------------------------------------------------------------------------

let cache: CachedPayload | null = null;
let inflight: Promise<CachedPayload> | null = null;

/**
 * Convert a USD price into a specific fiat currency.
 *
 * CoinGecko's `simple/price?vs_currencies=usd,ngn,...` endpoint returns the
 * price of 1 crypto unit in each supported fiat currency DIRECTLY (e.g.
 * `{ bitcoin: { usd: 62727, ngn: 85348453 } }` means 1 BTC = 85,348,453 NGN).
 *
 * So when `cgDirectPrices[fiat]` is available we use it verbatim. Otherwise
 * we fall back to `usd × FIAT_USD_RATE[fiat]` for currencies CoinGecko
 * doesn't support (XAF, XOF, UGX, ETB, …).
 */
function usdToFiat(
  usd: number,
  fiat: string,
  cgDirectPrices?: Record<string, number>,
): number {
  const f = fiat.toLowerCase();
  if (cgDirectPrices && typeof cgDirectPrices[f] === "number") {
    return cgDirectPrices[f];
  }
  const fallback = FIAT_USD_RATE[fiat.toUpperCase()] ?? FIAT_USD_RATE.USD;
  return usd * fallback;
}

/**
 * Fetch real-time crypto rates from CoinGecko, with a 60s in-memory cache.
 * Returns a `CachedPayload` containing the rates array and a price map.
 *
 * Single-flight: concurrent callers share the same in-flight promise.
 */
export async function getCryptoRates(): Promise<CachedPayload> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(",");
      const vsCurrencies = Array.from(CG_FIATS).join(",");

      // Fire both requests in parallel
      const [priceRes, marketsRes] = await Promise.allSettled([
        fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrencies}&include_24hr_change=true&include_last_updated_at=true`,
          { next: { revalidate: 60 } },
        ),
        fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`,
          { next: { revalidate: 60 } },
        ),
      ]);

      const priceJson =
        priceRes.status === "fulfilled" && priceRes.value.ok
          ? await priceRes.value.json()
          : {};
      const marketsJson =
        marketsRes.status === "fulfilled" && marketsRes.value.ok
          ? await marketsRes.value.json()
          : [];

      // Build a quick lookup for market data by CoinGecko id
      const marketById: Record<
        string,
        {
          market_cap?: number;
          total_volume?: number;
          price_change_percentage_24h?: number;
          current_price?: number;
        }
      > = {};
      if (Array.isArray(marketsJson)) {
        for (const m of marketsJson) {
          if (m?.id) marketById[m.id] = m;
        }
      }

      const rates: CryptoRate[] = [];
      const priceMap: Record<string, number> = {};

      for (const crypto of CRYPTOCURRENCIES) {
        const cgId = COINGECKO_IDS[crypto.code];
        let priceUSD: number;
        let change24h = 0;
        let marketCap = 0;
        let volume24h = 0;
        let cgFiatRates: Record<string, number> | undefined;
        let lastUpdated = now;

        if (crypto.code === "PI") {
          // Pi Network: pre-mainnet, not on CoinGecko
          priceUSD = PI_PRICE_USD;
          change24h = 0;
          marketCap = PI_PRICE_USD * 100_000_000; // ~100M PI circulating (illustrative)
          volume24h = 0;
        } else if (cgId) {
          const p = priceJson[cgId];
          const m = marketById[cgId];
          if (p && typeof p.usd === "number") {
            priceUSD = p.usd;
            cgFiatRates = p;
            change24h = typeof p.usd_24h_change === "number" ? p.usd_24h_change : (m?.price_change_percentage_24h ?? 0);
            marketCap = m?.market_cap ?? 0;
            volume24h = m?.total_volume ?? 0;
            lastUpdated = typeof p.last_updated_at === "number" ? p.last_updated_at * 1000 : now;
          } else if (m && typeof m.current_price === "number") {
            priceUSD = m.current_price;
            change24h = m.price_change_percentage_24h ?? 0;
            marketCap = m.market_cap ?? 0;
            volume24h = m.total_volume ?? 0;
          } else {
            // CoinGecko didn't return this coin — fall back to static
            priceUSD = FALLBACK_PRICES_USD[crypto.code] ?? 0;
          }
        } else {
          priceUSD = FALLBACK_PRICES_USD[crypto.code] ?? 0;
        }

        // Build per-fiat prices for every currency in FIAT_USD_RATE
        const prices: Record<string, number> = {};
        for (const fiat of Object.keys(FIAT_USD_RATE)) {
          prices[fiat] = usdToFiat(priceUSD, fiat, cgFiatRates);
        }

        priceMap[crypto.code] = priceUSD;
        rates.push({
          ...crypto,
          priceUSD,
          prices,
          change24h,
          marketCap,
          volume24h,
          lastUpdated,
        });
      }

      const payload: CachedPayload = {
        rates,
        priceMap,
        timestamp: now,
      };
      cache = payload;
      return payload;
    } catch {
      // Network/JSON error — fall back to static table if no cache exists
      if (cache) return cache;
      const rates: CryptoRate[] = CRYPTOCURRENCIES.map((c) => {
        const priceUSD = FALLBACK_PRICES_USD[c.code] ?? 0;
        const prices: Record<string, number> = {};
        for (const fiat of Object.keys(FIAT_USD_RATE)) {
          prices[fiat] = priceUSD * (FIAT_USD_RATE[fiat] ?? 1);
        }
        return {
          ...c,
          priceUSD,
          prices,
          change24h: 0,
          marketCap: 0,
          volume24h: 0,
          lastUpdated: now,
        };
      });
      const priceMap: Record<string, number> = Object.fromEntries(
        rates.map((r) => [r.code, r.priceUSD]),
      );
      const payload: CachedPayload = { rates, priceMap, timestamp: now };
      cache = payload;
      return payload;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Returns a map of crypto code → USD price, using the same 60s cache as
 * `getCryptoRates`. Convenience helper for routes that don't need the
 * full per-fiat breakdown (e.g. swap/convert/wallets/trade).
 */
export async function getCryptoPriceMap(): Promise<Record<string, number>> {
  const { priceMap } = await getCryptoRates();
  return priceMap;
}

/**
 * Convert `amount` of `from` to `to` using the cached USD price map.
 * Supports crypto↔crypto, crypto↔fiat, and fiat↔fiat.
 *
 * Prefers CoinGecko's direct fiat price (e.g. BTC → NGN straight from the
 * CoinGecko `simple/price` response) when available. Falls back to
 * USD × FIAT_USD_RATE for currencies CoinGecko doesn't support
 * (XAF, XOF, UGX, ETB, …).
 */
export async function convertAmount(
  from: string,
  to: string,
  amount: number,
): Promise<{ rate: number; converted: number; fromType: string; toType: string }> {
  const { rates, priceMap } = await getCryptoRates();
  const fromIsCrypto = priceMap[from] !== undefined;
  const toIsCrypto = priceMap[to] !== undefined;

  let rate: number;
  let converted: number;

  if (fromIsCrypto && toIsCrypto) {
    // crypto → crypto
    const fromPrice = priceMap[from];
    const toPrice = priceMap[to];
    rate = toPrice > 0 ? fromPrice / toPrice : 0; // 1 from = X to
    converted = amount * rate;
  } else if (fromIsCrypto && !toIsCrypto) {
    // crypto → fiat (prefer CoinGecko direct price)
    const r = rates.find((x) => x.code === from);
    const direct = r?.prices?.[to];
    if (typeof direct === "number" && direct > 0) {
      rate = direct; // 1 from = X fiat
    } else {
      const cryptoPriceUSD = priceMap[from];
      const fiatPerUsd = FIAT_USD_RATE[to] ?? 1;
      rate = cryptoPriceUSD * fiatPerUsd;
    }
    converted = amount * rate;
  } else if (!fromIsCrypto && toIsCrypto) {
    // fiat → crypto (prefer CoinGecko direct price via inverse)
    const r = rates.find((x) => x.code === to);
    const direct = r?.prices?.[from];
    if (typeof direct === "number" && direct > 0) {
      rate = 1 / direct; // 1 from = X crypto
    } else {
      const cryptoPriceUSD = priceMap[to];
      const fiatPerUsd = FIAT_USD_RATE[from] ?? 1;
      rate = cryptoPriceUSD > 0 ? 1 / (fiatPerUsd * cryptoPriceUSD) : 0;
    }
    converted = amount * rate;
  } else {
    // fiat → fiat
    const fromFiatPerUsd = FIAT_USD_RATE[from] ?? 1;
    const toFiatPerUsd = FIAT_USD_RATE[to] ?? 1;
    rate = fromFiatPerUsd > 0 ? toFiatPerUsd / fromFiatPerUsd : 0;
    converted = amount * rate;
  }

  return {
    rate,
    converted,
    fromType: fromIsCrypto ? "crypto" : "fiat",
    toType: toIsCrypto ? "crypto" : "fiat",
  };
}

/** Look up the crypto code for a CoinGecko coin id (used in tests/debug) */
export function codeForCoinGeckoId(id: string): string | undefined {
  return COINGECKO_ID_TO_CODE[id];
}
