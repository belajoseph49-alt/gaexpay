import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** POST /api/referral/redeem
 *
 * Body: { rewardId: string, pointsCost: number, rewardName: string }
 *
 * Validates the user has enough reward points, deducts the cost, creates an
 * audit log entry + a notification, and returns the new points balance.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      rewardId?: string;
      pointsCost?: number | string;
      rewardName?: string;
    };

    const rewardId = typeof b.rewardId === "string" ? b.rewardId : "";
    const rewardName =
      typeof b.rewardName === "string" && b.rewardName.trim().length > 0
        ? b.rewardName.trim()
        : "Reward";
    const pointsCost = Number(b.pointsCost);

    if (!rewardId) return apiError("rewardId required", 400);
    if (!Number.isFinite(pointsCost) || pointsCost <= 0) {
      return apiError("pointsCost must be a positive number", 400);
    }
    if (pointsCost > 1_000_000) {
      return apiError("pointsCost too large", 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { rewardPoints: true, firstName: true, email: true },
    });
    if (!user) return apiError("User not found", 404);

    if (user.rewardPoints < pointsCost) {
      return apiError(
        `Insufficient points. You need ${Math.ceil(pointsCost - user.rewardPoints).toLocaleString()} more.`,
        400,
      );
    }

    const newPoints = Math.round(user.rewardPoints - pointsCost);

    // Deduct points atomically.
    const updated = await db.user.update({
      where: { id: userId },
      data: { rewardPoints: newPoints },
      select: { rewardPoints: true },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Audit trail.
    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "reward.redeem",
        entity: "reward",
        entityId: rewardId,
        ip,
        userAgent,
        details: JSON.stringify({
          rewardId,
          rewardName,
          pointsCost,
          balanceBefore: user.rewardPoints,
          balanceAfter: newPoints,
        }),
        severity: "info",
      },
    });

    // User notification.
    await db.notification.create({
      data: {
        userId,
        title: "Reward redeemed 🎁",
        message: `You redeemed "${rewardName}" for ${Math.round(pointsCost).toLocaleString()} points. Your new balance is ${newPoints.toLocaleString()} points.`,
        type: "success",
        channel: "in_app",
        metadata: JSON.stringify({
          rewardId,
          rewardName,
          pointsCost: Math.round(pointsCost),
          newBalance: newPoints,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      rewardId,
      rewardName,
      pointsCost: Math.round(pointsCost),
      rewardPoints: updated.rewardPoints,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
