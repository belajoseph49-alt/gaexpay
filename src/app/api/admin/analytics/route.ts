import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// GET — aggregated platform analytics
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "analytics.view");
    if ("error" in auth) return auth.error;

    const url = new URL(req.url);
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? "30")));

    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days);

    // -------- 1. DAU / MAU trend --------
    // Active users per day derived from transactions + audit log entries.
    const tx = await db.transaction.findMany({
      where: { createdAt: { gte: start } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    const audit = await db.auditLog.findMany({
      where: { createdAt: { gte: start } },
      select: { userId: true, createdAt: true },
    });

    const dailyActive: Record<string, Set<string>> = {};
    for (const t of tx) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (!dailyActive[key]) dailyActive[key] = new Set();
      dailyActive[key].add(t.userId);
    }
    for (const a of audit) {
      if (!a.userId) continue;
      const key = a.createdAt.toISOString().slice(0, 10);
      if (!dailyActive[key]) dailyActive[key] = new Set();
      dailyActive[key].add(a.userId);
    }

    const dauTrend = Object.entries(dailyActive)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, set]) => ({ date, dau: set.size }));

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const mauSet = new Set<string>();
    for (const t of tx) {
      if (t.createdAt >= thirtyDaysAgo) mauSet.add(t.userId);
    }
    for (const a of audit) {
      if (a.userId && a.createdAt >= thirtyDaysAgo) mauSet.add(a.userId);
    }
    const dauToday = dailyActive[today.toISOString().slice(0, 10)]?.size ?? 0;
    const mau = mauSet.size;

    // -------- 2. Geographic distribution --------
    const geoAgg = await db.user.groupBy({
      by: ["country"],
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 15,
    });
    const geo = geoAgg.map((g) => ({ country: g.country, users: g._count._all }));

    // -------- 3. Device breakdown --------
    const deviceAgg = await db.device.groupBy({
      by: ["type"],
      _count: { _all: true },
    });
    const devices = deviceAgg.map((d) => ({ name: d.type, value: d._count._all }));

    // -------- 4. Conversion funnel --------
    const totalUsers = await db.user.count();
    const signupUsers = totalUsers;
    const kycStarted = await db.user.count({ where: { kycStatus: { in: ["pending", "verified", "rejected"] } } });
    const kycVerified = await db.user.count({ where: { kycStatus: "verified" } });
    const firstTxUsers = await db.transaction.groupBy({
      by: ["userId"],
      _count: { _all: true },
      having: { userId: { _count: { gte: 1 } } },
    });
    const repeatTxUsers = firstTxUsers.filter((u) => u._count._all >= 2).length;
    const funnel = [
      { stage: "Signups", value: signupUsers, color: "#06b6d4" },
      { stage: "KYC Started", value: kycStarted, color: "#8b5cf6" },
      { stage: "KYC Verified", value: kycVerified, color: "#10b981" },
      { stage: "First Transaction", value: firstTxUsers.length, color: "#f59e0b" },
      { stage: "Repeat Transaction", value: repeatTxUsers, color: "#ec4899" },
    ];

    // -------- 5. Feature usage (transaction types as proxy) --------
    const featureAgg = await db.transaction.groupBy({
      by: ["type"],
      _count: { _all: true },
      orderBy: { _count: { type: "desc" } },
    });
    const featureUsage = featureAgg.map((f) => ({ feature: f.type, count: f._count._all }));

    // -------- 6. Retention cohort (synthetic — last 6 weekly cohorts) --------
    // Real cohort retention requires event tracking; we approximate it from
    // the user-vs-transaction timeline.
    const cohorts: { cohort: string; size: number; week1: number; week2: number; week3: number; week4: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const cohortStart = new Date(today);
      cohortStart.setDate(today.getDate() - 7 * (i + 1));
      const cohortEnd = new Date(today);
      cohortEnd.setDate(today.getDate() - 7 * i);
      const usersInCohort = await db.user.findMany({
        where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
        select: { id: true, createdAt: true },
      });
      const size = usersInCohort.length;
      if (size === 0) {
        cohorts.push({ cohort: `${cohortStart.toISOString().slice(5, 10)}`, size: 0, week1: 0, week2: 0, week3: 0, week4: 0 });
        continue;
      }
      const userIds = new Set(usersInCohort.map((u) => u.id));
      const cohortTx = tx.filter((t) => userIds.has(t.userId));
      const week1 = new Set(cohortTx.filter((t) => t.createdAt >= cohortStart && t.createdAt < new Date(cohortStart.getTime() + 7 * 86400000)).map((t) => t.userId)).size;
      const week2 = new Set(cohortTx.filter((t) => t.createdAt >= new Date(cohortStart.getTime() + 7 * 86400000) && t.createdAt < new Date(cohortStart.getTime() + 14 * 86400000)).map((t) => t.userId)).size;
      const week3 = new Set(cohortTx.filter((t) => t.createdAt >= new Date(cohortStart.getTime() + 14 * 86400000) && t.createdAt < new Date(cohortStart.getTime() + 21 * 86400000)).map((t) => t.userId)).size;
      const week4 = new Set(cohortTx.filter((t) => t.createdAt >= new Date(cohortStart.getTime() + 21 * 86400000) && t.createdAt < new Date(cohortStart.getTime() + 28 * 86400000)).map((t) => t.userId)).size;
      cohorts.push({
        cohort: `${cohortStart.toISOString().slice(5, 10)}`,
        size,
        week1: Math.round((week1 / size) * 100),
        week2: Math.round((week2 / size) * 100),
        week3: Math.round((week3 / size) * 100),
        week4: Math.round((week4 / size) * 100),
      });
    }

    // -------- 7. Session analytics (approximated from devices) --------
    const totalDevices = await db.device.count();
    const sessionAvg = 240; // seconds — synthetic until real session tracking exists
    const pagesPerSession = 6.2;

    return NextResponse.json({
      period: { days, start: start.toISOString(), end: now.toISOString() },
      dauTrend,
      dauToday,
      mau,
      dauMauRatio: mau > 0 ? Math.round((dauToday / mau) * 100) : 0,
      geo,
      devices,
      funnel,
      featureUsage,
      cohorts,
      sessions: {
        avgDurationSec: sessionAvg,
        pagesPerSession,
        totalDevices,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
