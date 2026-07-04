import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/conversations/[id]/messages?since=
 *   Returns all messages in a conversation, ordered oldest→newest.
 *   Optional `since=<iso>` filter returns only messages newer than that timestamp.
 *   Side-effect: marks unread messages from the other participant as "read".
 *
 * POST /api/messaging/conversations/[id]/messages
 * Body: { content }
 *   Creates a new message authored by the authenticated user. Marks earlier
 *   unread messages from the other participant as "read" too (delivered+read).
 */
async function getConversationForUser(conversationId: string, userId: string) {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participantAId: true,
      participantBId: true,
    },
  });
  if (!conv) return null;
  if (conv.participantAId !== userId && conv.participantBId !== userId) {
    return null;
  }
  const otherId =
    conv.participantAId === userId ? conv.participantBId : conv.participantAId;
  return { conv, otherId };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const ctx = await getConversationForUser(id, userId);
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

    // Mark messages from the other participant as read
    await db.message
      .updateMany({
        where: {
          conversationId: id,
          senderId: ctx.otherId,
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
    const ctx = await getConversationForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { content?: string };
    const content = (b.content || "").trim();
    if (!content) return apiError("Message cannot be empty", 400);
    if (content.length > 4000) return apiError("Message too long (max 4000 chars)", 400);

    // Mark earlier messages from the other side as "read" (we're replying → we've seen them)
    await db.message
      .updateMany({
        where: {
          conversationId: id,
          senderId: ctx.otherId,
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
          content,
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
