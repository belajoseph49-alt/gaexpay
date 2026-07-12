import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/conversations/[id]/messages/[msgId]/delete
 * Body: { scope: "me" | "all" }
 *
 * Soft-deletes a message.
 *  - scope="me": sets deletedFor="me" (only hidden for the auth user).
 *  - scope="all": sets deletedFor="all" + clears content (hidden for everyone).
 *    Only the message author can delete for everyone.
 * Returns the updated message.
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
    const scope = body.scope === "all" ? "all" : "me";

    const msg = await db.message.findUnique({ where: { id: msgId }, select: { id: true, senderId: true, conversationId: true, deletedFor: true } });
    if (!msg) return apiError("Message not found", 404);
    if (msg.conversationId !== id) return apiError("Message not in this conversation", 400);

    if (scope === "all") {
      if (msg.senderId !== userId) return apiError("You can only delete your own messages for everyone", 403);
      const updated = await db.message.update({
        where: { id: msgId },
        data: { deletedFor: "all", content: "🚫 This message was deleted", metadata: null, reactions: null },
      });
      return NextResponse.json({ message: updated });
    }

    // scope = "me" — hide only for this user. We store a per-user hide list
    // in metadata as a simple marker, since deletedFor is a single-value
    // field. For simplicity we use a separate "hiddenFor" array in metadata.
    let meta: any = {};
    try { meta = JSON.parse(msg.metadata || "{}"); } catch { meta = {}; }
    const hiddenFor: string[] = Array.isArray(meta.hiddenFor) ? meta.hiddenFor : [];
    if (!hiddenFor.includes(userId)) hiddenFor.push(userId);
    meta.hiddenFor = hiddenFor;
    const updated = await db.message.update({
      where: { id: msgId },
      data: { metadata: JSON.stringify(meta) },
    });
    return NextResponse.json({ message: updated, hiddenForMe: true });
  } catch (e) {
    return apiCatch(e);
  }
}
