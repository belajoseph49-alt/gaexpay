// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getCryptoPriceMap } from "@/lib/coingecko";
import { GAEX_BASE_PRICE_USD } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/** GET /api/staking/pools — list all enabled staking pools with live USD values. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const pools = await db.stakingPool.findMany({
      where: { enabled: true },
      orderBy: { apy: "asc" },
      include: {
        _count: { select: { stakes: { where: { status: "active" } } } },
      },
    });

    const priceMap = await getCryptoPriceMap().catch(() => ({} as Record<string, number>));
    const gaexPrice = GAEX_BASE_PRICE_USD;

    // Estimated reward-per-token-per-day (in USD) for the calculator UI.
    const enriched = pools.map((p) => {
      const usdPrice =
        p.token === "GAEX" ? gaexPrice : (priceMap[p.token] ?? 0);
      const dailyApy = p.apy / 365;
      return {
        ...p,
        activeStakers: p._count.stakes,
        usdPrice,
        dailyApy,
        estDailyRewardPerToken: usdPrice * (dailyApy / 100),
        estYearlyRewardPer100USD: p.apy,
      };
    });

    return NextResponse.json({ pools: enriched });
  } catch (e) {
    return apiCatch(e);
  }
}
