import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const transactions = await db.transaction.findMany({
    where: { userId: DEMO_USER_ID, status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const thisMonth = transactions.filter((t) => new Date(t.createdAt) >= monthStart);
  const lastMonth = transactions.filter((t) => {
    const d = new Date(t.createdAt);
    return d >= lastMonthStart && d < monthStart;
  });

  const income = thisMonth.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonth.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);
  const lastIncome = lastMonth.filter((t) => t.direction === "credit").reduce((s, t) => s + t.amount, 0);
  const lastExpenses = lastMonth.filter((t) => t.direction === "debit").reduce((s, t) => s + t.amount, 0);

  // Savings rate = (income - expenses) / income
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const lastSavingsRate = lastIncome > 0 ? ((lastIncome - lastExpenses) / lastIncome) * 100 : 0;

  // Expense-to-income ratio
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 100;

  // Category breakdown this month
  const catMap: Record<string, number> = {};
  for (const t of thisMonth) {
    if (t.direction === "debit") {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    }
  }
  const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  // Calculate financial health score (0-100)
  let score = 0;
  // Savings rate (max 30 points)
  score += Math.min(30, Math.max(0, savingsRate * 0.3));
  // Expense ratio (max 25 points) — lower is better
  if (expenseRatio < 50) score += 25;
  else if (expenseRatio < 70) score += 18;
  else if (expenseRatio < 90) score += 10;
  else if (expenseRatio < 100) score += 5;
  // Consistency (max 20 points) — having transactions regularly
  const activeDays = new Set(thisMonth.map((t) => new Date(t.createdAt).toDateString())).size;
  score += Math.min(20, activeDays);
  // Diversity (max 15 points) — multiple categories
  score += Math.min(15, Object.keys(catMap).length * 2.5);
  // Growth (max 10 points) — savings rate improved
  if (savingsRate > lastSavingsRate) score += 10;
  else if (savingsRate > 0) score += 5;

  score = Math.round(Math.min(100, Math.max(0, score)));

  // Determine grade
  let grade: { letter: string; label: string; color: string };
  if (score >= 80) grade = { letter: "A", label: "Excellent", color: "emerald" };
  else if (score >= 65) grade = { letter: "B", label: "Good", color: "teal" };
  else if (score >= 50) grade = { letter: "C", label: "Fair", color: "amber" };
  else if (score >= 35) grade = { letter: "D", label: "Needs Work", color: "orange" };
  else grade = { letter: "F", label: "Poor", color: "rose" };

  // Generate insights
  const insights: { type: string; title: string; message: string; icon: string }[] = [];

  if (savingsRate > 20) {
    insights.push({ type: "positive", title: "Great Savings Rate", message: `You're saving ${savingsRate.toFixed(1)}% of your income this month. Keep it up!`, icon: "💪" });
  } else if (savingsRate > 0) {
    insights.push({ type: "warning", title: "Low Savings", message: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for 20%+ for better financial health.`, icon: "📈" });
  } else {
    insights.push({ type: "critical", title: "Spending Exceeds Income", message: "You're spending more than you earn this month. Review your budget.", icon: "⚠️" });
  }

  if (topCategory) {
    const pct = (topCategory[1] / expenses) * 100;
    if (pct > 40) {
      insights.push({ type: "info", title: "Top Spending Category", message: `${topCategory[0]} accounts for ${pct.toFixed(0)}% of your spending (₦${topCategory[1].toLocaleString()}).`, icon: "📊" });
    }
  }

  const incomeChange = lastIncome > 0 ? ((income - lastIncome) / lastIncome) * 100 : 0;
  if (incomeChange > 5) {
    insights.push({ type: "positive", title: "Income Up", message: `Your income increased ${incomeChange.toFixed(1)}% compared to last month.`, icon: "🎉" });
  } else if (incomeChange < -5) {
    insights.push({ type: "warning", title: "Income Down", message: `Your income decreased ${Math.abs(incomeChange).toFixed(1)}% compared to last month.`, icon: "📉" });
  }

  const expenseChange = lastExpenses > 0 ? ((expenses - lastExpenses) / lastExpenses) * 100 : 0;
  if (expenseChange > 10) {
    insights.push({ type: "warning", title: "Spending Increased", message: `You're spending ${expenseChange.toFixed(1)}% more than last month.`, icon: "💸" });
  } else if (expenseChange < -10) {
    insights.push({ type: "positive", title: "Spending Reduced", message: `You cut spending by ${Math.abs(expenseChange).toFixed(1)}% vs last month. Great job!`, icon: "🎯" });
  }

  // Score breakdown
  const scoreBreakdown = [
    { label: "Savings Rate", value: Math.min(30, Math.max(0, savingsRate * 0.3)), max: 30, icon: "💰" },
    { label: "Expense Control", value: expenseRatio < 50 ? 25 : expenseRatio < 70 ? 18 : expenseRatio < 90 ? 10 : expenseRatio < 100 ? 5 : 0, max: 25, icon: "📉" },
    { label: "Activity", value: Math.min(20, activeDays), max: 20, icon: "📅" },
    { label: "Diversity", value: Math.min(15, Object.keys(catMap).length * 2.5), max: 15, icon: "🔄" },
    { label: "Growth", value: savingsRate > lastSavingsRate ? 10 : savingsRate > 0 ? 5 : 0, max: 10, icon: "📈" },
  ];

  return NextResponse.json({
    score,
    grade,
    savingsRate,
    expenseRatio,
    income,
    expenses,
    incomeChange,
    expenseChange,
    activeDays,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    insights,
    scoreBreakdown,
    categoryCount: Object.keys(catMap).length,
  });
}
