import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Deterministic pseudo-random for stable mock data
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// API Keys catalog — 5 mock API keys
// ---------------------------------------------------------------------------
const API_KEYS_CATALOG = [
  {
    id: "key_prod_live_01",
    name: "Production Live",
    prefix: "gxp_live",
    fullKey: "gxp_live_4f7b9a2c8e1d6f3a5b9c0e7d2a4f6b8c",
    permissions: ["read", "write", "admin"] as const,
    rateLimit: 10000,
    status: "active" as const,
    createdDaysAgo: 184,
    lastUsedMinutesAgo: 3,
    requestsToday: 4827,
  },
  {
    id: "key_prod_read_02",
    name: "Analytics Read-Only",
    prefix: "gxp_live",
    fullKey: "gxp_live_8d3e6b1a9f5c2e7d4a8b0c3f6e9d1a2b",
    permissions: ["read"] as const,
    rateLimit: 1000,
    status: "active" as const,
    createdDaysAgo: 92,
    lastUsedMinutesAgo: 18,
    requestsToday: 1247,
  },
  {
    id: "key_webhook_03",
    name: "Webhook Verifier",
    prefix: "gxp_live",
    fullKey: "gxp_live_2b9c4e7d1a8f5c0e3b6d9a2f7e4c1b8d",
    permissions: ["read", "write"] as const,
    rateLimit: 1000,
    status: "active" as const,
    createdDaysAgo: 47,
    lastUsedMinutesAgo: 1,
    requestsToday: 384,
  },
  {
    id: "key_sandbox_04",
    name: "Sandbox Testing",
    prefix: "gxp_test",
    fullKey: "gxp_test_9e1d4a8c5b2f7e0d3a6b9c1e4f8d2a5b",
    permissions: ["read", "write"] as const,
    rateLimit: 1000,
    status: "active" as const,
    createdDaysAgo: 21,
    lastUsedMinutesAgo: 42,
    requestsToday: 192,
  },
  {
    id: "key_legacy_05",
    name: "Legacy Mobile App",
    prefix: "gxp_live",
    fullKey: "gxp_live_5a2b8e1d4f7c0b3a9e6d2c5f8b1a4e7d",
    permissions: ["read"] as const,
    rateLimit: 1000,
    status: "revoked" as const,
    createdDaysAgo: 312,
    lastUsedMinutesAgo: 14400, // 10 days
    requestsToday: 0,
  },
];

