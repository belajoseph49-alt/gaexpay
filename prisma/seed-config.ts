/**
 * prisma/seed-config.ts
 *
 * Seeds default API configurations, feature flags, and fee structures.
 * Idempotent — uses upserts on unique keys so it can be safely re-run.
 *
 * Run with:
 *   bun run prisma/seed-config.ts
 *   # or
 *   bunx tsx prisma/seed-config.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// Default API configs — one or more per service category.
// All are disabled by default with placeholder credentials.
// ============================================================
interface ApiConfigSeed {
  service: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  baseUrl: string;
  environment: string;
  credentials: Record<string, string>;
  rateLimitPerMin?: number;
  rateLimitPerDay?: number;
}

const API_CONFIGS: ApiConfigSeed[] = [
  // ---------- Payment ----------
  {
    service: "payment",
    name: "Stripe",
    provider: "stripe",
    category: "Payment Processing",
    description: "Card payments, subscriptions, and payouts",
    baseUrl: "https://api.stripe.com/v1",
    environment: "sandbox",
    credentials: { apiKey: "", publishableKey: "", webhookSecret: "" },
    rateLimitPerMin: 100,
    rateLimitPerDay: 10000,
  },
  {
    service: "payment",
    name: "Paystack",
    provider: "paystack",
    category: "Payment Processing",
    description: "African card and bank payments",
    baseUrl: "https://api.paystack.co",
    environment: "sandbox",
    credentials: { secretKey: "", publicKey: "" },
    rateLimitPerMin: 60,
    rateLimitPerDay: 5000,
  },
  {
    service: "payment",
    name: "Flutterwave",
    provider: "flutterwave",
    category: "Payment Processing",
    description: "Pan-African payment aggregator",
    baseUrl: "https://api.flutterwave.com/v3",
    environment: "sandbox",
    credentials: { secretKey: "", publicKey: "", encryptionKey: "" },
    rateLimitPerMin: 60,
    rateLimitPerDay: 5000,
  },
  // ---------- Blockchain ----------
  {
    service: "blockchain",
    name: "CoinGecko",
    provider: "coingecko",
    category: "Crypto Market Data",
    description: "Crypto price, market cap, and historical data",
    baseUrl: "https://api.coingecko.com/api/v3",
    environment: "production",
    credentials: { apiKey: "" },
    rateLimitPerMin: 30,
    rateLimitPerDay: 10000,
  },
  {
    service: "blockchain",
    name: "Infura",
    provider: "infura",
    category: "Blockchain RPC",
    description: "Ethereum and multi-chain RPC gateway",
    baseUrl: "https://mainnet.infura.io/v3",
    environment: "production",
    credentials: { projectId: "", projectSecret: "" },
    rateLimitPerMin: 100,
    rateLimitPerDay: 100000,
  },
  {
    service: "blockchain",
    name: "Pi Network",
    provider: "pi-network",
    category: "Blockchain RPC",
    description: "Pi Network wallet and payment API",
    baseUrl: "https://api.minepi.com/v2",
    environment: "sandbox",
    credentials: { apiKey: "" },
    rateLimitPerMin: 30,
  },
  // ---------- KYC ----------
  {
    service: "kyc",
    name: "Smile ID",
    provider: "smile-id",
    category: "Identity Verification",
    description: "African ID verification and face match",
    baseUrl: "https://api.smileidentity.com/v1",
    environment: "sandbox",
    credentials: { partnerId: "", apiKey: "", sandboxKey: "" },
    rateLimitPerMin: 30,
  },
  {
    service: "kyc",
    name: "Veriff",
    provider: "veriff",
    category: "Identity Verification",
    description: "Global ID document and selfie verification",
    baseUrl: "https://api.veriff.me/v1",
    environment: "sandbox",
    credentials: { apiKey: "", privateKey: "" },
    rateLimitPerMin: 30,
  },
  // ---------- KYB ----------
  {
    service: "kyb",
    name: "OpenCorporates",
    provider: "opencorporates",
    category: "Business Verification",
    description: "Global company registry data lookup",
    baseUrl: "https://api.opencorporates.com/v0.4",
    environment: "production",
    credentials: { apiToken: "" },
    rateLimitPerMin: 60,
  },
  {
    service: "kyb",
    name: "Crediwire",
    provider: "crediwire",
    category: "Business Verification",
    description: "Business credit and financial health checks",
    baseUrl: "https://api.crediwire.com/v2",
    environment: "sandbox",
    credentials: { apiKey: "" },
    rateLimitPerMin: 30,
  },
  // ---------- SMS ----------
  {
    service: "sms",
    name: "Twilio SMS",
    provider: "twilio",
    category: "SMS / OTP",
    description: "Programmable SMS and OTP delivery",
    baseUrl: "https://api.twilio.com/2010-04-01",
    environment: "sandbox",
    credentials: { accountSid: "", authToken: "", fromNumber: "" },
    rateLimitPerMin: 60,
    rateLimitPerDay: 10000,
  },
  {
    service: "sms",
    name: "Termii",
    provider: "termii",
    category: "SMS / OTP",
    description: "African SMS and OTP delivery",
    baseUrl: "https://api.ng.termii.com/api",
    environment: "sandbox",
    credentials: { apiKey: "", senderId: "" },
    rateLimitPerMin: 60,
    rateLimitPerDay: 10000,
  },
  // ---------- Email ----------
  {
    service: "email",
    name: "SendGrid",
    provider: "sendgrid",
    category: "Email Delivery",
    description: "Transactional and marketing email",
    baseUrl: "https://api.sendgrid.com/v3",
    environment: "sandbox",
    credentials: { apiKey: "", fromEmail: "" },
    rateLimitPerMin: 100,
    rateLimitPerDay: 50000,
  },
  {
    service: "email",
    name: "AWS SES",
    provider: "aws-ses",
    category: "Email Delivery",
    description: "Amazon Simple Email Service",
    baseUrl: "https://email.us-east-1.amazonaws.com",
    environment: "sandbox",
    credentials: { accessKeyId: "", secretAccessKey: "", region: "us-east-1" },
    rateLimitPerMin: 100,
    rateLimitPerDay: 50000,
  },
  // ---------- Push ----------
  {
    service: "push",
    name: "Firebase Cloud Messaging",
    provider: "fcm",
    category: "Push Notifications",
    description: "Cross-platform push notifications",
    baseUrl: "https://fcm.googleapis.com/fcm",
    environment: "production",
    credentials: { serverKey: "", projectId: "" },
    rateLimitPerMin: 600,
  },
  {
    service: "push",
    name: "OneSignal",
    provider: "onesignal",
    category: "Push Notifications",
    description: "Cross-platform push and in-app messaging",
    baseUrl: "https://onesignal.com/api/v1",
    environment: "production",
    credentials: { appId: "", restApiKey: "" },
    rateLimitPerMin: 600,
  },
  // ---------- Geolocation ----------
  {
    service: "geolocation",
    name: "Google Maps Platform",
    provider: "google-maps",
    category: "Geolocation",
    description: "Maps, geocoding, and reverse geocoding",
    baseUrl: "https://maps.googleapis.com/maps/api",
    environment: "production",
    credentials: { apiKey: "" },
    rateLimitPerMin: 100,
    rateLimitPerDay: 100000,
  },
  {
    service: "geolocation",
    name: "IPInfo",
    provider: "ipinfo",
    category: "Geolocation",
    description: "IP-based geolocation and ASN lookup",
    baseUrl: "https://ipinfo.io",
    environment: "production",
    credentials: { token: "" },
    rateLimitPerMin: 100,
  },
  // ---------- AI ----------
  {
    service: "ai",
    name: "Z.ai Gaxie AI",
    provider: "z-ai",
    category: "AI / LLM",
    description: "Gaxie AI assistant backend (z-ai-web-dev-sdk)",
    baseUrl: "https://api.z.ai/api/paas/v4",
    environment: "production",
    credentials: { apiKey: "" },
    rateLimitPerMin: 60,
    rateLimitPerDay: 10000,
  },
  {
    service: "ai",
    name: "OpenAI",
    provider: "openai",
    category: "AI / LLM",
    description: "GPT models for chat and content generation",
    baseUrl: "https://api.openai.com/v1",
    environment: "production",
    credentials: { apiKey: "" },
    rateLimitPerMin: 60,
  },
  // ---------- Exchange rate ----------
  {
    service: "exchange_rate",
    name: "Open Exchange Rates",
    provider: "open-exchange-rates",
    category: "FX Rates",
    description: "Real-time and historical currency exchange rates",
    baseUrl: "https://openexchangerates.org/api",
    environment: "production",
    credentials: { appId: "" },
    rateLimitPerMin: 60,
  },
  {
    service: "exchange_rate",
    name: "Fixer",
    provider: "fixer",
    category: "FX Rates",
    description: "ECB-backed currency exchange rate API",
    baseUrl: "https://data.fixer.io/api",
    environment: "production",
    credentials: { accessKey: "" },
    rateLimitPerMin: 60,
  },
  // ---------- Cloud storage ----------
  {
    service: "cloud_storage",
    name: "AWS S3",
    provider: "aws-s3",
    category: "Cloud Storage",
    description: "Object storage for documents and media",
    baseUrl: "https://s3.amazonaws.com",
    environment: "production",
    credentials: { accessKeyId: "", secretAccessKey: "", bucket: "", region: "us-east-1" },
  },
  {
    service: "cloud_storage",
    name: "Cloudinary",
    provider: "cloudinary",
    category: "Cloud Storage",
    description: "Image and video CDN with transformations",
    baseUrl: "https://api.cloudinary.com/v1_1",
    environment: "production",
    credentials: { cloudName: "", apiKey: "", apiSecret: "" },
  },
  // ---------- Auth ----------
  {
    service: "auth",
    name: "NextAuth.js",
    provider: "nextauth",
    category: "Authentication",
    description: "Built-in NextAuth.js v4 provider",
    baseUrl: "",
    environment: "production",
    credentials: { secret: "" },
  },
  {
    service: "auth",
    name: "Google OAuth",
    provider: "google",
    category: "Authentication",
    description: "Google sign-in OAuth provider",
    baseUrl: "https://oauth2.googleapis.com",
    environment: "production",
    credentials: { clientId: "", clientSecret: "" },
  },
  {
    service: "auth",
    name: "Apple Sign-In",
    provider: "apple",
    category: "Authentication",
    description: "Apple sign-in OAuth provider",
    baseUrl: "https://appleid.apple.com",
    environment: "production",
    credentials: { clientId: "", teamId: "", keyId: "", privateKey: "" },
  },
];

// ============================================================
// Default feature flags for every platform module.
// ============================================================
interface FeatureFlagSeed {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  accountTypes: string[];
  roles: string[];
}

const FEATURE_FLAGS: FeatureFlagSeed[] = [
  // Payments
  { key: "crypto_trading", name: "Crypto Trading", description: "Buy, sell, and swap cryptocurrencies", enabled: true, category: "crypto", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "pi_network", name: "Pi Network Integration", description: "Pi wallet integration and payments", enabled: false, category: "crypto", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "international_transfer", name: "International Transfers", description: "Cross-border wire transfers", enabled: true, category: "payments", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "qr_payments", name: "QR Payments", description: "Scan-to-pay merchant QR codes", enabled: true, category: "payments", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "mobile_money", name: "Mobile Money", description: "MTN, Orange, Airtel, Moov money integration", enabled: true, category: "payments", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "virtual_cards", name: "Virtual Cards", description: "Issue and manage virtual debit cards", enabled: true, category: "payments", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  // Savings & budgeting
  { key: "savings_goals", name: "Savings Goals", description: "Goal-based automated savings", enabled: true, category: "general", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "budgets", name: "Budgets", description: "Category-level spending budgets", enabled: true, category: "general", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "scheduled_transfers", name: "Scheduled Transfers", description: "Recurring automated transfers", enabled: true, category: "payments", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  // Insights
  { key: "analytics", name: "Analytics", description: "Spending insights and visualizations", enabled: true, category: "analytics", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "spending_map", name: "Spending Map", description: "Geographic visualization of transactions", enabled: true, category: "analytics", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  // Business / enterprise
  { key: "merchant_dashboard", name: "Merchant Dashboard", description: "Merchant reporting and inventory tools", enabled: true, category: "general", accountTypes: ["business"], roles: ["user", "admin"] },
  { key: "business_pro", name: "Business Pro", description: "Enhanced KYB, invoicing, and team management", enabled: true, category: "general", accountTypes: ["business"], roles: ["user", "admin"] },
  { key: "developer_portal", name: "Developer Portal", description: "API keys, webhooks, and SDK downloads", enabled: true, category: "general", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "treasury", name: "Treasury", description: "Multi-currency treasury and FX hedging", enabled: true, category: "general", accountTypes: ["business"], roles: ["user", "admin"] },
  // Compliance / admin
  { key: "aml_compliance", name: "AML Compliance", description: "Anti-money laundering screening and alerts", enabled: true, category: "security", accountTypes: ["personal", "business"], roles: ["admin", "kyc_manager"] },
  { key: "enterprise_admin", name: "Enterprise Admin", description: "Admin control panel and operational tools", enabled: true, category: "security", accountTypes: ["personal", "business"], roles: ["admin", "super_admin"] },
  // Notifications
  { key: "push_notifications", name: "Push Notifications", description: "Real-time mobile push alerts", enabled: true, category: "communication", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "email_notifications", name: "Email Notifications", description: "Transactional email alerts", enabled: true, category: "communication", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
  { key: "sms_notifications", name: "SMS Notifications", description: "SMS alerts for critical events", enabled: false, category: "communication", accountTypes: ["personal", "business"], roles: ["user", "admin"] },
];

// ============================================================
// Default fee configs.
// ============================================================
interface FeeConfigSeed {
  name: string;
  description: string;
  feeType: string;
  feeValue: number;
  fixedFee?: number;
  currency: string;
  minFee?: number;
  maxFee?: number;
  minAmount?: number;
  maxAmount?: number;
  transactionType?: string;
  accountType?: string;
  enabled: boolean;
}

const FEE_CONFIGS: FeeConfigSeed[] = [
  {
    name: "transfer_fee",
    description: "P2P wallet-to-wallet transfer fee",
    feeType: "percentage",
    feeValue: 1.5,
    currency: "NGN",
    minFee: 10,
    maxFee: 2500,
    transactionType: "transfer",
    accountType: "all",
    enabled: true,
  },
  {
    name: "exchange_fee",
    description: "Currency conversion fee (FX spread)",
    feeType: "percentage",
    feeValue: 2,
    currency: "NGN",
    minFee: 50,
    transactionType: "exchange",
    accountType: "all",
    enabled: true,
  },
  {
    name: "crypto_swap_fee",
    description: "Crypto-to-crypto swap fee",
    feeType: "percentage",
    feeValue: 1,
    currency: "NGN",
    minFee: 100,
    transactionType: "crypto_trade",
    accountType: "all",
    enabled: true,
  },
  {
    name: "bill_payment_fee",
    description: "Utility and bill payment fee",
    feeType: "percentage",
    feeValue: 0.5,
    currency: "NGN",
    minFee: 0,
    maxFee: 500,
    transactionType: "bill",
    accountType: "all",
    enabled: true,
  },
  {
    name: "card_fee",
    description: "Virtual card transaction fee",
    feeType: "percentage",
    feeValue: 2.5,
    currency: "NGN",
    minFee: 50,
    maxFee: 1000,
    transactionType: "card",
    accountType: "all",
    enabled: true,
  },
  {
    name: "international_transfer_fee",
    description: "Cross-border wire transfer fee",
    feeType: "mixed",
    feeValue: 1.5,
    fixedFee: 500,
    currency: "NGN",
    minFee: 500,
    maxFee: 10000,
    transactionType: "transfer",
    accountType: "all",
    enabled: true,
  },
  {
    name: "withdrawal_fee",
    description: "Withdrawal to bank or mobile money",
    feeType: "percentage",
    feeValue: 1,
    currency: "NGN",
    minFee: 100,
    maxFee: 2000,
    transactionType: "withdrawal",
    accountType: "all",
    enabled: true,
  },
];

// ============================================================
// Seed runner
// ============================================================
async function main() {
  console.log("🌱 Seeding API configs...");
  let apiCount = 0;
  for (const cfg of API_CONFIGS) {
    // Identity: match by service + name (case-insensitive in app logic, but
    // here we use exact match since these are deterministic seeds).
    const existing = await prisma.apiConfig.findFirst({
      where: { service: cfg.service, name: cfg.name },
    });
    if (existing) {
      await prisma.apiConfig.update({
        where: { id: existing.id },
        data: {
          provider: cfg.provider,
          category: cfg.category,
          description: cfg.description,
          baseUrl: cfg.baseUrl,
          environment: cfg.environment,
          rateLimitPerMin: cfg.rateLimitPerMin ?? null,
          rateLimitPerDay: cfg.rateLimitPerDay ?? null,
        },
      });
    } else {
      await prisma.apiConfig.create({
        data: {
          service: cfg.service,
          name: cfg.name,
          provider: cfg.provider,
          category: cfg.category,
          description: cfg.description,
          baseUrl: cfg.baseUrl,
          environment: cfg.environment,
          credentials: JSON.stringify(cfg.credentials),
          enabled: false,
          rateLimitPerMin: cfg.rateLimitPerMin ?? null,
          rateLimitPerDay: cfg.rateLimitPerDay ?? null,
        },
      });
      apiCount++;
    }
  }
  console.log(`   ✅ API configs: ${API_CONFIGS.length} total (${apiCount} new)`);

  console.log("🌱 Seeding feature flags...");
  let flagCount = 0;
  for (const flag of FEATURE_FLAGS) {
    const existing = await prisma.featureFlag.findUnique({
      where: { key: flag.key },
    });
    if (existing) {
      await prisma.featureFlag.update({
        where: { id: existing.id },
        data: {
          name: flag.name,
          description: flag.description,
          category: flag.category,
          accountTypes: JSON.stringify(flag.accountTypes),
          roles: JSON.stringify(flag.roles),
        },
      });
    } else {
      await prisma.featureFlag.create({
        data: {
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled: flag.enabled,
          category: flag.category,
          accountTypes: JSON.stringify(flag.accountTypes),
          roles: JSON.stringify(flag.roles),
        },
      });
      flagCount++;
    }
  }
  console.log(`   ✅ Feature flags: ${FEATURE_FLAGS.length} total (${flagCount} new)`);

  console.log("🌱 Seeding fee configs...");
  let feeCount = 0;
  for (const fee of FEE_CONFIGS) {
    const existing = await prisma.feeConfig.findUnique({
      where: { name: fee.name },
    });
    if (existing) {
      await prisma.feeConfig.update({
        where: { id: existing.id },
        data: {
          description: fee.description,
          feeType: fee.feeType,
          feeValue: fee.feeValue,
          fixedFee: fee.fixedFee ?? 0,
          currency: fee.currency,
          minFee: fee.minFee ?? 0,
          maxFee: fee.maxFee ?? null,
          minAmount: fee.minAmount ?? null,
          maxAmount: fee.maxAmount ?? null,
          transactionType: fee.transactionType ?? null,
          accountType: fee.accountType ?? "all",
          enabled: fee.enabled,
        },
      });
    } else {
      await prisma.feeConfig.create({
        data: {
          name: fee.name,
          description: fee.description,
          feeType: fee.feeType,
          feeValue: fee.feeValue,
          fixedFee: fee.fixedFee ?? 0,
          currency: fee.currency,
          minFee: fee.minFee ?? 0,
          maxFee: fee.maxFee ?? null,
          minAmount: fee.minAmount ?? null,
          maxAmount: fee.maxAmount ?? null,
          transactionType: fee.transactionType ?? null,
          accountType: fee.accountType ?? "all",
          enabled: fee.enabled,
        },
      });
      feeCount++;
    }
  }
  console.log(`   ✅ Fee configs: ${FEE_CONFIGS.length} total (${feeCount} new)`);

  console.log("\n🎉 Config seeding complete.");
  console.log(
    `   API configs:      ${API_CONFIGS.length} (all disabled — configure in admin panel)`,
  );
  console.log(`   Feature flags:    ${FEATURE_FLAGS.length}`);
  console.log(`   Fee configs:      ${FEE_CONFIGS.length}`);
}

main()
  .catch((err) => {
    console.error("❌ Config seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
