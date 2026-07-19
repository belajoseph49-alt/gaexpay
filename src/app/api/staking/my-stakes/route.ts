// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getCryptoPriceMap } from "@/lib/coingecko";
import { GAEX_BASE_PRICE_USD } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/** GET /api/staking/my-stakes — current user's stakes + aggregate stats. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const stakes = await db.stake.findMany({
      where: { userId },
      include: { pool: true },
      orderBy: { stakedAt: "desc" },
    });

    const priceMap = await getCryptoPriceMap().catch(() => ({} as Record<string, number>));
    const now = new Date();

    // Compute live rewards accrued on each active stake.
    const enriched = stakes.map((s) => {
      const elapsedDays = Math.max(
        0,
        (now.getTime() - s.stakedAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const accrued = s.status === "active"
        ? s.amount * (s.pool.apy / 100) * (elapsedDays / 365)
        : s.rewardsEarned;
      const usdPrice = s.currency === "GAEX" ? GAEX_BASE_PRICE_USD : (priceMap[s.currency] ?? 0);
      const usdValue = s.amount * usdPrice;
      const usdRewards = accrued * usdPrice;
      const unlockAt = s.unlockAt;
      const isLocked = now < unlockAt;
      const remainingDays = isLocked
        ? Math.ceil((unlockAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      const progressPct = Math.min(
        100,
        Math.max(
          0,
          ((now.getTime() - s.stakedAt.getTime()) /
            (unlockAt.getTime() - s.stakedAt.getTime())) *
            100,
        ),
      );
      return {
        id: s.id,
        poolId: s.poolId,
        token: s.currency,
        amount: s.amount,
        rewardsEarned: s.rewardsEarned,
        accruedRewards: accrued,
        stakedAt: s.stakedAt,
        unlockAt,
        status: s.status,
        isLocked,
        remainingDays,
        progressPct,
        apy: s.pool.apy,
        lockPeriodDays: s.pool.lockPeriodDays,
        usdPrice,
        usdValue,
        usdRewards,
      };
    });

    const totalStaked = enriched
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.usdValue, 0);
    const totalRewards = enriched.reduce((sum, s) => sum + s.usdRewards, 0);
    const activeCount = enriched.filter((s) => s.status === "active").length;

    return NextResponse.json({
      stakes: enriched,
      stats: {
        totalStakedUSD: totalStaked,
        totalRewardsUSD: totalRewards,
        activeStakes: activeCount,
        totalStakes: enriched.length,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
