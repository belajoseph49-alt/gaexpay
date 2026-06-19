// GaexPay shared utilities & constants

export const CURRENCIES = [
  // African currencies
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬", country: "Nigeria", type: "fiat" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭", country: "Ghana", type: "fiat" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪", country: "Kenya", type: "fiat" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "🇺🇬", country: "Uganda", type: "fiat" },
  { code: "XOF", name: "West African CFA Franc", symbol: "CFA", flag: "🇨🇮", country: "West Africa (UEMOA)", type: "fiat" },
  { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", flag: "🇨🇲", country: "Central Africa (CEMAC)", type: "fiat" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", country: "South Africa", type: "fiat" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", flag: "🇪🇹", country: "Ethiopia", type: "fiat" },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF", flag: "🇷🇼", country: "Rwanda", type: "fiat" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "🇹🇿", country: "Tanzania", type: "fiat" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬", country: "Egypt", type: "fiat" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH", flag: "🇲🇦", country: "Morocco", type: "fiat" },
  { code: "DZD", name: "Algerian Dinar", symbol: "DA", flag: "🇩🇿", country: "Algeria", type: "fiat" },
  { code: "TND", name: "Tunisian Dinar", symbol: "DT", flag: "🇹🇳", country: "Tunisia", type: "fiat" },
  { code: "BIF", name: "Burundian Franc", symbol: "FBu", flag: "🇧🇮", country: "Burundi", type: "fiat" },
  { code: "CDF", name: "Congolese Franc", symbol: "FC", flag: "🇨🇩", country: "DR Congo", type: "fiat" },
  { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", flag: "🇦🇴", country: "Angola", type: "fiat" },
  { code: "MZN", name: "Mozambican Metical", symbol: "MT", flag: "🇲🇿", country: "Mozambique", type: "fiat" },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", flag: "🇿🇲", country: "Zambia", type: "fiat" },
  { code: "BWP", name: "Botswana Pula", symbol: "P", flag: "🇧🇼", country: "Botswana", type: "fiat" },
  // International currencies
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", country: "United States", type: "fiat" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", country: "European Union", type: "fiat" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", country: "United Kingdom", type: "fiat" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", country: "China", type: "fiat" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", country: "Japan", type: "fiat" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", country: "Canada", type: "fiat" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", country: "Australia", type: "fiat" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", flag: "🇨🇭", country: "Switzerland", type: "fiat" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", country: "UAE", type: "fiat" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦", country: "Saudi Arabia", type: "fiat" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", country: "India", type: "fiat" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", country: "Brazil", type: "fiat" },
] as const;

// Cryptocurrencies supported by GaexPay
export const CRYPTOCURRENCIES = [
  // Stablecoins
  { code: "USDT", name: "Tether USD", symbol: "₮", icon: "💵", network: "TRC-20 / ERC-20", type: "stablecoin", color: "#26A17B" },
  { code: "USDC", name: "USD Coin", symbol: "₮", icon: "💵", network: "ERC-20 / Polygon", type: "stablecoin", color: "#2775CA" },
  { code: "BUSD", name: "Binance USD", symbol: "₮", icon: "💵", network: "BEP-20 / ERC-20", type: "stablecoin", color: "#F0B90B" },
  { code: "DAI", name: "Dai", symbol: "◈", icon: "💵", network: "ERC-20", type: "stablecoin", color: "#F5AC37" },
  // Major coins
  { code: "BTC", name: "Bitcoin", symbol: "₿", icon: "🪙", network: "Bitcoin", type: "coin", color: "#F7931A" },
  { code: "ETH", name: "Ethereum", symbol: "Ξ", icon: "💎", network: "ERC-20", type: "coin", color: "#627EEA" },
  { code: "BNB", name: "BNB", symbol: "⬡", icon: "🟡", network: "BEP-20", type: "coin", color: "#F0B90B" },
  { code: "SOL", name: "Solana", symbol: "◎", icon: "🌞", network: "Solana", type: "coin", color: "#9945FF" },
  { code: "XRP", name: "Ripple", symbol: "✕", icon: "💧", network: "Ripple", type: "coin", color: "#23292F" },
  { code: "ADA", name: "Cardano", symbol: "₳", icon: "🔵", network: "Cardano", type: "coin", color: "#0033AD" },
  { code: "DOT", name: "Polkadot", symbol: "●", icon: "🔴", network: "Polkadot", type: "coin", color: "#E6007A" },
  { code: "MATIC", name: "Polygon", symbol: "🟣", icon: "🔺", network: "Polygon", type: "coin", color: "#8247E5" },
  { code: "LTC", name: "Litecoin", symbol: "Ł", icon: "🪙", network: "Litecoin", type: "coin", color: "#345D9D" },
  { code: "TRX", name: "TRON", symbol: "Ṫ", icon: "🔴", network: "TRC-20", type: "coin", color: "#FF060A" },
  // Special: Pi Network
  { code: "PI", name: "Pi Network", symbol: "π", icon: "🟣", network: "Pi Network", type: "coin", color: "#8B5CF6", special: true },
] as const;

