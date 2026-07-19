// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { getCryptoPriceMap } from "@/lib/coingecko";
import { GAEX_BASE_PRICE_USD } from "@/lib/gaex-token";

export const dynamic = "force-dynamic";

/** POST /api/staking/stake — stake tokens into a pool. */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
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
    const b = (body ?? {}) as { poolId?: string; amount?: number | string };
    if (!b.poolId || !b.amount) return apiError("poolId and amount are required", 400);

    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("amount must be a positive number", 400);
    }

    const pool = await db.stakingPool.findUnique({ where: { id: b.poolId } });
    if (!pool || !pool.enabled) return apiError("Staking pool not found", 404);
    if (amount < pool.minStake) {
      return apiError(`Minimum stake is ${pool.minStake} ${pool.token}`, 400);
    }

    // Find user's wallet for this currency. For BTC/ETH/USDT/USDC/PI/TRX/BNB/SOL
    // these are stored as type="crypto". GAEX is also stored as type="crypto"
    // since we added it to the CRYPTOCURRENCIES catalog.
    let wallet = await db.wallet.findFirst({
      where: { userId, currency: pool.token, type: "crypto" },
    });
    if (!wallet) {
      // Auto-create an empty wallet for the user if missing (so staking GAEX
      // works even when no prior GAEX wallet exists).
      wallet = await db.wallet.create({
        data: {
          userId,
          currency: pool.token,
          type: "crypto",
          balance: 0,
          label: `${pool.token} Wallet`,
        },
      });
    }

    if (wallet.balance < amount) {
      return apiError(`Insufficient ${pool.token} balance. You have ${wallet.balance}, need ${amount}.`, 400);
    }

    const now = new Date();
    const unlockAt = new Date(now.getTime() + pool.lockPeriodDays * 24 * 60 * 60 * 1000);

    // Atomic: debit wallet, create stake, bump pool totalStaked.
    const [updatedWallet, stake] = await db.$transaction([
      db.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      }),
      db.stake.create({
        data: {
          userId,
          poolId: pool.id,
          amount,
          currency: pool.token,
          rewardsEarned: 0,
          stakedAt: now,
          unlockAt,
          status: "active",
        },
      }),
      db.stakingPool.update({
        where: { id: pool.id },
        data: { totalStaked: { increment: amount } },
      }),
    ]);

    // Price for receipt (USD value at stake time).
    const priceMap = await getCryptoPriceMap().catch(() => ({} as Record<string, number>));
    const usdPrice = pool.token === "GAEX" ? GAEX_BASE_PRICE_USD : (priceMap[pool.token] ?? 0);
    const usdValue = amount * usdPrice;

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "stake.create",
        entity: "stake",
        entityId: stake.id,
        details: JSON.stringify({ poolId: pool.id, token: pool.token, amount, usdValue }),
        severity: "info",
      },
    });

    await db.notification.create({
      data: {
        userId,
        title: "Stake confirmed",
        message: `You staked ${amount} ${pool.token} at ${pool.apy}% APY. Unlocks ${unlockAt.toLocaleDateString()}.`,
        type: "success",
        channel: "in_app",
        actionUrl: "staking",
      },
    });

    return NextResponse.json({
      success: true,
      stake: {
        id: stake.id,
        poolId: stake.poolId,
        amount: stake.amount,
        currency: stake.currency,
        stakedAt: stake.stakedAt,
        unlockAt: stake.unlockAt,
        status: stake.status,
      },
      walletBalanceAfter: updatedWallet.balance,
      unlockAt,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
