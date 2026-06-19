import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const transactions = await db.transaction.findMany({
    where: { userId: DEMO_USER_ID, status: "completed" },
    orderBy: { createdAt: "asc" },
  });

  // Calculate score for each of the last 6 months
  const months: {
    month: string;
    label: string;
    score: number;
    savingsRate: number;
    income: number;
    expenses: number;
    activeDays: number;
    txCount: number;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

    const monthTx = transactions.filter((t) => {
      const d = new Date(t.createdAt);
      return d >= monthStart && d < monthEnd;
    });

    const income = monthTx.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const expenseRatio = income > 0 ? (expenses / income) * 100 : 100;
    const activeDays = new Set(monthTx.map((t) => new Date(t.createdAt).toDateString())).size;

    // Category count
    const catMap: Record<string, number> = {};
    for (const t of monthTx) {
      if (t.direction === "debit") {
        catMap[t.category] = (catMap[t.category] || 0) + 1;
      }
    }
    const categoryCount = Object.keys(catMap).length;

    // Calculate score (same algorithm as insights API)
    let score = 0;
    score += Math.min(30, Math.max(0, savingsRate * 0.3));
    if (expenseRatio < 50) score += 25;
    else if (expenseRatio < 70) score += 18;
    else if (expenseRatio < 90) score += 10;
    else if (expenseRatio < 100) score += 5;
    score += Math.min(20, activeDays);
    score += Math.min(15, categoryCount * 2.5);
    // Growth: compare to previous month
    if (i < 5) {
      const prev = months[months.length - 1];
      if (prev && savingsRate > prev.savingsRate) score += 10;
      else if (savingsRate > 0) score += 5;
    } else {
      if (savingsRate > 0) score += 5;
    }
    score = Math.round(Math.min(100, Math.max(0, score)));

    months.push({
      month: monthStart.toISOString().slice(0, 7),
      label: monthStart.toLocaleDateString("en", { month: "short", year: "2-digit" }),
      score,
      savingsRate: Math.round(savingsRate * 10) / 10,
      income,
      expenses,
      activeDays,
      txCount: monthTx.length,
    });
  }

  // Calculate trend
  const currentScore = months[months.length - 1]?.score || 0;
  const prevScore = months[months.length - 2]?.score || 0;
  const trend = currentScore - prevScore;
  const avgScore = Math.round(months.reduce((s, m) => s + m.score, 0) / months.length);
  const bestScore = Math.max(...months.map((m) => m.score));
  const worstScore = Math.min(...months.map((m) => m.score));

  return NextResponse.json({
    months,
    currentScore,
    trend,
    avgScore,
    bestScore,
    worstScore,
  });
}