export const ALL_CURRENCIES = [...CURRENCIES, ...CRYPTOCURRENCIES] as const;

export const CURRENCY_SYMBOL: Record<string, string> = Object.fromEntries(
  ALL_CURRENCIES.map((c) => [c.code, c.symbol]),
);

export function formatMoney(amount: number, currency = "NGN"): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? "";
  const isCrypto = CRYPTOCURRENCIES.some((c) => c.code === currency);
  const decimals = isCrypto && currency !== "USDT" && currency !== "USDC" && currency !== "BUSD" && currency !== "DAI" ? 6 : 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals === 6 ? 4 : 2,
    maximumFractionDigits: decimals,
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
  { id: "mtn", name: "MTN MoMo", color: "#FFCC00", textColor: "#000", countries: ["NG", "GH", "UG", "CI", "CM", "RW", "ZM"] },
  { id: "orange", name: "Orange Money", color: "#FF7900", textColor: "#fff", countries: ["CI", "CM", "ML", "SN", "BF", "EG"] },
  { id: "airtel", name: "Airtel Money", color: "#E40000", textColor: "#fff", countries: ["NG", "UG", "KE", "TZ", "RW", "ZM"] },
  { id: "moov", name: "Moov Money", color: "#005baa", textColor: "#fff", countries: ["CI", "BF", "TG"] },
  { id: "mpesa", name: "M-PESA", color: "#43B02A", textColor: "#fff", countries: ["KE", "TZ", "CD", "GH"] },
  { id: "telecom", name: "Telecel Cash", color: "#0066B3", textColor: "#fff", countries: ["GH", "ML"] },
  { id: "wave", name: "Wave", color: "#1DC8FF", textColor: "#fff", countries: ["SN", "CI", "ML", "UG"] },
  { id: "moovafrik", name: "Moov Africa", color: "#005baa", textColor: "#fff", countries: ["CI", "BF", "TG", "ML"] },
  { id: "zmoney", name: "Zamtel Money", color: "#E4002B", textColor: "#fff", countries: ["ZM"] },
  { id: "halopesa", name: "HaloPesa", color: "#6C2B8C", textColor: "#fff", countries: ["TZ"] },
  { id: "tigopesa", name: "Tigo Pesa", color: "#0066B3", textColor: "#fff", countries: ["TZ"] },
  { id: "easypaisa", name: "Easypaisa", color: "#00B14F", textColor: "#fff", countries: ["EG"] },
];

