import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — comprehensive reports
export async function GET(req: Request) {
  const auth = await requirePermission(req, "reports.view");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month"; // day, week, month
  const report = searchParams.get("report") || "all"; // revenue, users, transactions, kyc

  const now = new Date();
  let groupBy: "day" | "week" | "month" = "month";
  if (period === "day") groupBy = "day";
  else if (period === "week") groupBy = "week";

  // Define window
  const days = groupBy === "day" ? 30 : groupBy === "week" ? 84 : 365;
  const since = new Date(now.getTime() - days * 86400000);

  // Fetch users + transactions in window
  const [users, transactions, allUsers, allBiz] = await Promise.all([
    db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, createdAt: true, accountType: true, kycStatus: true, status: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    }),
    db.transaction.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true, reference: true, type: true, direction: true, status: true,
        amount: true, fee: true, currency: true, createdAt: true, fraudFlag: true,
      },
      orderBy: { createdAt: "asc" },
      take: 10000,
    }),
    db.user.count(),
    db.businessProfile.count(),
  ]);

  // Helper to bucket by period
  const bucket = (date: Date) => {
    if (groupBy === "day") return date.toISOString().slice(0, 10);
    if (groupBy === "week") {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().slice(0, 10);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  // Revenue report
  const revenueBuckets: Record<string, { revenue: number; volume: number; count: number }> = {};
  const feeByType: Record<string, number> = {};
  const rate: Record<string, number> = { NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12 };
  for (const t of transactions) {
    if (t.status !== "completed") continue;
    const b = bucket(new Date(t.createdAt));
    if (!revenueBuckets[b]) revenueBuckets[b] = { revenue: 0, volume: 0, count: 0 };
    const r = rate[t.currency] ?? 1;
    revenueBuckets[b].revenue += t.fee * r;
    revenueBuckets[b].volume += t.amount * r;
    revenueBuckets[b].count += 1;
    feeByType[t.type] = (feeByType[t.type] || 0) + t.fee * r;
  }

  // User growth report
  const userBuckets: Record<string, { personal: number; business: number; total: number }> = {};
  for (const u of users) {
    const b = bucket(new Date(u.createdAt));
    if (!userBuckets[b]) userBuckets[b] = { personal: 0, business: 0, total: 0 };
    if (u.accountType === "business") userBuckets[b].business += 1;
    else userBuckets[b].personal += 1;
    userBuckets[b].total += 1;
  }

  // KYC processing
  const kycStats = {
    total: allUsers,
    verified: await db.user.count({ where: { kycStatus: "verified" } }),
    pending: await db.user.count({ where: { kycStatus: "pending" } }),
    rejected: await db.user.count({ where: { kycStatus: "rejected" } }),
    unverified: await db.user.count({ where: { kycStatus: "unverified" } }),
    kybVerified: await db.businessProfile.count({ where: { kybStatus: "verified" } }),
    kybPending: await db.businessProfile.count({ where: { kybStatus: "pending" } }),
    kybRejected: await db.businessProfile.count({ where: { kybStatus: "rejected" } }),
    totalBusinesses: allBiz,
  };

  // Total stats
  const totalRevenue = Object.values(revenueBuckets).reduce((s, b) => s + b.revenue, 0);
  const totalVolume = Object.values(revenueBuckets).reduce((s, b) => s + b.volume, 0);
  const totalTx = Object.values(revenueBuckets).reduce((s, b) => s + b.count, 0);

  return NextResponse.json({
    period,
    report,
    buckets: Object.entries(revenueBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, data]) => ({ bucket, ...data })),
    userBuckets: Object.entries(userBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, data]) => ({ bucket, ...data })),
    feeByType: Object.entries(feeByType).map(([type, value]) => ({ type, value })),
    kycStats,
    summary: {
      totalRevenue,
      totalVolume,
      totalTx,
      newUsers: users.length,
      avgTxValue: totalTx ? totalVolume / totalTx : 0,
    },
    generatedAt: now.toISOString(),
  });
}
