import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { currentPin, newPin } = body;

    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      return apiError("New PIN must be 4 to 6 digits", 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { pinHash: true },
    });

    if (!user) return apiError("User not found", 404);

    if (user.pinHash) {
      if (!currentPin) {
        return apiError("Current PIN is required", 400);
      }
      const isValid = await verifyPassword(currentPin, user.pinHash);
      if (!isValid) {
        return apiError("Incorrect current PIN", 403);
      }
    }

    const newHash = await hashPassword(newPin);

    await db.user.update({
      where: { id: userId },
      data: { pinHash: newHash },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "security.pin_changed",
        entity: "user",
        entityId: userId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, message: "PIN updated successfully" });
  } catch (e) {
    return apiCatch(e);
  }
}
