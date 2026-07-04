import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomToken(len = 18) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function main() {
  console.log("Seeding MiniPay feature gap data...");

  // ---- Feature flags ----
  const flags = [
    { key: "cash_links", name: "Cash Links", description: "Send money via shareable link", category: "payments" },
    { key: "virtual_accounts", name: "Virtual Accounts", description: "USD & EUR accounts for freelancers", category: "payments" },
    { key: "hold_earn", name: "Hold & Earn", description: "Daily rewards on stablecoin balance", category: "crypto" },
    { key: "travel_wallet", name: "Travel Wallet", description: "Multi-currency wallet for travel", category: "payments" },
    { key: "mini_apps", name: "Mini Apps", description: "Third-party app ecosystem", category: "other" },
    { key: "esim", name: "eSim Purchase", description: "Buy data plans while traveling", category: "payments" },
    { key: "pockets", name: "Pockets", description: "Drag-and-drop stablecoin swap", category: "crypto" },
  ];
  for (const f of flags) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      create: {
        key: f.key,
        name: f.name,
        description: f.description,
        category: f.category,
        enabled: true,
        accountTypes: JSON.stringify(["personal", "business"]),
        roles: JSON.stringify(["user", "admin", "super_admin"]),
      },
      update: { name: f.name, description: f.description, category: f.category },
    });
  }

  // ---- Cash Links ----
  await db.cashLink.deleteMany({ where: { userId: DEMO_USER_ID } });
  const cashLinks = [
    { amount: 50, currency: "USD", note: "Coffee on me ☕", status: "pending", expiresInHours: 168 },
    { amount: 120, currency: "USD", note: "For dinner last night 🍝", status: "pending", expiresInHours: 72 },
    { amount: 25, currency: "EUR", note: "Thanks for the ride!", status: "claimed", expiresInHours: -24 },
    { amount: 200, currency: "USD", note: "Project milestone bonus", status: "expired", expiresInHours: -240 },
    { amount: 75, currency: "GBP", note: "Birthday gift 🎁", status: "pending", expiresInHours: 120 },
  ];
  for (const c of cashLinks) {
    await db.cashLink.create({
      data: {
        token: randomToken(),
        userId: DEMO_USER_ID,
        amount: c.amount,
        currency: c.currency,
        note: c.note,
        status: c.status,
        expiresAt: new Date(Date.now() + c.expiresInHours * 60 * 60 * 1000),
        claimedAt: c.status === "claimed" ? new Date(Date.now() - 12 * 60 * 60 * 1000) : null,
        claimantId: c.status === "claimed" ? DEMO_USER_ID : null,
      },
    });
  }

  // ---- Virtual Accounts ----
  await db.virtualAccount.deleteMany({ where: { userId: DEMO_USER_ID } });
  await db.virtualAccount.create({
    data: {
      userId: DEMO_USER_ID,
      currency: "USD",
      accountType: "freelancer",
      accountNumber: "8301245678",
      routingNumber: "026013576",
      bankName: "GaexPay Banking Partner (Evolve Bank & Trust)",
      bankAddress: "Little Rock, AR, USA",
      holderName: "ADAEZE OKONKWO",
      status: "active",
    },
  });
  await db.virtualAccount.create({
    data: {
      userId: DEMO_USER_ID,
      currency: "EUR",
      accountType: "freelancer",
      accountNumber: "DE89370400440532013000",
      iban: "DE89 3704 0044 0532 0130 00",
      bic: "COBADEFFXXX",
      bankName: "GaexPay EU (Commerzbank)",
      bankAddress: "Frankfurt, Germany",
      holderName: "ADAEZE OKONKWO",
      status: "active",
    },
  });

  // ---- Hold & Earn records (last 30 days) ----
  await db.holdEarnRecord.deleteMany({ where: { userId: DEMO_USER_ID } });
  const baseBalance = 4200; // USD stablecoin balance
  let cumulative = 0;
  for (let i = 29; i >= 0; i--) {
    const eligible = baseBalance + rand(-150, 350);
    const weeklyRate = 0.014; // 1.4% weekly (about 0.2% daily)
    const dailyReward = (eligible * weeklyRate) / 7;
    cumulative += dailyReward;
    await db.holdEarnRecord.create({
      data: {
        userId: DEMO_USER_ID,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        eligibleBalance: Math.round(eligible * 100) / 100,
        dailyReward: Math.round(dailyReward * 100) / 100,
        weeklyRate,
        autoCompound: i % 7 === 0,
      },
    });
  }

  // ---- Travel Wallet Destinations ----
  await db.travelWalletDestination.deleteMany({ where: { userId: DEMO_USER_ID } });
  const destinations = [
    { countryCode: "FR", countryName: "France", flag: "🇫🇷", currency: "EUR", exchangeRate: 0.92, budget: 2000, spent: 850 },
    { countryCode: "JP", countryName: "Japan", flag: "🇯🇵", currency: "JPY", exchangeRate: 149.5, budget: 1500, spent: 425 },
    { countryCode: "TH", countryName: "Thailand", flag: "🇹🇭", currency: "THB", exchangeRate: 35.8, budget: 800, spent: 0 },
    { countryCode: "GB", countryName: "United Kingdom", flag: "🇬🇧", currency: "GBP", exchangeRate: 0.79, budget: 1200, spent: 0 },
  ];
  for (const d of destinations) {
    await db.travelWalletDestination.create({
      data: {
        userId: DEMO_USER_ID,
        ...d,
        status: d.spent > 0 ? "active" : "active",
      },
    });
  }

  // ---- Mini Apps ----
  await db.miniApp.deleteMany();
  const miniApps = [
    { slug: "savings-pots", name: "Savings Pots", description: "Auto-save into goal-based pots", category: "finance", icon: "🐷", color: "violet", developer: "GaexPay Labs", rating: 4.8, installs: 12450, featured: true },
    { slug: "bill-split", name: "Bill Splitter", description: "Split bills with friends instantly", category: "finance", icon: "💸", color: "emerald", developer: "SplitRight", rating: 4.6, installs: 8200, featured: true },
    { slug: "vouchers", name: "Voucher Hub", description: "Buy & redeem gift cards", category: "shopping", icon: "🎁", color: "rose", developer: "GiftGrid", rating: 4.4, installs: 5600, featured: true },
    { slug: "airtime-game", name: "Airtime Quiz", description: "Win free airtime by answering quizzes", category: "games", icon: "🎮", color: "amber", developer: "QuizTo", rating: 4.7, installs: 18900, featured: false },
    { slug: "qr-menus", name: "QR Menus", description: "Scan & pay restaurant menus", category: "utilities", icon: "📋", color: "sky", developer: "DineQR", rating: 4.5, installs: 3200, featured: false },
    { slug: "reminders", name: "Pay Reminders", description: "Never miss a bill deadline", category: "utilities", icon: "⏰", color: "teal", developer: "GaexPay Labs", rating: 4.9, installs: 9800, featured: true },
    { slug: "lotto", name: "Lotto Pool", description: "Group-buy lottery tickets", category: "games", icon: "🎰", color: "orange", developer: "PoolWin", rating: 4.2, installs: 4100, featured: false },
    { slug: "social-feed", name: "Payment Feed", description: "Share payments with friends", category: "social", icon: "💬", color: "purple", developer: "GaexPay Labs", rating: 4.5, installs: 6700, featured: false },
    { slug: "invoice-gen", name: "Invoice Gen", description: "Create invoices on the go", category: "finance", icon: "🧾", color: "indigo", developer: "InvoiceX", rating: 4.6, installs: 5400, featured: false },
    { slug: "tax-calc", name: "Tax Calculator", description: "Estimate your tax obligations", category: "utilities", icon: "🧮", color: "slate", developer: "TaxNerd", rating: 4.3, installs: 2900, featured: false },
    { slug: "crypto-news", name: "Crypto News", description: "Latest crypto market news", category: "finance", icon: "📰", color: "amber", developer: "CoinWire", rating: 4.4, installs: 7300, featured: false },
    { slug: "shopping-cashback", name: "Cashback Shopping", description: "Earn cashback at 500+ stores", category: "shopping", icon: "🛍️", color: "rose", developer: "ShopBack", rating: 4.7, installs: 15600, featured: true },
  ];
  for (const a of miniApps) {
    await db.miniApp.create({ data: a });
  }

  // ---- eSim Purchases ----
  await db.eSimPurchase.deleteMany({ where: { userId: DEMO_USER_ID } });
  await db.eSimPurchase.create({
    data: {
      userId: DEMO_USER_ID,
      countryCode: "FR",
      countryName: "France",
      flag: "🇫🇷",
      planId: "eu_5gb_30d",
      planLabel: "Europe 5GB · 30 Days",
      dataAmount: "5GB",
      durationDays: 30,
      price: 24,
      currency: "USD",
      activationQr: "LPA:1$gaexpay-esim.example$FR-EU-5GB-XYZ123",
      status: "active",
      activatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    },
  });

  // ---- Pockets (stablecoin pockets) ----
  await db.pocket.deleteMany({ where: { userId: DEMO_USER_ID } });
  await db.pocket.create({ data: { userId: DEMO_USER_ID, code: "USDT", name: "Tether Pocket", balance: 1850.42, color: "violet" } });
  await db.pocket.create({ data: { userId: DEMO_USER_ID, code: "USDC", name: "USD Coin Pocket", balance: 2310.18, color: "purple" } });
  await db.pocket.create({ data: { userId: DEMO_USER_ID, code: "cUSD", name: "Celo Dollar Pocket", balance: 425.00, color: "fuchsia" } });

  console.log("MiniPay feature gap data seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
