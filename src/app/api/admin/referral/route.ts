import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Default referral program settings (used if not configured in SystemSetting)
const DEFAULT_SETTINGS = {
  commissionRatePct: 5,      // referrer earns 5% of referral's transaction fees
  signupBonusAmount: 500,    // NGN credited to referrer on referee's first tx
  minPayoutThreshold: 5000,  // NGN minimum balance before payout
  referralRewardPoints: 50,  // reward points awarded on unlock
  rewardPointsPerReferral: 10,
};

async function loadSettings() {
  const rows = await db.systemSetting.findMany({
    where: { category: "referral" },
  });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    commissionRatePct: Number(map.referral_commission_rate_pct ?? DEFAULT_SETTINGS.commissionRatePct),
    signupBonusAmount: Number(map.referral_signup_bonus ?? DEFAULT_SETTINGS.signupBonusAmount),
    minPayoutThreshold: Number(map.referral_min_payout ?? DEFAULT_SETTINGS.minPayoutThreshold),
    referralRewardPoints: Number(map.referral_reward_points ?? DEFAULT_SETTINGS.referralRewardPoints),
    rewardPointsPerReferral: Number(map.referral_points_per_referral ?? DEFAULT_SETTINGS.rewardPointsPerReferral),
  };
}

// GET — referral stats, top referrers, reward distribution, settings
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "referral.view");
    if ("error" in auth) return auth.error;

    // Find users that have referred at least one person OR have referral codes
    const referrers = await db.user.findMany({
      where: {
        OR: [
          { referralCount: { gt: 0 } },
          { referralEarnings: { gt: 0 } },
          { referralCode: { not: null } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referralCode: true,
        referralCount: true,
        referralEarnings: true,
        rewardPoints: true,
        createdAt: true,
      },
      orderBy: { referralCount: "desc" },
      take: 100,
    });

    const totalReferrals = referrers.reduce((s, u) => s + (u.referralCount || 0), 0);
    const totalPaidOut = referrers.reduce((s, u) => s + (u.referralEarnings || 0), 0);
    const activeReferrers = referrers.filter((u) => (u.referralCount || 0) > 0).length;

    // Conversion = referrals / users with referral codes
    const usersWithCodes = referrers.length;
    const conversionRate = usersWithCodes > 0
      ? Math.round((activeReferrers / usersWithCodes) * 1000) / 10
      : 0;

    // Top referrers (already ordered by referralCount desc)
    const topReferrers = referrers.slice(0, 10).map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      referralCode: u.referralCode,
      referralsCount: u.referralCount,
      earnings: u.referralEarnings,
      rewardPoints: u.rewardPoints,
    }));

    // Reward distribution by tier
    const tiers = [
      { tier: "Bronze", min: 1, max: 4, count: 0 },
      { tier: "Silver", min: 5, max: 14, count: 0 },
      { tier: "Gold", min: 15, max: 49, count: 0 },
      { tier: "Platinum", min: 50, max: Infinity, count: 0 },
    ];
    for (const u of referrers) {
      const c = u.referralCount || 0;
      for (const t of tiers) {
        if (c >= t.min && c <= t.max) { t.count++; break; }
      }
    }
    const rewardDistribution = tiers.map((t) => ({ tier: t.tier, count: t.count }));

    // Reward points leaderboard (top 10)
    const pointsLeaders = await db.user.findMany({
      where: { rewardPoints: { gt: 0 } },
      select: {
        id: true, firstName: true, lastName: true,
        rewardPoints: true, referralCount: true,
      },
      orderBy: { rewardPoints: "desc" },
      take: 10,
    });

    const settings = await loadSettings();

    return NextResponse.json({
      stats: {
        totalReferrals,
        totalPaidOut,
        activeReferrers,
        conversionRate,
        totalUsersWithCodes: usersWithCodes,
      },
      topReferrers,
      rewardDistribution,
      pointsLeaders,
      settings,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — update referral program settings (commission rate, bonus amount, etc.)
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "referral.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const {
      commissionRatePct, signupBonusAmount, minPayoutThreshold,
      referralRewardPoints, rewardPointsPerReferral,
    } = body as {
      commissionRatePct?: number;
      signupBonusAmount?: number;
      minPayoutThreshold?: number;
      referralRewardPoints?: number;
      rewardPointsPerReferral?: number;
    };

    const updates: { key: string; value: string }[] = [];
    if (typeof commissionRatePct === "number") {
      updates.push({ key: "referral_commission_rate_pct", value: String(commissionRatePct) });
    }
    if (typeof signupBonusAmount === "number") {
      updates.push({ key: "referral_signup_bonus", value: String(signupBonusAmount) });
    }
    if (typeof minPayoutThreshold === "number") {
      updates.push({ key: "referral_min_payout", value: String(minPayoutThreshold) });
    }
    if (typeof referralRewardPoints === "number") {
      updates.push({ key: "referral_reward_points", value: String(referralRewardPoints) });
    }
    if (typeof rewardPointsPerReferral === "number") {
      updates.push({ key: "referral_points_per_referral", value: String(rewardPointsPerReferral) });
    }

    if (updates.length === 0) return apiError("No settings provided", 400);

    // Validate numeric ranges
    for (const u of updates) {
      const v = Number(u.value);
      if (Number.isNaN(v) || v < 0) return apiError(`Invalid value for ${u.key}`, 400);
    }

    // Upsert each setting
    await Promise.all(
      updates.map((u) =>
        db.systemSetting.upsert({
          where: { key: u.key },
          update: { value: u.value, category: "referral" },
          create: { key: u.key, value: u.value, category: "referral" },
        }),
      ),
    );

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "referral.update_settings",
        entity: "SystemSetting",
        severity: "warning",
        details: JSON.stringify(updates),
      },
    });

    const settings = await loadSettings();
    return NextResponse.json({ success: true, settings });
  } catch (e) {
    return apiCatch(e);
  }
}