export const BANKS = [
  // Nigeria
  "Access Bank", "GTBank", "Zenith Bank", "UBA", "First Bank", "Stanbic IBTC",
  "Ecobank", "Wema Bank", "Sterling Bank", "Kuda Bank", "Opay", "PalmPay",
  "Standard Chartered", "Fidelity Bank", "Union Bank", "Polaris Bank",
  "Unity Bank", "Keystone Bank", "Titan Trust Bank", "SunTrust Bank",
  // Ghana
  "GCB Bank", "Absa Bank Ghana", "Stanbic Bank Ghana", "CalBank", "ADB Bank",
  // Kenya
  "KCB Bank", "Equity Bank Kenya", "Co-op Bank Kenya", "NCBA Bank", "I&M Bank",
  // South Africa
  "FNB", "ABSA", "Nedbank", "Capitec Bank", "Standard Bank SA",
  // Egypt
  "CIB Egypt", "National Bank of Egypt", "QNB Alahli", "Banque Misr",
  // Morocco
  "Attijariwafa Bank", "Banque Populaire", "BMCE Bank", "CIH Bank",
  // Cameroon / CEMAC
  "Afriland First Bank", "BICEC", "SCB Cameroun", "Société Générale Cameroun", "UBC",
  // Côte d'Ivoire / UEMOA
  "Société Générale CI", "BICICI", "Ecobank CI", "Banque Atlantique CI", "Coris Bank",
  // Senegal
  "Société Générale Sénégal", "CBAO", "Banque Atlantique Sénégal", "Ecobank Sénégal",
  // Uganda
  "Stanbic Bank Uganda", "Centenary Bank", "DFCU Bank", "Bank of Africa Uganda",
  // Tanzania
  "CRDB Bank", "NMB Bank", "NBC Bank", "Exim Bank Tanzania",
  // Ethiopia
  "Commercial Bank of Ethiopia", "Dashen Bank", "Awash Bank", "Bank of Abyssinia",
  // Rwanda
  "Bank of Kigali", "I&M Bank Rwanda", "Equity Bank Rwanda", "Cogebanque",
  // International
  "Citibank", "HSBC", "Deutsche Bank", "BNP Paribas", "Société Générale", "Barclays",
  "JPMorgan Chase", "Bank of America", "Wells Fargo", "Industrial and Commercial Bank of China (ICBC)",
];

