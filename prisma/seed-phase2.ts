import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding Phase 2: Savings Goals, Budgets, Scheduled Transfers...");

  // Clean
  await db.savingsContribution.deleteMany();
  await db.savingsGoal.deleteMany();
  await db.budget.deleteMany();
  await db.scheduledTransfer.deleteMany();

  // ---- Savings Goals ----
  const goals = [
    { name: "Lagos to Dubai Vacation", targetAmount: 2500000, currentAmount: 1850000, currency: "NGN", icon: "✈️", color: "sky", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 75) },
    { name: "New MacBook Pro", targetAmount: 1800000, currentAmount: 1240000, currency: "NGN", icon: "💻", color: "violet", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45) },
    { name: "Emergency Fund", targetAmount: 5000000, currentAmount: 3200000, currency: "NGN", icon: "🛡️", color: "emerald", deadline: null },
    { name: "Wedding Savings", targetAmount: 8000000, currentAmount: 2100000, currency: "NGN", icon: "💍", color: "rose", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) },
    { name: "Tesla Model 3", targetAmount: 28000000, currentAmount: 5400000, currency: "NGN", icon: "🚗", color: "amber", deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 540) },
  ];

  for (const g of goals) {
    const goal = await db.savingsGoal.create({
      data: {
        userId: DEMO_USER_ID,
        ...g,
        status: g.currentAmount >= g.targetAmount ? "completed" : "active",
        autoSaveAmount: pick([10000, 25000, 50000]),
        autoSaveDay: pick([1, 5, 15, 28]),
      },
    });
    // add some contribution history
    const contribCount = Math.floor(rand(3, 9));
    for (let i = 0; i < contribCount; i++) {
      await db.savingsContribution.create({
        data: {
          goalId: goal.id,
          amount: Math.round(rand(5000, 100000)),
          type: "deposit",
          note: pick(["Monthly auto-save", "Bonus contribution", "Round-up savings", "Manual deposit"]),
          createdAt: new Date(Date.now() - rand(0, 1000 * 60 * 60 * 24 * 90)),
        },
      });
    }
  }

  // ---- Budgets ----
  const budgets = [
    { category: "Food & Dining", limit: 150000, spent: 98400, color: "amber" },
    { category: "Transport", limit: 80000, spent: 71200, color: "sky" },
    { category: "Shopping", limit: 200000, spent: 178500, color: "violet" },
    { category: "Bills & Utilities", limit: 120000, spent: 84300, color: "emerald" },
    { category: "Entertainment", limit: 60000, spent: 52100, color: "rose" },
    { category: "Health", limit: 50000, spent: 12800, color: "teal" },
  ];
  for (const b of budgets) {
    await db.budget.create({
      data: {
        userId: DEMO_USER_ID,
        category: b.category,
        limit: b.limit,
        spent: b.spent,
        currency: "NGN",
        period: "monthly",
        alertThreshold: 80,
      },
    });
  }

  // ---- Scheduled Transfers ----
  const scheduled = [
    { recipientName: "Landlord - Mr. Adeyemi", recipientAccount: "0123456789", recipientBank: "Access Bank", method: "bank", amount: 450000, currency: "NGN", note: "Monthly rent", frequency: "monthly", nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12) },
    { recipientName: "Mom", recipientAccount: "+2348033344556", recipientBank: "MTN MoMo", method: "momo", provider: "mtn", amount: 50000, currency: "NGN", note: "Monthly support", frequency: "monthly", nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5) },
    { recipientName: "Savings Account", recipientAccount: "0246813579", recipientBank: "GTBank", method: "bank", amount: 100000, currency: "NGN", note: "Auto-save", frequency: "weekly", nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3) },
    { recipientName: "Netflix Subscription", recipientAccount: "auto", recipientBank: "Card", method: "card", amount: 5500, currency: "NGN", note: "Netflix", frequency: "monthly", nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8) },
    { recipientName: "Staff - Grace", recipientAccount: "gaexpay@grace", recipientBank: "GaexPay", method: "wallet", amount: 85000, currency: "NGN", note: "Salary", frequency: "monthly", nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18) },
  ];
  for (const s of scheduled) {
    await db.scheduledTransfer.create({
      data: {
        userId: DEMO_USER_ID,
        ...s,
        status: "active",
        totalRuns: Math.floor(rand(1, 12)),
        lastRunAt: new Date(Date.now() - rand(1000 * 60 * 60 * 24 * 5, 1000 * 60 * 60 * 24 * 30)),
      },
    });
  }

  console.log(`✅ Seeded: ${goals.length} savings goals, ${budgets.length} budgets, ${scheduled.length} scheduled transfers`);
}

main().catch(console.error).finally(() => db.$disconnect());
