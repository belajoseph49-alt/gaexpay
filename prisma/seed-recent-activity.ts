/**
 * prisma/seed-recent-activity.ts
 *
 * Non-destructive backfill: adds recent (current-month) transactions for the
 * demo user so dashboards / insights / charts / spending map show realistic
 * data instead of empty zeros when the seed was last run in a prior month.
 *
 * Idempotent: tags every created row with metadata.backfill = "seed-recent-activity"
 * and deletes any prior backfill rows before inserting, so re-running is safe.
 *
 * Run:  bunx tsx prisma/seed-recent-activity.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_EMAIL = "demo@gaexpay.com";
const BACKFILL_TAG = "seed-recent-activity";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function ref() {
  return (
    "GXP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}
function daysAgoDate(days: number, hourFloor = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(rand(hourFloor, 23)), Math.floor(rand(0, 59)), 0, 0);
  return d;
}

// Curated, realistic African fintech activity for the current month.
// Each entry produces one transaction. Credits = income, debits = spending.
type TxDef = {
  daysAgo: number;
  type: string;
  direction: "credit" | "debit";
  cat: string;
  method: string;
  amount: number;
  fee?: number;
  currency?: string;
  description: string;
  counterparty: string;
  counterpartyBank?: string;
  provider?: string | null;
  walletCurrency?: string;
};

const TX_DEFS: TxDef[] = [
  // --- Income ---
  { daysAgo: 1, type: "transfer", direction: "credit", cat: "income", method: "bank", amount: 850000, fee: 0, description: "Salary — TechCorp Ltd", counterparty: "TechCorp Ltd", counterpartyBank: "GTBank", walletCurrency: "NGN" },
  { daysAgo: 3, type: "transfer", direction: "credit", cat: "income", method: "bank", amount: 145000, fee: 0, description: "Freelance — Logo design", counterparty: "Bright Kofi", counterpartyBank: "UBA", walletCurrency: "NGN" },
  { daysAgo: 4, type: "referral", direction: "credit", cat: "income", method: "wallet", amount: 5000, fee: 0, description: "Referral bonus — Ada joined GaexPay", counterparty: "GaexPay Rewards", walletCurrency: "NGN" },
  { daysAgo: 6, type: "transfer", direction: "credit", cat: "income", method: "momo", amount: 32000, fee: 200, description: "Mobile money received — Amina", counterparty: "Amina Hassan", counterpartyBank: "MTN MoMo", provider: "mtn", walletCurrency: "NGN" },
  { daysAgo: 9, type: "transfer", direction: "credit", cat: "income", method: "bank", amount: 78000, fee: 0, description: "Invoice #INV-2026-014 — design retainer", counterparty: "Sahara Studios", counterpartyBank: "Access Bank", walletCurrency: "NGN" },
  { daysAgo: 12, type: "transfer", direction: "credit", cat: "income", method: "wallet", amount: 12500, fee: 0, description: "Cash link claim — link #CL-8842", counterparty: "Cash Link", walletCurrency: "NGN" },

  // --- Bills & Utilities ---
  { daysAgo: 0, type: "bill", direction: "debit", cat: "bills", method: "wallet", amount: 18500, fee: 100, description: "Ikeja Electric bill · 12345678901", counterparty: "Ikeja Electric", provider: "electricity", walletCurrency: "NGN" },
  { daysAgo: 2, type: "bill", direction: "debit", cat: "bills", method: "wallet", amount: 12500, fee: 0, description: "DSTV Compact Plus — monthly", counterparty: "DSTV Nigeria", provider: "tv", walletCurrency: "NGN" },
  { daysAgo: 5, type: "bill", direction: "debit", cat: "bills", method: "wallet", amount: 4500, fee: 0, description: "Glo data bundle — 4.5GB", counterparty: "Glo", provider: "data", walletCurrency: "NGN" },
  { daysAgo: 7, type: "bill", direction: "debit", cat: "bills", method: "wallet", amount: 3200, fee: 0, description: "MTN airtime — +2348033344556", counterparty: "MTN", provider: "airtime", walletCurrency: "NGN" },
  { daysAgo: 10, type: "bill", direction: "debit", cat: "bills", method: "wallet", amount: 9800, fee: 50, description: "Eko Water bill — Q2", counterparty: "Eko Water", provider: "water", walletCurrency: "NGN" },

  // --- Shopping & Card Spend ---
  { daysAgo: 1, type: "card", direction: "debit", cat: "shopping", method: "card", amount: 24500, fee: 0, description: "Spencer Supermarket — groceries", counterparty: "Spencer Supermarket", walletCurrency: "NGN" },
  { daysAgo: 2, type: "card", direction: "debit", cat: "shopping", method: "card", amount: 8900, fee: 0, description: "Jumia — phone case", counterparty: "Jumia Stores", walletCurrency: "NGN" },
  { daysAgo: 3, type: "card", direction: "debit", cat: "food", method: "card", amount: 5400, fee: 0, description: "Chicken Republic — dinner", counterparty: "Chicken Republic", walletCurrency: "NGN" },
  { daysAgo: 4, type: "card", direction: "debit", cat: "transport", method: "card", amount: 3200, fee: 0, description: "Uber ride — Lekki to VI", counterparty: "Uber", walletCurrency: "NGN" },
  { daysAgo: 6, type: "card", direction: "debit", cat: "shopping", method: "card", amount: 15900, fee: 0, description: "Nike Store — running shoes", counterparty: "Nike Store", walletCurrency: "NGN" },
  { daysAgo: 8, type: "card", direction: "debit", cat: "entertainment", method: "card", amount: 5500, fee: 0, description: "Netflix subscription", counterparty: "Netflix", walletCurrency: "NGN" },
  { daysAgo: 11, type: "card", direction: "debit", cat: "health", method: "card", amount: 12700, fee: 0, description: "HealthPlus — vitamins", counterparty: "HealthPlus Pharmacy", walletCurrency: "NGN" },
  { daysAgo: 13, type: "card", direction: "debit", cat: "food", method: "card", amount: 4200, fee: 0, description: "Cold Stone Creamery", counterparty: "Cold Stone", walletCurrency: "NGN" },

  // --- P2P Transfers ---
  { daysAgo: 0, type: "transfer", direction: "debit", cat: "p2p", method: "momo", amount: 15000, fee: 100, description: "Send to Mom", counterparty: "Mom", counterpartyBank: "MTN MoMo", provider: "mtn", walletCurrency: "NGN" },
  { daysAgo: 3, type: "transfer", direction: "debit", cat: "p2p", method: "bank", amount: 35000, fee: 250, description: "Rent contribution — Tunde", counterparty: "Tunde Adeyemi", counterpartyBank: "GTBank", walletCurrency: "NGN" },
  { daysAgo: 5, type: "transfer", direction: "debit", cat: "p2p", method: "wallet", amount: 8000, fee: 0, description: "Lunch split — Fatima", counterparty: "Fatima Bello", walletCurrency: "NGN" },
  { daysAgo: 9, type: "transfer", direction: "debit", cat: "p2p", method: "bank", amount: 22000, fee: 200, description: "Birthday gift — Chinedu", counterparty: "Chinedu Eze", counterpartyBank: "Access Bank", walletCurrency: "NGN" },
  { daysAgo: 12, type: "transfer", direction: "debit", cat: "p2p", method: "momo", amount: 9500, fee: 100, description: "Send to Kwame — Ghana", counterparty: "Kwame Mensah", counterpartyBank: "MTN MoMo", provider: "mtn", walletCurrency: "NGN" },

  // --- Auto-save & savings contributions ---
  { daysAgo: 1, type: "transfer", direction: "debit", cat: "savings", method: "wallet", amount: 10000, fee: 0, description: "Auto-save → Emergency Fund", counterparty: "Savings Account", counterpartyBank: "GaexPay", walletCurrency: "NGN" },
  { daysAgo: 7, type: "transfer", direction: "debit", cat: "savings", method: "wallet", amount: 25000, fee: 0, description: "Lagos trip goal contribution", counterparty: "Savings Account", counterpartyBank: "GaexPay", walletCurrency: "NGN" },

  // --- Currency exchange ---
  { daysAgo: 2, type: "exchange", direction: "debit", cat: "general", method: "wallet", amount: 100000, fee: 500, description: "Exchange NGN → USD", counterparty: "GaexPay FX", walletCurrency: "NGN" },
  { daysAgo: 6, type: "exchange", direction: "debit", cat: "general", method: "wallet", amount: 50000, fee: 250, description: "Exchange NGN → GHS", counterparty: "GaexPay FX", walletCurrency: "NGN" },

  // --- Crypto ---
  { daysAgo: 4, type: "exchange", direction: "debit", cat: "crypto", method: "wallet", amount: 60000, fee: 0, description: "Buy USDC", counterparty: "GaexPay Crypto", walletCurrency: "NGN" },
  { daysAgo: 10, type: "exchange", direction: "credit", cat: "crypto", method: "wallet", amount: 25000, fee: 0, description: "Sell USDT → NGN", counterparty: "GaexPay Crypto", walletCurrency: "NGN" },

  // --- Merchant QR payment ---
  { daysAgo: 5, type: "transfer", direction: "debit", cat: "shopping", method: "wallet", amount: 6700, fee: 0, description: "QR payment — The Place Restaurant", counterparty: "The Place Restaurant", counterpartyBank: "GaexPay Merchant", walletCurrency: "NGN" },

  // --- International transfer ---
  { daysAgo: 8, type: "transfer", direction: "debit", cat: "international", method: "bank", amount: 80000, fee: 1500, description: "International transfer — Grace (Kenya)", counterparty: "Grace Mwangi", counterpartyBank: "KCB Bank Kenya", walletCurrency: "NGN" },
];

async function main() {
  console.log(`[${BACKFILL_TAG}] Starting backfill...`);

  const demoUser = await db.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (!demoUser) {
    console.error(`Demo user (${DEMO_EMAIL}) not found. Run bunx tsx prisma/seed.ts first.`);
    process.exit(1);
  }

  // Find the demo user's primary NGN wallet
  let walletNGN = await db.wallet.findFirst({
    where: { userId: demoUser.id, currency: "NGN", type: "primary" },
  });
  if (!walletNGN) {
    walletNGN = await db.wallet.findFirst({ where: { userId: demoUser.id, currency: "NGN" } });
  }
  if (!walletNGN) {
    console.error(`No NGN wallet for demo user. Run seed.ts first.`);
    process.exit(1);
  }

  // Idempotency: delete previous backfill rows for this user.
  // We tag rows with metadata.backfill = BACKFILL_TAG.
  const existing = await db.transaction.findMany({
    where: { userId: demoUser.id, metadata: { contains: BACKFILL_TAG } },
    select: { id: true },
  });
  if (existing.length > 0) {
    console.log(`[${BACKFILL_TAG}] Removing ${existing.length} previous backfill rows...`);
    await db.transaction.deleteMany({ where: { id: { in: existing.map((t) => t.id) } } });
  }

  // Insert new backfill transactions
  console.log(`[${BACKFILL_TAG}] Inserting ${TX_DEFS.length} current-month transactions...`);
  const created = [];
  for (const def of TX_DEFS) {
    const date = daysAgoDate(def.daysAgo);
    const tx = await db.transaction.create({
      data: {
        reference: ref(),
        userId: demoUser.id,
        senderId: def.direction === "debit" ? demoUser.id : null,
        type: def.type,
        direction: def.direction,
        status: "completed",
        amount: def.amount,
        fee: def.fee ?? 0,
        currency: def.currency ?? "NGN",
        description: def.description,
        category: def.cat,
        counterpartyName: def.counterparty,
        counterpartyAccount: def.counterpartyBank ?? "auto",
        counterpartyBank: def.counterpartyBank ?? null,
        method: def.method,
        provider: def.provider ?? null,
        walletId: walletNGN.id,
        riskScore: Math.random() < 0.05 ? rand(0.7, 0.99) : rand(0, 0.25),
        fraudFlag: false,
        metadata: JSON.stringify({ backfill: BACKFILL_TAG, source: "seed-recent-activity" }),
        createdAt: date,
        completedAt: date,
      },
    });
    created.push(tx);
  }

  // Refresh wallet balance: add credits, subtract debits + fees, against the NGN wallet.
  const creditSum = TX_DEFS.filter((d) => d.direction === "credit").reduce((s, d) => s + d.amount, 0);
  const debitSum = TX_DEFS.filter((d) => d.direction === "debit").reduce((s, d) => s + d.amount + (d.fee ?? 0), 0);
  const netChange = creditSum - debitSum;
  const newBalance = Number(walletNGN.balance) + netChange;
  await db.wallet.update({ where: { id: walletNGN.id }, data: { balance: newBalance, ledgerBalance: newBalance } });

  console.log(`[${BACKFILL_TAG}] Done.`);
  console.log(`  Transactions created: ${created.length}`);
  console.log(`  Credits:    ₦${creditSum.toLocaleString()}`);
  console.log(`  Debits:     ₦${debitSum.toLocaleString()}`);
  console.log(`  Net change: ₦${netChange.toLocaleString()}`);
  console.log(`  Wallet ${walletNGN.currency} balance: ₦${Number(walletNGN.balance).toLocaleString()} → ₦${newBalance.toLocaleString()}`);

  // Verify month-start count
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCount = await db.transaction.count({
    where: { userId: demoUser.id, status: "completed", createdAt: { gte: monthStart } },
  });
  console.log(`  Current-month completed tx for demo user: ${monthCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
