import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM format, defaults to current month
  const now = new Date();
  const year = month ? parseInt(month.split("-")[0]) : now.getFullYear();
  const mon = month ? parseInt(month.split("-")[1]) - 1 : now.getMonth();

  const startDate = new Date(year, mon, 1);
  const endDate = new Date(year, mon + 1, 1);

  const user = await db.user.findUnique({
    where: { id: DEMO_USER_ID },
    select: { firstName: true, lastName: true, email: true, phone: true, address: true, country: true },
  });

  const wallets = await db.wallet.findMany({
    where: { userId: DEMO_USER_ID },
  });

  const transactions = await db.transaction.findMany({
    where: {
      userId: DEMO_USER_ID,
      createdAt: { gte: startDate, lt: endDate },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalIn = transactions.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.reduce((s, t) => s + t.fee, 0);
  const completedCount = transactions.filter((t) => t.status === "completed").length;

  // Category breakdown
  const catMap: Record<string, { count: number; amount: number }> = {};
  for (const t of transactions) {
    if (t.status !== "completed") continue;
    if (!catMap[t.category]) catMap[t.category] = { count: 0, amount: 0 };
    catMap[t.category].count++;
    catMap[t.category].amount += t.amount;
  }
  const categories = Object.entries(catMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.amount - a.amount);

  const monthName = startDate.toLocaleDateString("en", { month: "long", year: "numeric" });

  return NextResponse.json({
    user,
    wallets,
    transactions,
    summary: {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      totalFees,
      completedCount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      monthName,
    },
    categories,
    generatedAt: new Date().toISOString(),
  });
}
