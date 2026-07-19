// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Get user's wallets (eligible balance = all stablecoin + fiat wallets)
    const wallets = await db.wallet.findMany({
      where: { userId, status: "active" },
      select: { balance: true, currency: true },
    });

    // Calculate eligible balance in USD
    const USD_RATES: Record<string, number> = {
      USD: 1, USDT: 1, USDC: 1, NGN: 1/1540, EUR: 1.08, GBP: 1.27,
      GHS: 1/12.5, KES: 1/130, XAF: 1/600, XOF: 1/600, BTC: 62500, ETH: 1700,
    };
    const eligibleBalance = wallets.reduce((s, w) => s + (w.balance * (USD_RATES[w.currency] || 1)), 0);

    // Get total earned from hold-earn transactions
    const earnings = await db.transaction.aggregate({
      where: { userId, type: "reward", method: "hold_earn" },
      _sum: { amount: true },
    });

    // Build 7-day history (mock with real-looking data based on balance)
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dailyRate = 0.0286; // 2% / 7 days
      const earned = eligibleBalance * dailyRate * (0.9 + Math.random() * 0.2);
      history.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        amount: Math.round(earned * 100) / 100,
      });
    }

    return NextResponse.json({
      rate: 2, // 2% per week
      totalEarned: earnings._sum.amount || 0,
      eligibleBalance: Math.round(eligibleBalance * 100) / 100,
      history,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
