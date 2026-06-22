/**
 * src/lib/system-settings.ts
 *
 * Helpers for the SystemSetting Prisma model — used by all the new
 * Compliance/Platform admin sections to persist configuration as
 * key/value pairs (with JSON-encoded complex values).
 */

import { db } from "@/lib/db";

/**
 * Read a single setting by key. Returns `null` if the key doesn't exist.
 */
export async function getSetting<T = unknown>(
  key: string,
): Promise<T | null> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  if (!row) return null;
  return parseValue<T>(row.value);
}

/**
 * Read multiple settings by category. Returns an object keyed by setting key.
 */
export async function getSettingsByCategory<T = unknown>(
  category: string,
): Promise<Record<string, T>> {
  const rows = await db.systemSetting.findMany({ where: { category } });
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    out[row.key] = parseValue(row.value);
  }
  return out as Record<string, T>;
}

/**
 * Upsert a setting by key. `value` is JSON-stringified if it isn't already
 * a string.
 */
export async function setSetting(
  key: string,
  value: unknown,
  category = "general",
): Promise<void> {
  const serialized =
    typeof value === "string" ? value : JSON.stringify(value);
  await db.systemSetting.upsert({
    where: { key },
    update: { value: serialized, category },
    create: { key, value: serialized, category },
  });
}

/**
 * Upsert multiple settings in one transaction.
 */
export async function setSettings(
  entries: { key: string; value: unknown; category?: string }[],
): Promise<void> {
  await db.$transaction(
    entries.map((e) =>
      db.systemSetting.upsert({
        where: { key: e.key },
        update: {
          value: typeof e.value === "string" ? e.value : JSON.stringify(e.value),
          category: e.category ?? "general",
        },
        create: {
          key: e.key,
          value: typeof e.value === "string" ? e.value : JSON.stringify(e.value),
          category: e.category ?? "general",
        },
      }),
    ),
  );
}