// Supported countries with full details
export const COUNTRIES = [
  // West Africa
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", phonePrefix: "+234" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", currency: "GHS", phonePrefix: "+233" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF", phonePrefix: "+225" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", currency: "XOF", phonePrefix: "+221" },
  { code: "ML", name: "Mali", flag: "🇲🇱", currency: "XOF", phonePrefix: "+223" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "XOF", phonePrefix: "+226" },
  { code: "TG", name: "Togo", flag: "🇹🇬", currency: "XOF", phonePrefix: "+228" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "XOF", phonePrefix: "+229" },
  { code: "NE", name: "Niger", flag: "🇳🇪", currency: "XOF", phonePrefix: "+227" },
  // Central Africa
  { code: "CM", name: "Cameroon", flag: "🇨🇲", currency: "XAF", phonePrefix: "+237" },
  { code: "GA", name: "Gabon", flag: "🇬🇦", currency: "XAF", phonePrefix: "+241" },
  { code: "CG", name: "Congo", flag: "🇨🇬", currency: "XAF", phonePrefix: "+242" },
  { code: "CD", name: "DR Congo", flag: "🇨🇩", currency: "CDF", phonePrefix: "+243" },
  { code: "TD", name: "Chad", flag: "🇹🇩", currency: "XAF", phonePrefix: "+235" },
  { code: "CF", name: "Central African Republic", flag: "🇨🇫", currency: "XAF", phonePrefix: "+236" },
  { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶", currency: "XAF", phonePrefix: "+240" },
  // East Africa
  { code: "KE", name: "Kenya", flag: "🇰🇪", currency: "KES", phonePrefix: "+254" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", currency: "UGX", phonePrefix: "+256" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", currency: "TZS", phonePrefix: "+255" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", currency: "RWF", phonePrefix: "+250" },
  { code: "BI", name: "Burundi", flag: "🇧🇮", currency: "BIF", phonePrefix: "+257" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", currency: "ETB", phonePrefix: "+251" },
  // Southern Africa
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR", phonePrefix: "+27" },
  { code: "ZM", name: "Zambia", flag: "🇿🇲", currency: "ZMW", phonePrefix: "+260" },
  { code: "BW", name: "Botswana", flag: "🇧🇼", currency: "BWP", phonePrefix: "+267" },
  { code: "AO", name: "Angola", flag: "🇦🇴", currency: "AOA", phonePrefix: "+244" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", currency: "MZN", phonePrefix: "+258" },
  // North Africa
  { code: "EG", name: "Egypt", flag: "🇪🇬", currency: "EGP", phonePrefix: "+20" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", currency: "MAD", phonePrefix: "+212" },
  { code: "DZ", name: "Algeria", flag: "🇩🇿", currency: "DZD", phonePrefix: "+213" },
  { code: "TN", name: "Tunisia", flag: "🇹🇳", currency: "TND", phonePrefix: "+216" },
  // International
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", phonePrefix: "+1" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", phonePrefix: "+44" },
  { code: "EU", name: "European Union", flag: "🇪🇺", currency: "EUR", phonePrefix: "+33" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY", phonePrefix: "+86" },
  { code: "AE", name: "UAE", flag: "🇦🇪", currency: "AED", phonePrefix: "+971" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", phonePrefix: "+966" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", phonePrefix: "+1" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", phonePrefix: "+61" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", currency: "CHF", phonePrefix: "+41" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY", phonePrefix: "+81" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", phonePrefix: "+91" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL", phonePrefix: "+55" },
];

// Extended bill categories — GaexPay pays EVERYTHING
export const BILL_CATEGORIES = [
  // Utilities
  { id: "electricity", label: "Electricity", icon: "⚡", color: "amber", desc: "Power bills & prepaid meters" },
  { id: "water", label: "Water", icon: "💧", color: "sky", desc: "Water utility bills" },
  { id: "gas", label: "Gas", icon: "🔥", color: "orange", desc: "Natural gas bills" },
  { id: "internet", label: "Internet", icon: "🌐", color: "violet", desc: "ISP & broadband" },
  { id: "tv", label: "TV / Cable", icon: "📺", color: "rose", desc: "DSTV, GOtv, Startimes" },
  { id: "phone", label: "Phone / Landline", icon: "☎️", color: "teal", desc: "Fixed line bills" },
  // Government & Taxes
  { id: "taxes", label: "Taxes & Impôts", icon: "🧾", color: "slate", desc: "Income tax, VAT, property tax" },
  { id: "customs", label: "Customs / Douane", icon: "📦", color: "amber", desc: "Import duties & customs clearance" },
  { id: "fines", label: "Fines & Penalties", icon: "⚠️", color: "rose", desc: "Traffic fines, court penalties" },
  { id: "permits", label: "Permits & Licenses", icon: "📜", color: "violet", desc: "Business permits, driving license" },
  { id: "social", label: "Social Security", icon: "🏥", color: "emerald", desc: "CNPS, NSSF, social insurance" },
  // Education
  { id: "university", label: "University Fees", icon: "🎓", color: "violet", desc: "Tuition & university payments" },
  { id: "college", label: "College Fees", icon: "📚", color: "sky", desc: "College tuition payments" },
  { id: "school", label: "School Fees", icon: "🏫", color: "amber", desc: "Primary & secondary school" },
  { id: "exams", label: "Exam Fees", icon: "📝", color: "teal", desc: "JAMB, WAEC, GCE, BAC exam fees" },
  // Financial
  { id: "loan", label: "Loan Repayment", icon: "💰", color: "emerald", desc: "Bank loans & microfinance" },
  { id: "insurance", label: "Insurance", icon: "🛡️", color: "sky", desc: "Auto, health, life insurance" },
  { id: "mortgage", label: "Mortgage", icon: "🏠", color: "orange", desc: "Home loan payments" },
  // Transport
  { id: "fuel", label: "Fuel", icon: "⛽", color: "rose", desc: "Petrol & diesel" },
  { id: "toll", label: "Toll & Parking", icon: "🅿️", color: "slate", desc: "Toll gates & parking fees" },
  { id: "transport", label: "Transport Pass", icon: "🚌", color: "teal", desc: "Monthly transit passes" },
  // Entertainment
  { id: "streaming", label: "Streaming", icon: "🎬", color: "rose", desc: "Netflix, Spotify, Disney+" },
  { id: "gaming", label: "Gaming", icon: "🎮", color: "violet", desc: "Xbox, PlayStation, Steam" },
  // Health
  { id: "health", label: "Health & Medical", icon: "💊", color: "emerald", desc: "Hospital bills & pharmacy" },
  { id: "gym", label: "Gym & Fitness", icon: "💪", color: "amber", desc: "Gym memberships" },
  // Other
  { id: "betting", label: "Betting & Lottery", icon: "🎰", color: "orange", desc: "Sports betting & lottery" },
  { id: "donations", label: "Donations & Charity", icon: "❤️", color: "rose", desc: "Charitable contributions" },
  { id: "rent", label: "Rent", icon: "🔑", color: "slate", desc: "Monthly rent payments" },
  { id: "other", label: "Other Bills", icon: "📄", color: "muted", desc: "Any other payment" },
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
