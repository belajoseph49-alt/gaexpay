import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/devices — list the user's trusted devices. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const devices = await db.device.findMany({
      where: { userId },
      orderBy: { lastActive: "desc" },
    });
    return NextResponse.json({ devices });
  } catch (e) {
    return apiCatch(e);
  }
}

/** DELETE /api/devices?id=... — revoke a device (sensitive: ends a session). */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return apiError("id required", 400);

    if (id === "all") {
      await db.device.deleteMany({ where: { userId } });
      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "device.revoke_all",
          entity: "device",
          entityId: "all",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({ deviceName: "All Devices", deviceType: "all" }),
          severity: "warning",
        },
      });
      return NextResponse.json({ success: true });
    }

    // Ensure the device belongs to the user before revoking.
    const existing = await db.device.findFirst({ where: { id, userId } });
    if (!existing) return apiError("Device not found", 404);

    await db.device.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "device.revoke",
        entity: "device",
        entityId: id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ deviceName: existing.name, deviceType: existing.type }),
        severity: "warning",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