function parseValue<T>(raw: string): T {
  if (raw === "") return "" as unknown as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

/**
 * Default AML rules — used the first time the AML section is opened.
 */
export const DEFAULT_AML_RULES = [
  {
    id: "rule_threshold_amount",
    name: "Large Transaction Threshold",
    description: "Flag transactions above this amount for review.",
    type: "threshold",
    threshold: 5_000_000,
    currency: "NGN",
    severity: "high",
    enabled: true,
  },
  {
    id: "rule_velocity_check",
    name: "Velocity Check (5 transactions / 10 min)",
    description: "Flag users making more than 5 transactions in 10 minutes.",
    type: "velocity",
    threshold: 5,
    windowMinutes: 10,
    severity: "medium",
    enabled: true,
  },
  {
    id: "rule_geo_restriction",
    name: "Geo-Restriction (High-Risk Countries)",
    description: "Block transactions originating from sanctioned countries.",
    type: "geo_restriction",
    countries: ["IR", "KP", "SY", "CU"],
    severity: "high",
    enabled: true,
  },
  {
    id: "rule_structuring",
    name: "Structuring Detection",
    description: "Detect multiple sub-threshold transactions to evade reporting.",
    type: "structuring",
    threshold: 10,
    windowHours: 24,
    severity: "high",
    enabled: true,
  },
  {
    id: "rule_rapid_movement",
    name: "Rapid Funds Movement",
    description: "Flag funds that move out within 1 hour of deposit.",
    type: "rapid_movement",
    windowMinutes: 60,
    severity: "medium",
    enabled: false,
  },
];

/**
 * Default KYC tier configs — for personal and business accounts.
 */
export const DEFAULT_KYC_TIERS = {
  personal: [
    { tier: 0, name: "Unverified", dailyLimit: 0, monthlyLimit: 0, singleTxLimit: 0, maxBalance: 0, withdrawalLimit: 0, internationalLimit: 0, features: ["Account creation"] },
    { tier: 1, name: "Basic", dailyLimit: 50_000, monthlyLimit: 200_000, singleTxLimit: 50_000, maxBalance: 200_000, withdrawalLimit: 20_000, internationalLimit: 0, features: ["Send & receive up to ₦50k/day", "Airtime & bills"] },
    { tier: 2, name: "Standard", dailyLimit: 500_000, monthlyLimit: 2_000_000, singleTxLimit: 500_000, maxBalance: 2_000_000, withdrawalLimit: 200_000, internationalLimit: 0, features: ["Up to ₦500k/day", "Bank transfers", "Virtual card"] },
    { tier: 3, name: "Premium", dailyLimit: 5_000_000, monthlyLimit: 20_000_000, singleTxLimit: 5_000_000, maxBalance: 50_000_000, withdrawalLimit: 1_000_000, internationalLimit: 10_000, features: ["Up to ₦5M/day", "International transfers", "Physical card", "Multi-currency"] },
  ],
  business: [
    { tier: 0, name: "Unverified", dailyLimit: 0, monthlyLimit: 0, singleTxLimit: 0, maxBalance: 0, withdrawalLimit: 0, internationalLimit: 0, features: ["Account creation"] },
    { tier: 1, name: "Starter", dailyLimit: 500_000, monthlyLimit: 2_000_000, singleTxLimit: 500_000, maxBalance: 5_000_000, withdrawalLimit: 200_000, internationalLimit: 0, features: ["Up to ₦500k/day", "Pay vendors"] },
    { tier: 2, name: "Growth", dailyLimit: 5_000_000, monthlyLimit: 20_000_000, singleTxLimit: 5_000_000, maxBalance: 50_000_000, withdrawalLimit: 1_000_000, internationalLimit: 50_000, features: ["Up to ₦5M/day", "Bulk payments", "API access"] },
    { tier: 3, name: "Enterprise", dailyLimit: 50_000_000, monthlyLimit: 200_000_000, singleTxLimit: 50_000_000, maxBalance: 500_000_000, withdrawalLimit: 10_000_000, internationalLimit: 500_000, features: ["Up to ₦50M/day", "Unlimited international", "Dedicated manager", "Treasury services"] },
  ],
};

/**
 * Default treasury wallets.
 */
export const DEFAULT_TREASURY_WALLETS = [
  { id: "tw_ngn_op", currency: "NGN", balance: 1_250_000_000, provider: "Access Bank", type: "operating" },
  { id: "tw_ngn_rs", currency: "NGN", balance: 3_500_000_000, provider: "GTBank", type: "reserve" },
  { id: "tw_usd_op", currency: "USD", balance: 850_000, provider: "Citibank", type: "operating" },
  { id: "tw_usd_rs", currency: "USD", balance: 2_400_000, provider: "Standard Chartered", type: "reserve" },
  { id: "tw_ghs_op", currency: "GHS", balance: 1_200_000, provider: "GCB Bank", type: "operating" },
  { id: "tw_kes_op", currency: "KES", balance: 4_800_000, provider: "KCB Bank", type: "operating" },
  { id: "tw_usdt_op", currency: "USDT", balance: 320_000, provider: "Binance Treasury", type: "liquidity" },
  { id: "tw_btc_cold", currency: "BTC", balance: 12.5, provider: "Coinbase Custody", type: "reserve" },
];

/**
 * Default transfer corridors.
 */
export const DEFAULT_CORRIDORS = [
  { id: "corr_ngn_ghs", fromCountry: "NG", toCountry: "GH", fromCurrency: "NGN", toCurrency: "GHS", minAmount: 1_000, maxAmount: 5_000_000, feePercent: 1.5, fixedFee: 100, etaHours: 24, partnerBank: "Ecobank", enabled: true, volume30d: 142_000_000 },
  { id: "corr_ngn_ken", fromCountry: "NG", toCountry: "KE", fromCurrency: "NGN", toCurrency: "KES", minAmount: 1_000, maxAmount: 5_000_000, feePercent: 1.8, fixedFee: 150, etaHours: 24, partnerBank: "KCB Bank", enabled: true, volume30d: 88_500_000 },
  { id: "corr_ngn_usd", fromCountry: "NG", toCountry: "US", fromCurrency: "NGN", toCurrency: "USD", minAmount: 10_000, maxAmount: 10_000_000, feePercent: 2.5, fixedFee: 500, etaHours: 48, partnerBank: "Citibank", enabled: true, volume30d: 215_000_000 },
  { id: "corr_ghs_ngn", fromCountry: "GH", toCountry: "NG", fromCurrency: "GHS", toCurrency: "NGN", minAmount: 5, maxAmount: 50_000, feePercent: 1.5, fixedFee: 0.5, etaHours: 24, partnerBank: "Ecobank", enabled: true, volume30d: 36_200_000 },
  { id: "corr_ken_ngn", fromCountry: "KE", toCountry: "NG", fromCurrency: "KES", toCurrency: "NGN", minAmount: 50, maxAmount: 500_000, feePercent: 1.8, fixedFee: 20, etaHours: 24, partnerBank: "KCB Bank", enabled: true, volume30d: 28_900_000 },
  { id: "corr_ngn_gbp", fromCountry: "NG", toCountry: "GB", fromCurrency: "NGN", toCurrency: "GBP", minAmount: 10_000, maxAmount: 5_000_000, feePercent: 2.8, fixedFee: 600, etaHours: 72, partnerBank: "Barclays", enabled: false, volume30d: 14_300_000 },
  { id: "corr_ngn_eur", fromCountry: "NG", toCountry: "EU", fromCurrency: "NGN", toCurrency: "EUR", minAmount: 10_000, maxAmount: 7_000_000, feePercent: 2.6, fixedFee: 550, etaHours: 48, partnerBank: "BNP Paribas", enabled: true, volume30d: 42_700_000 },
  { id: "corr_xof_ngn", fromCountry: "CI", toCountry: "NG", fromCurrency: "XOF", toCurrency: "NGN", minAmount: 5_000, maxAmount: 10_000_000, feePercent: 1.4, fixedFee: 500, etaHours: 24, partnerBank: "Ecobank CI", enabled: true, volume30d: 19_800_000 },
];

/**
 * Default communication templates (email / SMS / push).
 */
export const DEFAULT_TEMPLATES = {
  email: [
    { id: "tpl_welcome", name: "Welcome Email", subject: "Welcome to GaexPay, {{firstName}}! 🎉", body: "Hi {{firstName}},\n\nWelcome to GaexPay — borderless money, built for Africa. Your account is ready.\n\nGet started by completing your KYC verification to unlock all features.\n\nBest,\nThe GaexPay Team", variables: ["firstName"], status: "active" },
    { id: "tpl_kyc_approved", name: "KYC Approved", subject: "Your identity has been verified ✓", body: "Hi {{firstName}},\n\nGreat news! Your KYC verification has been approved. You now have access to {{tierName}} features.\n\nDaily transfer limit: {{dailyLimit}}\n\nBest,\nThe GaexPay Team", variables: ["firstName", "tierName", "dailyLimit"], status: "active" },
    { id: "tpl_kyc_rejected", name: "KYC Rejected", subject: "Action needed: KYC verification", body: "Hi {{firstName}},\n\nWe were unable to verify your identity. Reason: {{reason}}\n\nPlease re-submit your documents from the app.\n\nBest,\nThe GaexPay Team", variables: ["firstName", "reason"], status: "active" },
    { id: "tpl_deposit", name: "Deposit Confirmation", subject: "Deposit received: {{amount}} {{currency}}", body: "Hi {{firstName}},\n\nWe've received your deposit of {{amount}} {{currency}}.\n\nYour new balance is {{balance}} {{currency}}.\n\nBest,\nThe GaexPay Team", variables: ["firstName", "amount", "currency", "balance"], status: "active" },
    { id: "tpl_password_reset", name: "Password Reset", subject: "Reset your GaexPay password", body: "Hi {{firstName}},\n\nUse this code to reset your password: {{resetCode}}\n\nThe code expires in 15 minutes. If you didn't request this, please ignore this email.\n\nBest,\nThe GaexPay Team", variables: ["firstName", "resetCode"], status: "active" },
    { id: "tpl_suspicious", name: "Suspicious Activity Alert", subject: "Suspicious activity on your account", body: "Hi {{firstName}},\n\nWe detected unusual activity on your account. If this wasn't you, please contact support immediately.\n\nActivity: {{activityDescription}}\nTime: {{timestamp}}\n\nBest,\nThe GaexPay Team", variables: ["firstName", "activityDescription", "timestamp"], status: "active" },
  ],
  sms: [
    { id: "sms_otp", name: "Login OTP", body: "Your GaexPay verification code is {{otpCode}}. It expires in 5 minutes. Do not share this code with anyone.", variables: ["otpCode"], status: "active" },
    { id: "sms_deposit", name: "Deposit Alert", body: "GaexPay: You received {{amount}} {{currency}} from {{sender}}. New balance: {{balance}} {{currency}}.", variables: ["amount", "currency", "sender", "balance"], status: "active" },
    { id: "sms_withdrawal", name: "Withdrawal Alert", body: "GaexPay: {{amount}} {{currency}} withdrawn from your account. New balance: {{balance}} {{currency}}.", variables: ["amount", "currency", "balance"], status: "active" },
    { id: "sms_kyc", name: "KYC Status Update", body: "GaexPay: Your KYC verification is now {{status}}. {{additionalInfo}}", variables: ["status", "additionalInfo"], status: "active" },
  ],
  push: [
    { id: "push_tx_received", name: "Money Received", title: "💸 Money received", body: "{{sender}} sent you {{amount}} {{currency}}", icon: "💸", variables: ["sender", "amount", "currency"], status: "active" },
    { id: "push_tx_sent", name: "Money Sent", title: "✅ Transfer successful", body: "You sent {{amount}} {{currency}} to {{recipient}}", icon: "✅", variables: ["amount", "currency", "recipient"], status: "active" },
    { id: "push_kyc", name: "KYC Update", title: "KYC verified ✓", body: "Your account is now verified. New limits unlocked!", icon: "✅", variables: [], status: "active" },
    { id: "push_bill", name: "Bill Paid", title: "Bill paid", body: "{{biller}} bill of {{amount}} {{currency}} paid successfully", icon: "🧾", variables: ["biller", "amount", "currency"], status: "active" },
    { id: "push_card", name: "Card Transaction", title: "💳 Card transaction", body: "{{amount}} {{currency}} at {{merchant}}", icon: "💳", variables: ["amount", "currency", "merchant"], status: "active" },
  ],
};

/**
 * Default general platform settings.
 */
export const DEFAULT_GENERAL_SETTINGS = {
  "general.platformName": "GaexPay",
  "general.supportEmail": "support@gaexpay.com",
  "general.supportPhone": "+234 700 GAEXPAY",
  "general.defaultLanguage": "en",
  "general.defaultCurrency": "NGN",
  "general.timezone": "Africa/Lagos",
  "maintenance.enabled": "false",
  "maintenance.message": "We're performing scheduled maintenance. We'll be back shortly.",
  "maintenance.windowStart": "",
  "maintenance.windowEnd": "",
  "registration.allowNewSignups": "true",
  "registration.requireEmailVerification": "true",
  "registration.allowedCountries": JSON.stringify(["NG", "GH", "CI", "SN", "CM", "KE", "UG", "TZ", "RW", "ZA", "EG", "MA"]),
  "limits.defaultDailyTransfer": "500000",
  "limits.defaultMonthlyLimit": "2000000",
  "limits.maxWalletCountPerUser": "5",
  "branding.logoUrl": "/logo.png",
  "branding.primaryColor": "#10b981",
  "branding.secondaryColor": "#0ea5e9",
};

/**
 * Initialize a default value for a setting if it doesn't already exist.
 */
export async function ensureSetting<T>(
  key: string,
  defaultValue: T,
  category = "general",
): Promise<T> {
  const existing = await getSetting<T>(key);
  if (existing !== null) return existing;
  await setSetting(key, defaultValue, category);
  return defaultValue;
}
