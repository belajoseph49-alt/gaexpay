import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/wallets/[id] — wallet detail with transactions + 7-day in/out series. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const wallet = await db.wallet.findFirst({
      where: { id, userId },
    });
    if (!wallet) {
      return apiError("Wallet not found", 404);
    }

    // Get transactions for this wallet's currency (since transactions are linked by currency)
    const transactions = await db.transaction.findMany({
      where: { userId, currency: wallet.currency },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Calculate stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthTx = transactions.filter((t) => new Date(t.createdAt) >= monthStart);
    const monthIn = monthTx.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
    const monthOut = monthTx.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);

    // 7-day series
    const series: { day: string; in: number; out: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start.getTime() + 86400000);
      const dayTx = transactions.filter((t) => new Date(t.createdAt) >= start && new Date(t.createdAt) < end);
      series.push({
        day: start.toLocaleDateString("en", { weekday: "short" }),
        in: dayTx.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
        out: dayTx.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
      });
    }

    return NextResponse.json({
      wallet,
      transactions,
      stats: {
        monthIn,
        monthOut,
        net: monthIn - monthOut,
        txCount: monthTx.length,
      },
      series,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
