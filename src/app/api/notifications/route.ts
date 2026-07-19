import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/notifications — list recent notifications + unread count. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const [notifications, unread] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.notification.count({ where: { userId, isRead: false } }),
    ]);
    return NextResponse.json({ notifications, unread });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/notifications — mark-all-read OR toggle a single notification. */
export async function PATCH(req: Request) {
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
    const b = (body ?? {}) as { markAllRead?: boolean; id?: string; isRead?: boolean };

    if (b.markAllRead) {
      const result = await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, updated: result.count });
    }

    if (!b.id) return apiError("id required", 400);
    const existing = await db.notification.findFirst({ where: { id: b.id, userId } });
    if (!existing) return apiError("Notification not found", 404);

    const n = await db.notification.update({
      where: { id: b.id },
      data: { isRead: b.isRead },
    });
    return NextResponse.json({ notification: n });
  } catch (e) {
    return apiCatch(e);
  }
}
