// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/social/connections
 *   Returns:
 *     - accepted: list of accepted connections (the other party's profile)
 *     - pending:  incoming pending requests (the requester's profile)
 *     - suggested: users not yet connected to the auth user (for discovery)
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const allConns = await db.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
      include: {
        requester: {
          select: {
            id: true, firstName: true, lastName: true, username: true,
            avatar: true, city: true, country: true, kycStatus: true,
          },
        },
        recipient: {
          select: {
            id: true, firstName: true, lastName: true, username: true,
            avatar: true, city: true, country: true, kycStatus: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const accepted: any[] = [];
    const pending: any[] = [];
    const knownUserIds = new Set<string>([userId]);

    for (const c of allConns) {
      const isRequester = c.requesterId === userId;
      const other = isRequester ? c.recipient : c.requester;
      knownUserIds.add(c.requesterId);
      knownUserIds.add(c.recipientId);
      const item = {
        connectionId: c.id,
        status: c.status,
        createdAt: c.createdAt,
        user: other,
      };
      if (c.status === "accepted") accepted.push(item);
      else if (c.status === "pending" && !isRequester) pending.push(item);
    }

    // Suggested users — active users not yet in any connection with the auth user.
    const candidates = await db.user.findMany({
      where: {
        id: { notIn: Array.from(knownUserIds) },
        status: "active",
      },
      select: {
        id: true, firstName: true, lastName: true, username: true,
        avatar: true, city: true, country: true, kycStatus: true,
        accountType: true,
      },
      take: 12,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      accepted,
      pending,
      suggested: candidates,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * POST /api/social/connections
 * Body: { userId }   (the user to connect with)
 *   Creates a pending connection request. Idempotent: if a prior request
 *   exists in either direction, returns the existing status.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) return apiRateLimited(rl.retryAfterMs);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { userId?: string };
    const targetId = (b.userId || "").trim();
    if (!targetId) return apiError("userId is required", 400);
    if (targetId === userId) return apiError("Cannot connect with yourself", 400);

    const target = await db.user.findUnique({
      where: { id: targetId },
      select: { id: true, status: true },
    });
    if (!target) return apiError("User not found", 404);
    if (target.status !== "active") return apiError("User is not active", 400);

    // Check existing connection in either direction
    const existing = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, recipientId: targetId },
          { requesterId: targetId, recipientId: userId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({
        connection: existing,
        alreadyExists: true,
      });
    }

    const connection = await db.connection.create({
      data: {
        requesterId: userId,
        recipientId: targetId,
        status: "pending",
      },
    });

    // Notify the recipient
    await db.notification.create({
      data: {
        userId: targetId,
        title: "New connection request",
        message: "You have a new connection request on GaexPay Social.",
        type: "info",
        channel: "in_app",
        actionUrl: "social",
      },
    }).catch(() => {/* ignore notif errors */});

    return NextResponse.json({ connection });
  } catch (e) {
    return apiCatch(e);
  }
}
