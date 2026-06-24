/**
 * src/lib/carriers.ts
 *
 * Mobile network carrier catalog + data bundle catalog for GaexPay's
 * Airtime and Data purchase flows.
 *
 * Both lists are SHARED between the server (API routes) and the client
 * (Pay view) so that the UI can render carrier chips + bundle grids
 * without an extra round-trip, and the server can validate a request
 * against the same source of truth.
 *
 * The bundle catalog is also exposed via `GET /api/data/bundles` for
 * clients that want to discover them dynamically (e.g. an SDK or mobile
 * app), but the SPA consumes the export directly for instant rendering.
 */

// ------------------------------------------------------------------
// Carriers
// ------------------------------------------------------------------

export interface Carrier {
  /** Stable lowercase id used in API bodies, e.g. `mtn`, `9mobile`. */
  id: string;
  /** Human brand name, e.g. `MTN`, `9mobile`. */
  name: string;
  /** Brand color hex (used for the carrier chip + receipt accent). */
  color: string;
  /** Text color to layer on top of `color` — `#000` or `#fff`. */
  textColor: string;
  /** ISO-2 country codes where this carrier operates. */
  countries: string[];
  /** ISO 4217 currency code the carrier bills in by default. */
  currency: string;
  /** Short marketing tagline shown under the chip. */
  tagline: string;
}

/**
 * The full carrier roster GaexPay supports for airtime + data. Includes
 * the major networks in our 4 launch markets (Nigeria, Cameroon, Ghana,
 * Kenya) plus a couple of cross-region brands (Orange, Vodafone) so the
 * UI doesn't need to be re-coded the next time we light up a country.
 */
export const CARRIERS: Carrier[] = [
  // Nigeria
  { id: "mtn", name: "MTN", color: "#FFCC00", textColor: "#000", countries: ["NG", "GH", "CM", "UG"], currency: "NGN", tagline: "Everywhere you go" },
  { id: "airtel", name: "Airtel", color: "#E40000", textColor: "#fff", countries: ["NG", "KE", "UG"], currency: "NGN", tagline: "The smartphone network" },
  { id: "glo", name: "Glo", color: "#00A651", textColor: "#fff", countries: ["NG"], currency: "NGN", tagline: "Grandmasters of data" },
  { id: "9mobile", name: "9mobile", color: "#0066B3", textColor: "#fff", countries: ["NG"], currency: "NGN", tagline: "Now you're talking" },
  // Cameroon
  { id: "orange", name: "Orange", color: "#FF7900", textColor: "#fff", countries: ["CM", "CI", "ML", "SN"], currency: "XAF", tagline: "Avec Orange, on est plus fort" },
  { id: "nexttel", name: "Nexttel", color: "#00875A", textColor: "#fff", countries: ["CM"], currency: "XAF", tagline: "Construire le Cameroun de demain" },
  // Ghana
  { id: "vodafone", name: "Vodafone", color: "#E60000", textColor: "#fff", countries: ["GH"], currency: "GHS", tagline: "Power to you" },
  // Kenya
  { id: "safaricom", name: "Safaricom", color: "#4CAF50", textColor: "#fff", countries: ["KE"], currency: "KES", tagline: "The better option" },
];

/** Lookup helper — returns `undefined` for unknown carrier ids. */
export function getCarrier(id: string): Carrier | undefined {
  return CARRIERS.find((c) => c.id === id);
}

/**
 * Detect a Nigerian network from a phone number prefix.
 *
 * Accepts any of:
 *   - `0803XXXXXXXX` (local)
 *   - `+234803XXXXXXXX` (E.164)
 *   - `234803XXXXXXXX` (E.164 without +)
 *
 * Returns the lowercase carrier id (`mtn`, `airtel`, `glo`, `9mobile`)
 * or `""` when the prefix isn't recognised.
 */
export function detectNetwork(phone: string): string {
  if (!phone) return "";
  const num = phone.replace(/\D/g, "");
  // Normalise to the local form `0803XXXXXXXX`.
  let local = num;
  if (local.startsWith("234")) local = "0" + local.slice(3);
  if (local.startsWith("0") === false) return "";

  const p = (prefix: string) => local.startsWith(prefix);

  if (
    p("0803") || p("0806") || p("0703") || p("0706") ||
    p("0813") || p("0816") || p("0810") || p("0814") ||
    p("0903") || p("0906") || p("0913") || p("0916")
  ) return "mtn";

  if (
    p("0802") || p("0808") || p("0708") || p("0812") ||
    p("0701") || p("0901") || p("0902") || p("0904") ||
    p("0912")
  ) return "airtel";

  if (
    p("0805") || p("0807") || p("0705") || p("0811") ||
    p("0815") || p("0905") || p("0915")
  ) return "glo";

  if (
    p("0809") || p("0817") || p("0818") || p("0908") || p("0909")
  ) return "9mobile";

  return "";
}

/**
 * Normalise a phone number to E.164 (with leading +) when possible.
 * Falls back to returning the digits as-is so the receipt still shows
 * something meaningful for non-NG numbers.
 */
export function normalizePhone(phone: string): string {
  const num = (phone || "").replace(/\D/g, "");
  if (!num) return "";
  if (num.startsWith("234") && num.length === 13) return "+" + num;
  if (num.startsWith("0") && num.length === 11) return "+234" + num.slice(1);
  if (num.length >= 10 && num.length <= 15) return "+" + num;
  return num;
}

