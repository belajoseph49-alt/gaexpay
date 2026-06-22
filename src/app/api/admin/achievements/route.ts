import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Default achievement definitions — used to seed if the table is empty
const DEFAULT_ACHIEVEMENTS = [
  // Onboarding
  { code: "first_steps", name: "First Steps", description: "Create your GaexPay account", icon: "👋", category: "onboarding", rewardPoints: 5, targetCount: 1, rarity: "common" },
  { code: "first_wallet", name: "First Wallet", description: "Create your first wallet", icon: "👛", category: "onboarding", rewardPoints: 10, targetCount: 1, rarity: "common" },
  { code: "first_send", name: "First Transfer", description: "Send your first payment", icon: "💸", category: "onboarding", rewardPoints: 15, targetCount: 1, rarity: "common" },
  { code: "first_beneficiary", name: "Add a Contact", description: "Save your first beneficiary", icon: "👤", category: "onboarding", rewardPoints: 5, targetCount: 1, rarity: "common" },
  { code: "kyc_verified", name: "Verified Identity", description: "Complete KYC verification", icon: "✅", category: "onboarding", rewardPoints: 50, targetCount: 1, rarity: "rare" },
  // Transactions
  { code: "tx_10", name: "Getting Started", description: "Complete 10 transactions", icon: "🔄", category: "transactions", rewardPoints: 20, targetCount: 10, rarity: "common" },
  { code: "tx_50", name: "Active User", description: "Complete 50 transactions", icon: "⚡", category: "transactions", rewardPoints: 100, targetCount: 50, rarity: "rare" },
  { code: "tx_100", name: "Centurion", description: "Complete 100 transactions", icon: "🚀", category: "transactions", rewardPoints: 200, targetCount: 100, rarity: "epic" },
  { code: "tx_500", name: "Transaction Master", description: "Complete 500 transactions", icon: "💎", category: "transactions", rewardPoints: 500, targetCount: 500, rarity: "legendary" },
  // Volume
  { code: "vol_100k", name: "First 100K", description: "Process ₦100,000 in total volume", icon: "💰", category: "volume", rewardPoints: 50, targetCount: 100000, rarity: "rare" },
  { code: "vol_1m", name: "Million Club", description: "Process ₦1,000,000 in total volume", icon: "🏆", category: "volume", rewardPoints: 200, targetCount: 1000000, rarity: "epic" },
  { code: "vol_10m", name: "Tycoon", description: "Process ₦10,000,000 in total volume", icon: "👑", category: "volume", rewardPoints: 1000, targetCount: 10000000, rarity: "legendary" },
  // Social
  { code: "referral_1", name: "Referrer", description: "Invite your first friend", icon: "🎁", category: "social", rewardPoints: 25, targetCount: 1, rarity: "common" },
  { code: "referral_10", name: "Influencer", description: "Invite 10 friends to GaexPay", icon: "⭐", category: "social", rewardPoints: 150, targetCount: 10, rarity: "epic" },
  // Savings
  { code: "savings_goal", name: "Goal Setter", description: "Create your first savings goal", icon: "🎯", category: "savings", rewardPoints: 10, targetCount: 1, rarity: "common" },
  { code: "savings_complete", name: "Goal Achiever", description: "Complete a savings goal", icon: "🎊", category: "savings", rewardPoints: 50, targetCount: 1, rarity: "rare" },
  // Multi-currency
  { code: "multi_currency", name: "Global Citizen", description: "Hold 3 or more currencies", icon: "🌍", category: "wallets", rewardPoints: 30, targetCount: 3, rarity: "rare" },
];