// ---------------------------------------------------------------------------
// Webhooks catalog — 4 mock webhooks
// ---------------------------------------------------------------------------
const WEBHOOKS_CATALOG = [
  {
    id: "wh_payments_01",
    url: "https://api.merchant-store.com/webhooks/gaexpay",
    events: ["payment.received", "payment.completed", "payment.failed"],
    status: "active" as const,
    lastDeliveryMinutesAgo: 2,
    successRate: 99.2,
    totalDeliveries: 18472,
    recentDeliveries: [
      { event: "payment.completed", statusCode: 200, durationMs: 142, minutesAgo: 2, success: true },
      { event: "payment.received", statusCode: 200, durationMs: 98, minutesAgo: 17, success: true },
      { event: "payment.failed", statusCode: 200, durationMs: 187, minutesAgo: 41, success: true },
      { event: "payment.completed", statusCode: 500, durationMs: 5023, minutesAgo: 73, success: false },
      { event: "payment.received", statusCode: 200, durationMs: 121, minutesAgo: 96, success: true },
    ],
  },
  {
    id: "wh_transfers_02",
    url: "https://hooks.example-bank.io/transfers/inbound",
    events: ["transfer.completed", "transfer.failed"],
    status: "active" as const,
    lastDeliveryMinutesAgo: 14,
    successRate: 97.8,
    totalDeliveries: 9824,
    recentDeliveries: [
      { event: "transfer.completed", statusCode: 200, durationMs: 218, minutesAgo: 14, success: true },
      { event: "transfer.completed", statusCode: 200, durationMs: 174, minutesAgo: 48, success: true },
      { event: "transfer.failed", statusCode: 200, durationMs: 156, minutesAgo: 92, success: true },
      { event: "transfer.completed", statusCode: 408, durationMs: 30012, minutesAgo: 187, success: false },
      { event: "transfer.completed", statusCode: 200, durationMs: 195, minutesAgo: 242, success: true },
    ],
  },
  {
    id: "wh_compliance_03",
    url: "https://compliance.fintech-partner.net/api/v1/kyc-events",
    events: ["kyc.approved", "kyc.rejected", "kyc.under_review"],
    status: "active" as const,
    lastDeliveryMinutesAgo: 38,
    successRate: 100,
    totalDeliveries: 1843,
    recentDeliveries: [
      { event: "kyc.approved", statusCode: 200, durationMs: 89, minutesAgo: 38, success: true },
      { event: "kyc.under_review", statusCode: 200, durationMs: 102, minutesAgo: 124, success: true },
      { event: "kyc.approved", statusCode: 200, durationMs: 76, minutesAgo: 287, success: true },
      { event: "kyc.rejected", statusCode: 200, durationMs: 94, minutesAgo: 412, success: true },
      { event: "kyc.approved", statusCode: 200, durationMs: 88, minutesAgo: 624, success: true },
    ],
  },
  {
    id: "wh_fraud_04",
    url: "https://fraud-detection.internal.corp/alerts",
    events: ["fraud.detected", "fraud.review", "fraud.cleared"],
    status: "paused" as const,
    lastDeliveryMinutesAgo: 2880, // 2 days
    successRate: 84.6,
    totalDeliveries: 2874,
    recentDeliveries: [
      { event: "fraud.detected", statusCode: 200, durationMs: 312, minutesAgo: 2880, success: true },
      { event: "fraud.review", statusCode: 500, durationMs: 4012, minutesAgo: 2940, success: false },
      { event: "fraud.detected", statusCode: 500, durationMs: 3899, minutesAgo: 3024, success: false },
      { event: "fraud.cleared", statusCode: 200, durationMs: 156, minutesAgo: 3168, success: true },
      { event: "fraud.review", statusCode: 200, durationMs: 287, minutesAgo: 3280, success: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// API Endpoints catalog — 22 endpoints across 6 categories
// ---------------------------------------------------------------------------
const API_ENDPOINTS = [
  // Payments
  { category: "Payments", method: "POST", path: "/v1/payments", description: "Initiate a new payment from a wallet to a recipient" },
  { category: "Payments", method: "GET", path: "/v1/payments/{id}", description: "Retrieve the status and details of a payment" },
  { category: "Payments", method: "POST", path: "/v1/payments/{id}/refund", description: "Issue a full or partial refund for a completed payment" },
  { category: "Payments", method: "GET", path: "/v1/payments", description: "List payments with filtering and pagination" },
  // Transfers
  { category: "Transfers", method: "POST", path: "/v1/transfers", description: "Send money to a bank account or another GaexPay user" },
  { category: "Transfers", method: "GET", path: "/v1/transfers/{id}", description: "Retrieve transfer details including settlement status" },
  { category: "Transfers", method: "GET", path: "/v1/transfers/quote", description: "Get a real-time FX quote for an international transfer" },
  { category: "Transfers", method: "POST", path: "/v1/transfers/{id}/cancel", description: "Cancel a pending transfer before settlement" },
  // Cards
  { category: "Cards", method: "POST", path: "/v1/cards", description: "Issue a new virtual or physical debit card" },
  { category: "Cards", method: "GET", path: "/v1/cards", description: "List all cards for the authenticated user" },
  { category: "Cards", method: "PATCH", path: "/v1/cards/{id}/freeze", description: "Freeze or unfreeze a card instantly" },
  { category: "Cards", method: "PATCH", path: "/v1/cards/{id}/limits", description: "Update spending limits (POS, ATM, online)" },
  // KYC
  { category: "KYC", method: "POST", path: "/v1/kyc/submit", description: "Submit KYC documents for identity verification" },
  { category: "KYC", method: "GET", path: "/v1/kyc/status", description: "Check the verification status and tier of a user" },
  { category: "KYC", method: "GET", path: "/v1/kyc/documents", description: "List submitted KYC documents and their review state" },
  // Crypto
  { category: "Crypto", method: "POST", path: "/v1/crypto/swap", description: "Swap one cryptocurrency for another at market rate" },
  { category: "Crypto", method: "POST", path: "/v1/crypto/buy", description: "Buy crypto using fiat wallet balance" },
  { category: "Crypto", method: "GET", path: "/v1/crypto/rates", description: "Get live crypto prices with 24h change data" },
  { category: "Crypto", method: "POST", path: "/v1/crypto/withdraw", description: "Withdraw crypto to an external wallet address" },
  // Webhooks
  { category: "Webhooks", method: "POST", path: "/v1/webhooks", description: "Register a new webhook endpoint for event delivery" },
  { category: "Webhooks", method: "GET", path: "/v1/webhooks", description: "List all registered webhook endpoints" },
  { category: "Webhooks", method: "POST", path: "/v1/webhooks/{id}/test", description: "Send a test event to verify webhook configuration" },
  { category: "Webhooks", method: "DELETE", path: "/v1/webhooks/{id}", description: "Delete a webhook endpoint" },
] as const;

const METHOD_COLORS: Record<string, string> = {
  GET: "#10b981",
  POST: "#3b82f6",
  PATCH: "#f59e0b",
  DELETE: "#f43f5e",
  PUT: "#8b5cf6",
};

// ---------------------------------------------------------------------------
// Documentation content
// ---------------------------------------------------------------------------
const QUICK_START = [
  { step: 1, title: "Create an API key", description: "Generate a new API key from the API Keys tab. Choose permissions carefully — production keys should follow least-privilege." },
  { step: 2, title: "Authenticate your requests", description: "Pass your API key in the Authorization header as a Bearer token. All API traffic runs over HTTPS." },
  { step: 3, title: "Make your first call", description: "Try a simple GET /v1/payments to list recent payments. Use the Sandbox tab to test without touching live funds." },
  { step: 4, title: "Subscribe to webhooks", description: "Register a webhook URL to receive real-time events for payments, transfers, KYC, and fraud alerts." },
];

const ERROR_CODES = [
  { code: "200", name: "OK", description: "The request was successful." },
  { code: "201", name: "Created", description: "A new resource was successfully created." },
  { code: "400", name: "Bad Request", description: "The request was malformed or missing required parameters." },
  { code: "401", name: "Unauthorized", description: "Missing or invalid API key. Verify your Authorization header." },
  { code: "403", name: "Forbidden", description: "API key lacks the required permission for this endpoint." },
  { code: "404", name: "Not Found", description: "The requested resource does not exist or has been deleted." },
  { code: "429", name: "Rate Limited", description: "You have exceeded your rate limit. Retry with exponential backoff." },
  { code: "500", name: "Server Error", description: "An unexpected error occurred on our side. Our team has been notified." },
  { code: "503", name: "Service Unavailable", description: "The API is temporarily offline for maintenance. Check status page." },
];

const SDKS = [
  { name: "JavaScript", language: "javascript", install: "npm install @gaexpay/sdk", color: "#f7df1e", icon: "JS" },
  { name: "Python", language: "python", install: "pip install gaexpay", color: "#3776ab", icon: "Py" },
  { name: "PHP", language: "php", install: "composer require gaexpay/sdk", color: "#777bb4", icon: "PHP" },
  { name: "Go", language: "go", install: "go get github.com/gaexpay/sdk-go", color: "#00add8", icon: "Go" },
  { name: "Ruby", language: "ruby", install: "gem install gaexpay", color: "#cc342d", icon: "Rb" },
  { name: "Java", language: "java", install: 'implementation "io.gaexpay:sdk:2.4.1"', color: "#f89820", icon: "Jv" },
];

const TEST_CARDS = [
  { brand: "Visa", number: "4111 1111 1111 1111", cvv: "123", exp: "12/27", behavior: "Always succeeds" },
  { brand: "Visa", number: "4000 0000 0000 0002", cvv: "123", exp: "12/27", behavior: "Always declines (generic)" },
  { brand: "Mastercard", number: "5555 5555 5555 4444", cvv: "123", exp: "12/27", behavior: "Always succeeds" },
  { brand: "Mastercard", number: "5105 1051 0510 5100", cvv: "123", exp: "12/27", behavior: "Insufficient funds" },
  { brand: "Verve", number: "5060 6666 6666 6666 666", cvv: "123", exp: "12/27", behavior: "Always succeeds (local card)" },
  { brand: "Amex", number: "3782 822463 10005", cvv: "1234", exp: "12/27", behavior: "Always succeeds" },
];

const TEST_PHONES = [
  { label: "Successful OTP", number: "+234 801 234 5678", behavior: "OTP delivered instantly — use 123456" },
  { label: "Delayed OTP", number: "+234 802 345 6789", behavior: "OTP delivered after 8 seconds — use 234567" },
  { label: "Failed OTP", number: "+234 803 456 7890", behavior: "OTP delivery always fails" },
  { label: "International", number: "+1 555 010 1234", behavior: "US number — OTP delivered, use 345678" },
];

const TEST_BANKS = [
  { bank: "Access Bank", accountNumber: "0123456789", name: "JOHN DOE", behavior: "Valid account" },
  { bank: "GTBank", accountNumber: "0123456790", name: "JANE SMITH", behavior: "Valid account" },
  { bank: "Zenith Bank", accountNumber: "0123456791", name: "Unable to resolve", behavior: "Invalid account" },
  { bank: "UBA", accountNumber: "0123456792", name: "BLOCKED ACCOUNT", behavior: "Frozen — no debits" },
];

export async function GET() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const rand = seededRandom(20260621);

  // ---- Pull real transactions to derive usage patterns ------------------
  const recentTx = await db.transaction.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      id: true, type: true, status: true, amount: true,
      currency: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 4000,
  });

  // ---------------------------------------------------------------------------
  // 1. API KEYS — mask keys, compute fields
  // ---------------------------------------------------------------------------
  const apiKeys = API_KEYS_CATALOG.map((k) => {
    const createdDate = new Date(now.getTime() - k.createdDaysAgo * 86400000);
    const lastUsedDate = new Date(now.getTime() - k.lastUsedMinutesAgo * 60000);
    const maskedKey = `${k.prefix}_${k.fullKey.split("_")[2].slice(0, 4)}${"•".repeat(20)}${k.fullKey.slice(-4)}`;
    return {
      id: k.id,
      name: k.name,
      key: maskedKey,
      fullKey: k.fullKey,
      prefix: k.prefix,
      created: createdDate.toISOString(),
      lastUsed: k.status === "revoked" ? null : lastUsedDate.toISOString(),
      status: k.status,
      permissions: k.permissions,
      rateLimit: k.rateLimit,
      requestsToday: k.requestsToday,
      environment: k.prefix === "gxp_live" ? "production" : "sandbox",
    };
  });

  // ---------------------------------------------------------------------------
  // 2. WEBHOOKS — compute delivery stats
  // ---------------------------------------------------------------------------
  const webhooks = WEBHOOKS_CATALOG.map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    status: w.status,
    lastDelivery: w.status === "paused" ? null : new Date(now.getTime() - w.lastDeliveryMinutesAgo * 60000).toISOString(),
    successRate: w.successRate,
    totalDeliveries: w.totalDeliveries,
    recentDeliveries: w.recentDeliveries.map((d) => ({
      id: `dlv_${w.id}_${d.minutesAgo}`,
      event: d.event,
      url: w.url,
      statusCode: d.statusCode,
      durationMs: d.durationMs,
      timestamp: new Date(now.getTime() - d.minutesAgo * 60000).toISOString(),
      success: d.success,
    })),
  }));

  // ---------------------------------------------------------------------------
  // 3. API USAGE STATS — derive from real transaction volume
  // ---------------------------------------------------------------------------
  const totalRequests30d = 184_273 + Math.floor(recentTx.length * 4.2);

  // Requests by endpoint (top 10)
  const endpointBaseline = [
    { endpoint: "GET /v1/payments", count: 0 },
    { endpoint: "POST /v1/payments", count: 0 },
    { endpoint: "GET /v1/transfers", count: 0 },
    { endpoint: "POST /v1/transfers", count: 0 },
    { endpoint: "GET /v1/cards", count: 0 },
    { endpoint: "POST /v1/webhooks", count: 0 },
    { endpoint: "GET /v1/kyc/status", count: 0 },
    { endpoint: "POST /v1/crypto/swap", count: 0 },
    { endpoint: "GET /v1/crypto/rates", count: 0 },
    { endpoint: "POST /v1/cards", count: 0 },
  ];
  const weights = [0.32, 0.18, 0.14, 0.09, 0.07, 0.05, 0.05, 0.04, 0.03, 0.03];
  const requestsByEndpoint = endpointBaseline.map((e, i) => ({
    endpoint: e.endpoint,
    count: Math.floor(totalRequests30d * weights[i] * (0.9 + rand() * 0.2)),
  })).sort((a, b) => b.count - a.count);

  // Error rate — derived from failed transactions in DB
  const failedTx = recentTx.filter((t) => t.status === "failed").length;
  const errorRate = recentTx.length > 0
    ? Math.min(5, Math.max(0.4, (failedTx / recentTx.length) * 100 + 0.8))
    : 1.2;
  const avgResponseMs = 142 + Math.floor(rand() * 60);

  // 14-day request series
  const requestsByDay: { date: string; label: string; requests: number; errors: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayDate = new Date(now.getTime() - i * 86400000);
    const dayLabel = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dateStr = dayDate.toISOString().slice(0, 10);
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);
    const dayTx = recentTx.filter((t) => {
      const td = new Date(t.createdAt);
      return td >= dayStart && td <= dayEnd;
    }).length;
    const baseRequests = 4200 + Math.floor(rand() * 2800);
    const requests = baseRequests + dayTx * 8;
    const errors = Math.floor(requests * (errorRate / 100) * (0.7 + rand() * 0.6));
    requestsByDay.push({ date: dateStr, label: dayLabel, requests, errors });
  }

  // Usage by status code
  const successCount = Math.floor(totalRequests30d * (1 - errorRate / 100));
  const clientErrorCount = Math.floor(totalRequests30d * (errorRate / 100) * 0.82);
  const serverErrorCount = totalRequests30d - successCount - clientErrorCount;
  const usageByStatusCode = [
    { code: "2xx", label: "Success", count: successCount, color: "#10b981" },
    { code: "4xx", label: "Client Error", count: clientErrorCount, color: "#f59e0b" },
    { code: "5xx", label: "Server Error", count: serverErrorCount, color: "#f43f5e" },
  ];

  // ---------------------------------------------------------------------------
  // 4. RATE LIMITS — per-tier
  // ---------------------------------------------------------------------------
  const rateLimits = {
    currentTier: "Pro" as "Free" | "Pro" | "Enterprise",
    tiers: [
      {
        tier: "Free",
        limitPerHour: 100,
        limitPerMonth: 50000,
        price: "$0/mo",
        features: ["Sandbox access", "Community support", "1 webhook endpoint"],
        current: 47,
        usagePct: 47,
      },
      {
        tier: "Pro",
        limitPerHour: 1000,
        limitPerMonth: 750000,
        price: "$99/mo",
        features: ["Production access", "Priority support", "10 webhooks", "99.9% SLA"],
        current: 612,
        usagePct: 61.2,
      },
      {
        tier: "Enterprise",
        limitPerHour: 10000,
        limitPerMonth: 10000000,
        price: "Custom",
        features: ["Dedicated infra", "24/7 support", "Unlimited webhooks", "99.99% SLA", "Custom rate limits"],
        current: 4827,
        usagePct: 48.3,
      },
    ],
    currentHourUsage: 612,
    currentHourLimit: 1000,
    resetInMinutes: 27,
  };

  // ---------------------------------------------------------------------------
  // 5. SANDBOX
  // ---------------------------------------------------------------------------
  const sandbox = {
    balance: {
      NGN: 1_250_000,
      USD: 8_500,
      EUR: 4_200,
      GBP: 2_800,
      GHS: 12_000,
    },
    testCards: TEST_CARDS,
    testPhones: TEST_PHONES,
    testBanks: TEST_BANKS,
    lastReset: new Date(now.getTime() - 3 * 86400000).toISOString(),
    totalTestRequests: 1842,
  };

  // ---------------------------------------------------------------------------
  // 6. API ENDPOINTS (with method colors)
  // ---------------------------------------------------------------------------
  const endpointGroups = ["Payments", "Transfers", "Cards", "KYC", "Crypto", "Webhooks"].map((category) => ({
    category,
    endpoints: API_ENDPOINTS
      .filter((e) => e.category === category)
      .map((e) => ({
        ...e,
        color: METHOD_COLORS[e.method] ?? "#64748b",
      })),
  }));

  // ---------------------------------------------------------------------------
  // 7. DOCUMENTATION
  // ---------------------------------------------------------------------------
  const documentation = {
    quickStart: QUICK_START,
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer gxp_live_xxxxxxxxxxxxxxxxxxxxxxxx",
      description: "All API requests must include your API key in the Authorization header as a Bearer token. Keys are prefixed with gxp_live_ (production) or gxp_test_ (sandbox). Never expose your secret key in client-side code — use it only from your backend server.",
      example: {
        curl: `curl https://api.gaexpay.com/v1/payments \\
  -H "Authorization: Bearer gxp_live_4f7b9a2c8e1d6f3a5b9c0e7d2a4f6b8c" \\
  -H "Content-Type: application/json"`,
        javascript: `import { GaexPay } from '@gaexpay/sdk';

const gxp = new GaexPay('gxp_live_4f7b9a2c8e1d6f3a5b9c0e7d2a4f6b8c');

const payment = await gxp.payments.create({
  amount: 50000,
  currency: 'NGN',
  recipient: 'rec_abc123',
  reference: 'order_7890',
});`,
        python: `from gaexpay import GaexPay

gxp = GaexPay('gxp_live_4f7b9a2c8e1d6f3a5b9c0e7d2a4f6b8c')

payment = gxp.payments.create(
    amount=50000,
    currency='NGN',
    recipient='rec_abc123',
    reference='order_7890',
)`,
      },
    },
    errorCodes: ERROR_CODES,
    sdks: SDKS,
    baseUrls: {
      production: "https://api.gaexpay.com",
      sandbox: "https://api.sandbox.gaexpay.com",
    },
    version: "v1.4.2",
  };

  // ---------------------------------------------------------------------------
  // Recent deliveries (aggregated across all webhooks)
  // ---------------------------------------------------------------------------
  const recentDeliveries = webhooks
    .flatMap((w) => w.recentDeliveries)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);

  return NextResponse.json({
    apiKeys,
    webhooks,
    recentDeliveries,
    usage: {
      totalRequests30d,
      requestsByEndpoint,
      requestsByDay,
      usageByStatusCode,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseMs,
      peakDayRequests: Math.max(...requestsByDay.map((d) => d.requests)),
      uniqueEndpoints: API_ENDPOINTS.length,
    },
    rateLimits,
    sandbox,
    endpoints: endpointGroups,
    documentation,
    generatedAt: now.toISOString(),
  });
}
