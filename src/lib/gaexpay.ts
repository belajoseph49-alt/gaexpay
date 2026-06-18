// GaexPay shared utilities & constants

export const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", country: "Nigeria" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", country: "United States" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", country: "European Union" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", country: "United Kingdom" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭", country: "Ghana" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", country: "Kenya" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "🇺🇬", country: "Uganda" },
  { code: "XOF", name: "West African CFA", symbol: "CFA", flag: "🇨🇮", country: "West Africa" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", country: "South Africa" },
] as const;

export const CURRENCY_SYMBOL: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol]),
);

export function formatMoney(amount: number, currency = "NGN"): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function formatCompact(amount: number, currency = "NGN"): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "";
  if (Math.abs(amount) >= 1e9) return `${symbol}${(amount / 1e9).toFixed(2)}B`;
  if (Math.abs(amount) >= 1e6) return `${symbol}${(amount / 1e6).toFixed(2)}M`;
  if (Math.abs(amount) >= 1e3) return `${symbol}${(amount / 1e3).toFixed(1)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// MOBILE MONEY providers
export const MOBILE_MONEY_PROVIDERS = [
  { id: "mtn", name: "MTN MoMo", color: "#FFCC00", textColor: "#000", countries: ["NG", "GH", "UG", "CI", "CM"] },
  { id: "orange", name: "Orange Money", color: "#FF7900", textColor: "#fff", countries: ["CI", "CM", "ML", "SN"] },
  { id: "airtel", name: "Airtel Money", color: "#E40000", textColor: "#fff", countries: ["NG", "UG", "KE", "TZ"] },
  { id: "moov", name: "Moov Money", color: "#005baa", textColor: "#fff", countries: ["CI", "BF"] },
  { id: "mpesa", name: "M-PESA", color: "#43B02A", textColor: "#fff", countries: ["KE", "TZ"] },
  { id: "telecom", name: "Telecel Cash", color: "#0066B3", textColor: "#fff", countries: ["GH"] },
];

export const BANKS = [
  "Access Bank", "GTBank", "Zenith Bank", "UBA", "First Bank", "Stanbic IBTC",
  "Ecobank", "Wema Bank", "Sterling Bank", "Kuda Bank", "Opay", "PalmPay",
  "Standard Chartered", "Fidelity Bank", "Union Bank", "Polaris Bank",
];

export const KYC_TIERS = [
  { tier: 0, name: "Unverified", limit: 0, daily: 0, features: ["Account creation"] },
  { tier: 1, name: "Tier 1", limit: 50000, daily: 50000, features: ["Send & receive up to ₦50k/day", "Airtime & bills"] },
  { tier: 2, name: "Tier 2", limit: 500000, daily: 500000, features: ["Up to ₦500k/day", "Bank transfers", "Virtual card"] },
  { tier: 3, name: "Tier 3", limit: 5000000, daily: 5000000, features: ["Up to ₦5M/day", "International transfers", "Physical card", "Multi-currency"] },
];

export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "yo", name: "Yorùbá", flag: "🇳🇬" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

// Demo user id is stable for this app
export const DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q";
