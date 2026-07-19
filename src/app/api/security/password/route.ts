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
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return apiError("Missing current or new password", 400);
    }
    if (newPassword.length < 8) {
      return apiError("New password must be at least 8 characters", 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) return apiError("User not found", 404);

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return apiError("Incorrect current password", 403);
    }

    const newHash = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Log the security event
    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "security.password_changed",
        entity: "user",
        entityId: userId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (e) {
    return apiCatch(e);
  }
}
