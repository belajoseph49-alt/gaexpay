import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/support — list the user's support tickets with messages. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const tickets = await db.supportTicket.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tickets });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/support — open a new ticket or reply to an existing one. */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
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
      ticketId?: string; content?: string; subject?: string;
      category?: string; priority?: string;
    };
    if (!b.content) return apiError("content is required", 400);

    if (b.ticketId) {
      // Verify ownership before appending a message.
      const ticket = await db.supportTicket.findFirst({ where: { id: b.ticketId, userId } });
      if (!ticket) return apiError("Ticket not found", 404);

      const msg = await db.supportMessage.create({
        data: { ticketId: b.ticketId, userId, senderType: "user", content: b.content },
      });
      return NextResponse.json({ message: msg });
    }

    if (!b.subject) return apiError("subject is required for new tickets", 400);

    const ticket = await db.supportTicket.create({
      data: {
        userId,
        subject: b.subject,
        category: b.category || "general",
        priority: b.priority || "medium",
        status: "open",
        messages: { create: { userId, senderType: "user", content: b.content } },
      },
      include: { messages: true },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "support_ticket.create",
        entity: "support_ticket",
        entityId: ticket.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ subject: ticket.subject, category: ticket.category, priority: ticket.priority }),
        severity: "info",
      },
    });

    return NextResponse.json({ ticket });
  } catch (e) {
    return apiCatch(e);
  }
}