// GET — list all achievement definitions + unlock counts + most popular
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "achievements.view");
    if ("error" in auth) return auth.error;

    // Seed defaults if table is empty
    let achievements = await db.achievement.findMany({
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { unlocks: true } } },
    });

    if (achievements.length === 0) {
      await db.achievement.createMany({
        data: DEFAULT_ACHIEVEMENTS.map((a) => ({
          code: a.code,
          name: a.name,
          description: a.description,
          icon: a.icon,
          category: a.category,
          rewardPoints: a.rewardPoints,
          targetCount: a.targetCount,
          rarity: a.rarity,
          enabled: true,
        })),
      });
      achievements = await db.achievement.findMany({
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { unlocks: true } } },
      });
    }

    // Compute total unlocks (from UserAchievement table)
    const totalUnlocks = await db.userAchievement.count();

    // Recent unlocks (latest 20) — for "recently unlocked" feed
    const recentUnlocks = await db.userAchievement.findMany({
      orderBy: { unlockedAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        achievement: {
          select: { id: true, name: true, icon: true, rewardPoints: true, category: true, rarity: true },
        },
      },
    });

    const mapped = achievements.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      rewardPoints: a.rewardPoints,
      targetCount: a.targetCount,
      rarity: a.rarity,
      enabled: a.enabled,
      unlockedCount: a._count.unlocks,
      createdAt: a.createdAt,
    }));

    const mostPopular = [...mapped]
      .sort((a, b) => b.unlockedCount - a.unlockedCount)
      .slice(0, 5);

    const stats = {
      total: mapped.length,
      enabled: mapped.filter((a) => a.enabled).length,
      disabled: mapped.filter((a) => !a.enabled).length,
      totalUnlocks,
      byRarity: ["common", "rare", "epic", "legendary"].map((r) => ({
        rarity: r,
        count: mapped.filter((a) => a.rarity === r).length,
      })),
      byCategory: Array.from(new Set(mapped.map((a) => a.category))).map((c) => ({
        category: c,
        count: mapped.filter((a) => a.category === c).length,
      })),
    };

    return NextResponse.json({
      achievements: mapped,
      mostPopular,
      recentUnlocks,
      stats,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// POST — create a new achievement definition
export async function POST(req: Request) {
  try {
    const auth = await requirePermission(req, "achievements.create");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const {
      code, name, description, icon, category, rewardPoints, targetCount, rarity,
    } = body as {
      code?: string;
      name?: string;
      description?: string;
      icon?: string;
      category?: string;
      rewardPoints?: number;
      targetCount?: number;
      rarity?: string;
    };

    if (!code) return apiError("Achievement code is required", 400);
    if (!name) return apiError("Achievement name is required", 400);

    // Check for existing code
    const existing = await db.achievement.findUnique({ where: { code } });
    if (existing) return apiError("Achievement with this code already exists", 409);

    const achievement = await db.achievement.create({
      data: {
        code,
        name,
        description: description || "",
        icon: icon || "🏆",
        category: category || "general",
        rewardPoints: typeof rewardPoints === "number" ? rewardPoints : 0,
        targetCount: typeof targetCount === "number" ? targetCount : 1,
        rarity: rarity || "common",
        enabled: true,
      },
    });

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "achievement.create",
        entity: "Achievement",
        entityId: achievement.id,
        severity: "info",
        details: JSON.stringify({ code, name, category }),
      },
    });

    return NextResponse.json({ success: true, achievement }, { status: 201 });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — toggle enabled / update reward / delete
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "toggle";

    let perm: string;
    switch (action) {
      case "toggle":
        perm = "achievements.edit";
        break;
      case "update":
        perm = "achievements.edit";
        break;
      case "delete":
        perm = "achievements.delete";
        break;
      default:
        return apiError("Unknown action", 400);
    }

    const auth = await requirePermission(req, perm);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { achievementId, enabled, name, description, icon, category, rewardPoints, targetCount, rarity } = body as {
      achievementId?: string;
      enabled?: boolean;
      name?: string;
      description?: string;
      icon?: string;
      category?: string;
      rewardPoints?: number;
      targetCount?: number;
      rarity?: string;
    };

    if (!achievementId) return apiError("achievementId is required", 400);

    const achievement = await db.achievement.findUnique({ where: { id: achievementId } });
    if (!achievement) return apiError("Achievement not found", 404);

    if (action === "toggle") {
      const updated = await db.achievement.update({
        where: { id: achievementId },
        data: { enabled: !achievement.enabled },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "achievement.toggle",
          entity: "Achievement",
          entityId: achievementId,
          severity: "warning",
          details: JSON.stringify({ code: achievement.code, enabled: updated.enabled }),
        },
      });
      return NextResponse.json({ success: true, achievement: updated });
    }

    if (action === "update") {
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (icon) updates.icon = icon;
      if (category) updates.category = category;
      if (typeof rewardPoints === "number") updates.rewardPoints = rewardPoints;
      if (typeof targetCount === "number") updates.targetCount = targetCount;
      if (rarity) updates.rarity = rarity;
      const updated = await db.achievement.update({
        where: { id: achievementId },
        data: updates,
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "achievement.update",
          entity: "Achievement",
          entityId: achievementId,
          severity: "info",
          details: JSON.stringify(updates),
        },
      });
      return NextResponse.json({ success: true, achievement: updated });
    }

    if (action === "delete") {
      // Cascade deletes UserAchievement rows via onDelete: Cascade
      await db.achievement.delete({ where: { id: achievementId } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "achievement.delete",
          entity: "Achievement",
          entityId: achievementId,
          severity: "warning",
          details: JSON.stringify({ code: achievement.code, name: achievement.name }),
        },
      });
      return NextResponse.json({ success: true });
    }

    return apiError("Unknown action", 400);
  } catch (e) {
    return apiCatch(e);
  }
}
