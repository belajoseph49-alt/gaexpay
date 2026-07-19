// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/social/connections/[id]
 * Body: { action: "accept" | "reject" }
 *   - accept  → status = "accepted"
 *   - reject  → status = "rejected"
 *
 * Only the recipient of a pending request may take action.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const conn = await db.connection.findUnique({
      where: { id },
      select: { id: true, requesterId: true, recipientId: true, status: true },
    });
    if (!conn) return apiError("Connection not found", 404);
    if (conn.recipientId !== userId) {
      return apiError("Only the recipient can accept or reject a request", 403);
    }
    if (conn.status !== "pending") {
      return apiError(`Connection already ${conn.status}`, 400);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { action?: string };
    const action = b.action;
    if (action !== "accept" && action !== "reject") {
      return apiError("action must be 'accept' or 'reject'", 400);
    }

    const updated = await db.connection.update({
      where: { id },
      data: { status: action === "accept" ? "accepted" : "rejected" },
    });

    if (action === "accept") {
      // Notify the requester their connection was accepted
      await db.notification.create({
        data: {
          userId: conn.requesterId,
          title: "Connection accepted",
          message: "Your connection request was accepted.",
          type: "success",
          channel: "in_app",
          actionUrl: "social",
        },
      }).catch(() => {/* ignore notif errors */});
    }

    return NextResponse.json({ connection: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