/** Basic format check used by the API to reject junk input. */
export function isValidPhone(phone: string): boolean {
  const num = (phone || "").replace(/\D/g, "");
  // NG: 11 (0...) or 13 (234...)
  if (num.length === 11 && num.startsWith("0")) return true;
  if (num.length === 13 && num.startsWith("234")) return true;
  // Generic E.164
  return num.length >= 10 && num.length <= 15;
}

// ------------------------------------------------------------------
// Data bundles
// ------------------------------------------------------------------

export type BundleValidity = "daily" | "weekly" | "monthly";

export interface DataBundle {
  /** Globally-unique bundle id — prefixed with the carrier id so the
   *  same plan size on two carriers has two distinct ids. */
  id: string;
  /** Carrier id this bundle belongs to (matches `Carrier.id`). */
  network: string;
  /** Marketing name, e.g. "Daily Data 1GB". */
  name: string;
  /** Size in MB. 1024 MB = 1 GB. */
  sizeMB: number;
  /** Validity bucket. */
  validity: BundleValidity;
  /** Human-readable validity, e.g. "1 day", "30 days". */
  validityLabel: string;
  /** Price in the bundle's native currency (NGN base — converted by
   *  the API/UI via the existing `useFormatMoney` helper). */
  price: number;
  /** ISO 4217 currency code for `price`. */
  currency: string;
  /** Optional marketing note shown on the card. */
  tag?: string;
}

/**
 * Master bundle catalog. Prices are stored in NGN as the base currency
 * (the `useFormatMoney` hook converts NGN → the user's preferred
 * currency on the client, and the `/api/data` route converts when it
 * actually debits the wallet).
 *
 * The catalog is intentionally carrier-agnostic at the *plan* level —
 * the same daily / weekly / monthly tiers are offered by every network
 * (matches the real-world situation in Nigeria where MTN, Airtel, Glo,
 * 9mobile all sell 100MB / 350MB / 1GB / 2GB / 5GB / 10GB / 25GB / 75GB
 * / 100GB plans at near-identical price points). The bundle `id` is
 * prefixed with the carrier so the same plan on two networks has two
 * distinct ids and the API can resolve a request unambiguously.
 */
const BASE_PLANS: Omit<DataBundle, "id" | "network">[] = [
  // ---- Daily ----
  { name: "Daily 100MB", sizeMB: 100, validity: "daily", validityLabel: "1 day", price: 100, currency: "NGN" },
  { name: "Daily 350MB", sizeMB: 350, validity: "daily", validityLabel: "1 day", price: 200, currency: "NGN", tag: "Popular" },
  { name: "Daily 1GB", sizeMB: 1024, validity: "daily", validityLabel: "1 day", price: 350, currency: "NGN" },
  // ---- Weekly ----
  { name: "Weekly 2GB", sizeMB: 2048, validity: "weekly", validityLabel: "7 days", price: 500, currency: "NGN", tag: "Best value" },
  { name: "Weekly 5GB", sizeMB: 5120, validity: "weekly", validityLabel: "7 days", price: 1500, currency: "NGN" },
  // ---- Monthly ----
  { name: "Monthly 10GB", sizeMB: 10240, validity: "monthly", validityLabel: "30 days", price: 3500, currency: "NGN" },
  { name: "Monthly 25GB", sizeMB: 25600, validity: "monthly", validityLabel: "30 days", price: 6500, currency: "NGN", tag: "Popular" },
  { name: "Monthly 75GB", sizeMB: 76800, validity: "monthly", validityLabel: "30 days", price: 15000, currency: "NGN" },
  { name: "Monthly 100GB", sizeMB: 102400, validity: "monthly", validityLabel: "30 days", price: 19000, currency: "NGN", tag: "Mega" },
];

/**
 * Build the full bundle catalog: every plan × every carrier that
 * supports data (all of them in this roster).
 */
export const DATA_BUNDLES: DataBundle[] = CARRIERS.flatMap((c) =>
  BASE_PLANS.map((p) => ({
    ...p,
    id: `${c.id}-${p.sizeMB}mb-${p.validity}`,
    network: c.id,
  })),
);

/** Lookup a bundle by id — used by the API to validate a purchase. */
export function getBundle(id: string): DataBundle | undefined {
  return DATA_BUNDLES.find((b) => b.id === id);
}

/** Group all bundles by carrier id, for the `/api/data/bundles` route. */
export function bundlesByNetwork(): Record<string, DataBundle[]> {
  const out: Record<string, DataBundle[]> = {};
  for (const carrier of CARRIERS) {
    out[carrier.id] = DATA_BUNDLES.filter((b) => b.network === carrier.id);
  }
  return out;
}

/** Custom-bundle price calculator (in NGN). 1 MB ≈ ₦0.45, rounded to
 *  the nearest ₦10. Floor of ₦50 so a 1 MB custom plan still costs
 *  something to process. */
export function customBundlePrice(sizeMB: number): number {
  if (!sizeMB || sizeMB <= 0) return 0;
  const raw = sizeMB * 0.45;
  const rounded = Math.round(raw / 10) * 10;
  return Math.max(50, rounded);
}

/** Format a size (MB) as a human-readable string, e.g. `1 GB`, `350 MB`. */
export function formatDataSize(sizeMB: number): string {
  if (sizeMB >= 1024) {
    const gb = sizeMB / 1024;
    return `${gb % 1 === 0 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }
  return `${sizeMB} MB`;
}
