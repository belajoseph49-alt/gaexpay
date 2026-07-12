import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/conversations/[id]/messages?since=
 *   Returns all messages in a conversation, ordered oldest→newest.
 *   Optional `since=<iso>` filter returns only messages newer than that timestamp.
 *   Side-effect: marks unread messages from the other participant as "read".
 *
 * POST /api/messaging/conversations/[id]/messages
 * Body: { content, replyToId?, kind?, metadata? }
 *   Creates a new message authored by the authenticated user. Marks earlier
 *   unread messages from the other participant as "read" too (delivered+read).
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");
    const since =
      sinceParam && !Number.isNaN(Date.parse(sinceParam))
        ? new Date(sinceParam)
        : undefined;

    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        ...(since ? { createdAt: { gt: since } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    // Mark messages from other participants as read (1-to-1: just the other
    // user; group: everyone except the auth user)
    await db.message
      .updateMany({
        where: {
          conversationId: id,
          senderId: { not: userId },
          status: { in: ["sent", "delivered"] },
        },
        data: { status: "read" },
      })
      .catch(() => {/* ignore */});

    return NextResponse.json({ messages });
  } catch (e) {
    return apiCatch(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) return apiRateLimited(rl.retryAfterMs);

    const { id } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { content?: string; replyToId?: string; kind?: string; metadata?: any };
    const content = (b.content || "").trim();
    const kind = (b.kind || "text").toString();
    const replyToId = b.replyToId ? String(b.replyToId) : null;
    const metadata = b.metadata ? JSON.stringify(b.metadata) : null;

    // Allow empty content for attachment messages (voice/image/etc.)
    if (!content && kind === "text") return apiError("Message cannot be empty", 400);
    if (content.length > 4000) return apiError("Message too long (max 4000 chars)", 400);

    // Validate replyToId belongs to this conversation
    if (replyToId) {
      const reply = await db.message.findUnique({ where: { id: replyToId }, select: { conversationId: true } });
      if (!reply || reply.conversationId !== id) return apiError("Reply target not in this conversation", 400);
    }

    // Mark earlier messages from others as "read" (we're replying → we've seen them)
    await db.message
      .updateMany({
        where: {
          conversationId: id,
          senderId: { not: userId },
          status: { in: ["sent", "delivered"] },
        },
        data: { status: "read" },
      })
      .catch(() => {/* ignore */});

    const [message] = await db.$transaction([
      db.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: content || "",
          kind,
          metadata,
          replyToId,
          status: "sent",
        },
      }),
      db.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ message });
  } catch (e) {
    return apiCatch(e);
  }
}
