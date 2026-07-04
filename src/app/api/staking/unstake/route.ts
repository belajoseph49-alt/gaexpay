import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { getCryptoPriceMap } from "@/lib/coingecko";
import { GAEX_BASE_PRICE_USD } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/** POST /api/staking/unstake — unstake tokens (only after lock period). */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { stakeId?: string };
    if (!b.stakeId) return apiError("stakeId is required", 400);

    const stake = await db.stake.findUnique({
      where: { id: b.stakeId },
      include: { pool: true },
    });
    if (!stake) return apiError("Stake not found", 404);
    if (stake.userId !== userId) return apiError("Not your stake", 403);
    if (stake.status !== "active") return apiError("Stake already unstaked", 400);

    const now = new Date();
    const isLocked = now < stake.unlockAt;
    if (isLocked) {
      const remainingMs = stake.unlockAt.getTime() - now.getTime();
      const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return apiError(`Lock period not over. ${days} day(s) remaining.`, 400);
    }

    // Compute accrued rewards since staking:
    // rewards = principal × (APY% / 100) × (elapsedDays / 365)
    const elapsedDays = Math.max(
      0,
      (now.getTime() - stake.stakedAt.getTime()) / (24 * 60 * 60 * 1000),
    );
    const rewards = stake.amount * (stake.pool.apy / 100) * (elapsedDays / 365);
    const totalReturn = stake.amount + rewards;

    // Find or create the destination wallet for this currency.
    let wallet = await db.wallet.findFirst({
      where: { userId, currency: stake.currency, type: "crypto" },
    });
    if (!wallet) {
      wallet = await db.wallet.create({
        data: {
          userId,
          currency: stake.currency,
          type: "crypto",
          balance: 0,
          label: `${stake.currency} Wallet`,
        },
      });
    }

    const [updatedWallet, updatedStake, updatedPool] = await db.$transaction([
      db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: totalReturn } },
      }),
      db.stake.update({
        where: { id: stake.id },
        data: { status: "unstaked", rewardsEarned: rewards },
      }),
      db.stakingPool.update({
        where: { id: stake.poolId },
        data: { totalStaked: { decrement: stake.amount } },
      }),
    ]);

    const priceMap = await getCryptoPriceMap().catch(() => ({} as Record<string, number>));
    const usdPrice = stake.currency === "GAEX" ? GAEX_BASE_PRICE_USD : (priceMap[stake.currency] ?? 0);

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "stake.unstake",
        entity: "stake",
        entityId: stake.id,
        details: JSON.stringify({
          token: stake.currency,
          principal: stake.amount,
          rewards,
          totalReturn,
          usdValue: totalReturn * usdPrice,
        }),
        severity: "info",
      },
    });

    await db.notification.create({
      data: {
        userId,
        title: "Unstake complete",
        message: `${totalReturn.toFixed(6)} ${stake.currency} returned to your wallet (+${rewards.toFixed(6)} rewards).`,
        type: "success",
        channel: "in_app",
        actionUrl: "staking",
      },
    });

    return NextResponse.json({
      success: true,
      stake: {
        id: updatedStake.id,
        status: updatedStake.status,
        rewardsEarned: updatedStake.rewardsEarned,
      },
      principal: stake.amount,
      rewards,
      totalReturn,
      walletBalanceAfter: updatedWallet.balance,
      poolTotalStaked: updatedPool.totalStaked,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
