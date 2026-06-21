import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePermission(req, "users.view");
  if ("error" in auth) return auth.error;

  const [totalUsers, activeUsers, transactions, metrics, flagged, pendingKyc, openTickets, pendingKyb, openDisputes, totalBusinesses] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "active" } }),
    db.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: { amount: true, fee: true, currency: true, createdAt: true, status: true, type: true, direction: true } }),
    db.adminMetric.findMany(),
    db.transaction.count({ where: { fraudFlag: true } }),
    db.user.count({ where: { kycStatus: "pending" } }),
    db.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
    db.businessProfile.count({ where: { kybStatus: "pending" } }),
    db.dispute.count({ where: { status: { in: ["open", "under_review"] } } }),
    db.businessProfile.count(),
  ]);

  // revenue calc (NGN approx)
  const rate: Record<string, number> = { NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12 };
  const volume = transactions
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + t.amount * (rate[t.currency] ?? 1), 0);
  const feeRevenue = transactions
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + t.fee * (rate[t.currency] ?? 1), 0);

  // last 14 days volume series
  const days: { date: string; volume: number; count: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayTx = transactions.filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd);
    days.push({
      date: dayStart.toISOString().slice(0, 10),
      volume: dayTx.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount * (rate[t.currency] ?? 1), 0),
      revenue: dayTx.filter((t) => t.status === "completed").reduce((s, t) => s + t.fee * (rate[t.currency] ?? 1), 0),
      count: dayTx.length,
    });
  }

  // user growth — last 14 days new signups
  const usersAll = await db.user.findMany({
    select: { createdAt: true, accountType: true, status: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const userGrowth: { date: string; users: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const count = usersAll.filter((u) => u.createdAt >= dayStart && u.createdAt < dayEnd).length;
    userGrowth.push({ date: dayStart.toISOString().slice(0, 10), users: count });
  }

  // type breakdown
  const typeMap: Record<string, number> = {};
  for (const t of transactions) {
    typeMap[t.type] = (typeMap[t.type] || 0) + t.amount * (rate[t.currency] ?? 1);
  }

  // revenue by type (fee)
  const revenueTypeMap: Record<string, number> = {};
  for (const t of transactions) {
    if (t.status !== "completed") continue;
    revenueTypeMap[t.type] = (revenueTypeMap[t.type] || 0) + t.fee * (rate[t.currency] ?? 1);
  }

  return NextResponse.json({
    totalUsers,
    activeUsers,
    suspendedUsers: await db.user.count({ where: { status: "suspended" } }),
    totalBusinesses,
    pendingKyb,
    openDisputes,
    totalTransactions: transactions.length,
    volume,
    feeRevenue,
    flagged,
    pendingKyc,
    openTickets,
    metrics,
    series: days,
    userGrowth,
    typeBreakdown: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
    revenueByType: Object.entries(revenueTypeMap).map(([name, value]) => ({ name, value })),
    systemHealth: {
      apiStatus: "operational",
      uptime: 99.97,
      errorRate: 0.3,
      avgResponseMs: 285,
    },
  });
}
