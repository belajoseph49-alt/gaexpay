import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/merchant-dashboard — merchant dashboard for the linked merchant account. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Sensitive — the merchant dashboard exposes revenue + customer PII.
    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    // Use the first merchant as "our" merchant account
    const merchant = await db.merchant.findFirst({ where: { id: "cmqk5ptrr0005l5wvi2x3wc4l" } })
      || await db.merchant.findFirst();

    if (!merchant) {
      return apiError("No merchant found", 404);
    }

    // Get all payment transactions (these represent incoming merchant payments)
    const payments = await db.transaction.findMany({
      where: { userId, type: "payment", status: "completed" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayPayments = payments.filter((p) => new Date(p.createdAt) >= todayStart);
    const weekPayments = payments.filter((p) => new Date(p.createdAt) >= weekStart);
    const monthPayments = payments.filter((p) => new Date(p.createdAt) >= monthStart);

    const todayVolume = todayPayments.reduce((s, p) => s + p.amount, 0);
    const weekVolume = weekPayments.reduce((s, p) => s + p.amount, 0);
    const monthVolume = monthPayments.reduce((s, p) => s + p.amount, 0);
    const totalVolume = payments.reduce((s, p) => s + p.amount, 0);

    // 14-day sales series
    const series: { date: string; volume: number; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start.getTime() + 86400000);
      const dayTx = payments.filter((p) => new Date(p.createdAt) >= start && new Date(p.createdAt) < end);
      series.push({
        date: start.toLocaleDateString("en", { month: "short", day: "numeric" }),
        volume: dayTx.reduce((s, p) => s + p.amount, 0),
        count: dayTx.length,
      });
    }

    // Top customers (by counterparty name)
    const customerMap: Record<string, { count: number; total: number }> = {};
    for (const p of payments) {
      const name = p.counterpartyName || "Walk-in Customer";
      if (!customerMap[name]) customerMap[name] = { count: 0, total: 0 };
      customerMap[name].count++;
      customerMap[name].total += p.amount;
    }
    const topCustomers = Object.entries(customerMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Payment method breakdown
    const methodMap: Record<string, number> = {};
    for (const p of payments) {
      const m = p.method || "wallet";
      methodMap[m] = (methodMap[m] || 0) + p.amount;
    }
    const methodBreakdown = Object.entries(methodMap).map(([name, value]) => ({ name, value }));

    return NextResponse.json({
      merchant,
      stats: {
        todayVolume,
        todayCount: todayPayments.length,
        weekVolume,
        weekCount: weekPayments.length,
        monthVolume,
        monthCount: monthPayments.length,
        totalVolume,
        totalCount: payments.length,
        avgOrderValue: payments.length > 0 ? totalVolume / payments.length : 0,
      },
      recentPayments: payments.slice(0, 10),
      series,
      topCustomers,
      methodBreakdown,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
