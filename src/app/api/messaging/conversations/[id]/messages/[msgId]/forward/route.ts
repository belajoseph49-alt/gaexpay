import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/conversations/[id]/messages/[msgId]/forward
 * Body: { targetConversationIds: string[] }
 *
 * Forwards a message to one or more other conversations. Creates a copy of
 * the message (same kind/content/metadata) in each target conversation,
 * tagged with forwardedFromId = original message id. The auth user must be a
 * participant of both the source and each target conversation.
 * Returns { forwarded: count }.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id, msgId } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const targets: string[] = Array.isArray(body.targetConversationIds) ? body.targetConversationIds : [];
    if (targets.length === 0) return apiError("Select at least one target conversation", 400);
    if (targets.length > 10) return apiError("Can forward to at most 10 conversations", 400);

    const original = await db.message.findUnique({ where: { id: msgId }, select: { id: true, content: true, kind: true, metadata: true, conversationId: true } });
    if (!original) return apiError("Message not found", 404);
    if (original.conversationId !== id) return apiError("Message not in this conversation", 400);
    if (original.kind === "payment" || original.kind === "request" || original.kind === "split") {
      return apiError("Financial messages cannot be forwarded", 400);
    }

    let forwarded = 0;
    for (const targetId of targets) {
      if (targetId === id) continue; // skip same conversation
      const targetCtx = await getConvForUser(targetId, userId);
      if (!targetCtx) continue; // skip if not a participant
      await db.message.create({
        data: {
          conversationId: targetId,
          senderId: userId,
          content: original.content,
          kind: original.kind,
          metadata: original.metadata,
          forwardedFromId: original.id,
          status: "sent",
        },
      });
      await db.conversation.update({ where: { id: targetId }, data: { updatedAt: new Date() } });
      forwarded++;
    }
    return NextResponse.json({ forwarded });
  } catch (e) {
    return apiCatch(e);
  }
}
