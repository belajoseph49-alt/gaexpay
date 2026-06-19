import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// ADMIN-ONLY ROUTE — PRODUCTION HARDENING TODO:
//   1. Verify the caller has role === "admin" via requireAuth + role check.
//   2. Gate the route behind an admin rate-limit policy (separate from the
//      user-facing SENSITIVE_LIMIT) so a compromised user token can't
//      enumerate platform-wide metrics.
//   3. Wrap the handler in try/catch + apiCatch to avoid leaking Prisma
//      errors to the client.
//   The DEMO_USER_ID-less impl below is acceptable in the dev/demo build
//   but MUST be hardened before any production deploy.
// ---------------------------------------------------------------------------

export async function GET() {
  const [totalUsers, activeUsers, transactions, metrics, flagged, pendingKyc, openTickets] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "active" } }),
    db.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: { amount: true, fee: true, currency: true, createdAt: true, status: true, type: true, direction: true } }),
    db.adminMetric.findMany(),
    db.transaction.count({ where: { fraudFlag: true } }),
    db.user.count({ where: { kycStatus: "pending" } }),
    db.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
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
  const days: { date: string; volume: number; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayTx = transactions.filter((t) => t.createdAt >= dayStart && t.createdAt < dayEnd);
    days.push({
      date: dayStart.toISOString().slice(0, 10),
      volume: dayTx.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount * (rate[t.currency] ?? 1), 0),
      count: dayTx.length,
    });
  }

  // type breakdown
  const typeMap: Record<string, number> = {};
  for (const t of transactions) {
    typeMap[t.type] = (typeMap[t.type] || 0) + t.amount * (rate[t.currency] ?? 1);
  }

  return NextResponse.json({
    totalUsers,
    activeUsers,
    suspendedUsers: await db.user.count({ where: { status: "suspended" } }),
    totalTransactions: transactions.length,
    volume,
    feeRevenue,
    flagged,
    pendingKyc,
    openTickets,
    metrics,
    series: days,
    typeBreakdown: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
  });
}
