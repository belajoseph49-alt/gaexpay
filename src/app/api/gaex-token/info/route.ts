import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getGaexTokenInfo } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/** GET /api/gaex-token/info — token overview, tokenomics, utilities, balance. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const info = await getGaexTokenInfo();

    // User's GAEX balance + how much is locked in active stakes.
    const wallet = await db.wallet.findFirst({
      where: { userId, currency: "GAEX", type: "crypto" },
      select: { balance: true },
    });
    const balance = wallet?.balance ?? 0;

    const lockedInStaking = await db.stake.aggregate({
      where: { userId, status: "active", currency: "GAEX" },
      _sum: { amount: true },
    });
    const locked = lockedInStaking._sum.amount ?? 0;

    return NextResponse.json({
      ...info,
      myBalance: balance,
      myLockedInStaking: locked,
      myAvailable: balance,
      myUsdValue: balance * info.priceUSD,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
