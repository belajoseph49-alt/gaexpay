import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { mfaEnabled, biometricEnabled, twoFactorMethod } = body;

    const data: Record<string, any> = {};

    if (mfaEnabled !== undefined) data.mfaEnabled = Boolean(mfaEnabled);
    if (biometricEnabled !== undefined) data.biometricEnabled = Boolean(biometricEnabled);
    if (twoFactorMethod !== undefined) {
      if (!["authenticator", "sms", "email"].includes(twoFactorMethod)) {
        return apiError("Invalid 2FA method", 400);
      }
      data.twoFactorMethod = twoFactorMethod;
    }

    if (Object.keys(data).length === 0) {
      return apiError("No fields to update", 400);
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
      select: { mfaEnabled: true, biometricEnabled: true, twoFactorMethod: true },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "security.2fa_updated",
        entity: "user",
        entityId: userId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify(data),
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
