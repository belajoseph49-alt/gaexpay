import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { createNotification } from "@/lib/notifications-server";

export const dynamic = "force-dynamic";

/** Catalog of rewards that can be redeemed with reward points. */
const REWARD_CATALOG: Record<
  string,
  { name: string; points: number; cashValue?: number; description: string }
> = {
  cash_1000: { name: "Cash Reward", points: 1000, cashValue: 1000, description: "₦1,000 credited to your NGN wallet" },
  free_transfer: { name: "Free Transfer Month", points: 500, description: "Zero-fee transfers for 30 days" },
  netflix: { name: "Netflix Subscription", points: 2500, description: "1-month Netflix subscription voucher" },
  airtime_1800: { name: "Airtime Top-up", points: 1800, cashValue: 2000, description: "₦2,000 airtime top-up" },
  merch_tee: { name: "GaexPay Merch Tee", points: 3000, description: "Limited-edition GaexPay t-shirt (shipped)" },
  vip_support: { name: "VIP Support Access", points: 4000, description: "Priority support queue for 6 months" },
};

/**
 * POST /api/referrals/redeem — redeem a reward from the catalog using
 * rewardPoints. Creates a `promo` notification confirming the redemption.
 *
 * Body: { rewardId: string }
 */
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
    const b = (body ?? {}) as { rewardId?: string };
    if (!b.rewardId) return apiError("rewardId required", 400);

    const reward = REWARD_CATALOG[b.rewardId];
    if (!reward) return apiError("Unknown reward", 400);

    // Fetch the user inside a transaction so the points debit + reward grant
    // are atomic — no race where two concurrent redeems both succeed.
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { rewardPoints: true, firstName: true, referralEarnings: true },
      });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.rewardPoints < reward.points) {
        throw new Error("INSUFFICIENT_POINTS");
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { rewardPoints: { decrement: reward.points } },
        select: { rewardPoints: true },
      });

      // For cash rewards, credit the user's NGN wallet.
      let walletCredited: { id: string; balance: number; currency: string } | null = null;
      if (reward.cashValue) {
        let wallet = await tx.wallet.findFirst({
          where: { userId, currency: "NGN", isDefault: true },
        });
        if (!wallet) {
          wallet = await tx.wallet.findFirst({ where: { userId, currency: "NGN" } });
        }
        if (wallet) {
          const w = await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: reward.cashValue } },
            select: { id: true, balance: true, currency: true },
          });
          walletCredited = w;

          // Record the credit as a transaction so it shows up in the user's
          // activity feed and statements.
          await tx.transaction.create({
            data: {
              reference:
                "GXP" +
                Date.now().toString(36).toUpperCase() +
                Math.random().toString(36).slice(2, 6).toUpperCase(),
              userId,
              type: "reward",
              direction: "credit",
              status: "completed",
              amount: reward.cashValue,
              fee: 0,
              currency: "NGN",
              description: `Reward redemption: ${reward.name}`,
              category: "reward",
              counterpartyName: "GaexPay Rewards",
              method: "wallet",
              walletId: wallet.id,
              completedAt: new Date(),
            },
          });
        }
      }

      return { updated, user, walletCredited };
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "INSUFFICIENT_POINTS") {
        return { error: "Insufficient reward points", status: 400 } as const;
      }
      throw e;
    });

    if (result && typeof result === "object" && "error" in result) {
      return apiError(result.error, result.status);
    }
    if (!result) return apiError("Redemption failed", 500);

    // Audit log the redemption.
    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "referral.redeem",
        entity: "user",
        entityId: userId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          rewardId: b.rewardId,
          rewardName: reward.name,
          pointsSpent: reward.points,
          cashValue: reward.cashValue ?? null,
          walletCredited: result.walletCredited?.id ?? null,
        }),
        severity: "info",
      },
    });

    // Promo notification confirming the redemption.
    await createNotification({
      userId,
      type: "promo",
      title: "Reward redeemed",
      message:
        result.walletCredited
          ? `You redeemed ${reward.points.toLocaleString()} points for "${reward.name}". ₦${reward.cashValue?.toLocaleString()} has been credited to your NGN wallet.`
          : `You redeemed ${reward.points.toLocaleString()} points for "${reward.name}". ${reward.description}.`,
      actionUrl: "/referral",
      metadata: {
        kind: "reward-redeemed",
        rewardId: b.rewardId,
        rewardName: reward.name,
        pointsSpent: reward.points,
        cashValue: reward.cashValue ?? null,
        walletCredited: result.walletCredited?.id ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      reward: { id: b.rewardId, ...reward },
      pointsSpent: reward.points,
      pointsRemaining: result.updated.rewardPoints,
      walletCredited: result.walletCredited,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** GET /api/referrals/redeem — return the reward catalog. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    return NextResponse.json({
      rewards: Object.entries(REWARD_CATALOG).map(([id, r]) => ({ id, ...r })),
    });
  } catch (e) {
    return apiCatch(e);
  }
}
