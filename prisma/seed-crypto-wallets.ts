/**
 * Seed crypto wallets for the GaexPay demo user.
 *
 * Idempotent: uses `findFirst` + `create` per (userId, currency, type="crypto")
 * so re-running the script will NOT duplicate or overwrite existing wallets.
 *
 * Run with:
 *   bun run prisma/seed-crypto-wallets.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q";

/** Initial crypto holdings for the demo user. */
const CRYPTO_WALLETS: { code: string; balance: number; label?: string }[] = [
  { code: "BTC", balance: 0.04582 },
  { code: "ETH", balance: 1.2847 },
  { code: "USDT", balance: 2850.5 },
  { code: "USDC", balance: 1240.0 },
  { code: "BNB", balance: 3.582 },
  { code: "SOL", balance: 12.45 },
  { code: "PI", balance: 1850.0 },
  { code: "TRX", balance: 4580.0 },
];

async function main() {
  console.log("Seeding crypto wallets for demo user", DEMO_USER_ID);

  for (const w of CRYPTO_WALLETS) {
    const existing = await db.wallet.findFirst({
      where: { userId: DEMO_USER_ID, currency: w.code, type: "crypto" },
    });

    if (existing) {
      console.log(`  ${w.code.padEnd(5)} ✓ exists (balance: ${existing.balance})`);
      continue;
    }

    const created = await db.wallet.create({
      data: {
        userId: DEMO_USER_ID,
        currency: w.code,
        balance: w.balance,
        ledgerBalance: w.balance,
        type: "crypto",
        label: w.label ?? "Crypto Wallet",
        isDefault: false,
        status: "active",
      },
    });
    console.log(`  ${w.code.padEnd(5)} + created (balance: ${created.balance})`);
  }

  const total = await db.wallet.count({
    where: { userId: DEMO_USER_ID, type: "crypto" },
  });
  console.log(`Done. ${total} crypto wallets present for demo user.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
