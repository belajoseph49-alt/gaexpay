import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import {
  getSetting,
  setSetting,
  ensureSetting,
  DEFAULT_KYC_TIERS,
} from "@/lib/system-settings";

export const dynamic = "force-dynamic";

// GET — KYC tier configs for personal and business accounts
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "limits.view");
    if ("error" in auth) return auth.error;

    const [personal, business] = await Promise.all([
      ensureSetting("kyc.tiers.personal", DEFAULT_KYC_TIERS.personal, "kyc"),
      ensureSetting("kyc.tiers.business", DEFAULT_KYC_TIERS.business, "kyc"),
    ]);

    // Real user distribution by tier
    const distribution = await db.user.groupBy({
      by: ["kycTier"],
      _count: { _all: true },
    });
    const userCounts: Record<number, number> = {};
    for (const r of distribution) userCounts[r.kycTier] = r._count._all;

    return NextResponse.json({
      personal,
      business,
      userCounts,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// PATCH — update limits for a specific tier (body: { accountType, tier, updates })
export async function PATCH(req: Request) {
  try {
    const auth = await requirePermission(req, "limits.edit");
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { accountType, tier, updates } = body as {
      accountType: "personal" | "business";
      tier: number;
      updates: Record<string, unknown>;
    };

    if (!accountType || typeof tier !== "number" || !updates) {
      return NextResponse.json({ error: "accountType, tier, updates required" }, { status: 400 });
    }

    const settingKey = `kyc.tiers.${accountType}`;
    const list = (await getSetting<any[]>(settingKey)) ?? [];
    const idx = list.findIndex((t) => t.tier === tier);
    if (idx === -1) return NextResponse.json({ error: "Tier not found" }, { status: 404 });

    const before = { ...list[idx] };
    list[idx] = { ...list[idx], ...updates, tier: list[idx].tier };
    await setSetting(settingKey, list, "kyc");

    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "limits.tier.update",
        entity: "SystemSetting",
        entityId: `${accountType}-${tier}`,
        severity: "warning",
        details: JSON.stringify({ accountType, tier, before, after: list[idx] }),
      },
    });

    return NextResponse.json({ success: true, tier: list[idx] });
  } catch (e) {
    return apiCatch(e);
  }
}
