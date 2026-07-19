// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

/** GET /api/disputes — list the user's disputes. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const disputes = await db.dispute.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    const open = disputes.filter((d) => d.status === "open" || d.status === "under_review").length;
    return NextResponse.json({ disputes, open });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/disputes — file a new dispute (also opens a linked support ticket). */
export async function POST(req: Request) {
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
    const b = (body ?? {}) as {
      transactionId?: string; transactionRef?: string; reason?: string;
      description?: string; priority?: string;
    };
    if (!b.transactionId || !b.reason || !b.description) {
      return apiError("transactionId, reason, and description are required", 400);
    }

    const dispute = await db.dispute.create({
      data: {
        userId,
        transactionId: b.transactionId,
        transactionRef: b.transactionRef,
        reason: b.reason,
        description: b.description,
        priority: b.priority || "medium",
        status: "open",
      },
    });
    await db.notification.create({
      data: {
        userId,
        title: "Dispute filed",
        message: `Your dispute for transaction ${b.transactionRef} has been received. We'll review it within 48 hours.`,
        type: "warning",
        channel: "push",
      },
    });
    await db.supportTicket.create({
      data: {
        userId,
        subject: `Dispute: ${b.transactionRef}`,
        category: "transaction",
        priority: b.priority || "medium",
        status: "open",
        messages: {
          create: {
            userId,
            senderType: "user",
            content: `Dispute reason: ${b.reason}. ${b.description}`,
          },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "dispute.create",
        entity: "dispute",
        entityId: dispute.id,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          transactionId: b.transactionId,
          transactionRef: b.transactionRef,
          reason: b.reason,
          priority: b.priority || "medium",
        }),
        severity: "warning",
      },
    });

    return NextResponse.json({ dispute });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/disputes — update dispute status (typically user withdrawing a dispute). */
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
    const b = (body ?? {}) as { id?: string; status?: string };
    if (!b.id) return apiError("id required", 400);

    const existing = await db.dispute.findFirst({ where: { id: b.id, userId } });
    if (!existing) return apiError("Dispute not found", 404);

    const dispute = await db.dispute.update({
      where: { id: b.id },
      data: { ...(b.status && { status: b.status }) },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "dispute.update",
        entity: "dispute",
        entityId: dispute.id,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ previousStatus: existing.status, newStatus: b.status }),
        severity: "info",
      },
    });

    return NextResponse.json({ dispute });
  } catch (e) {
    return apiCatch(e);
  }
}
