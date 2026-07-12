import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/messaging/conversations/[id]/messages/[msgId]/edit
 * Body: { content: string }
 *
 * Edits the text content of a message authored by the auth user. Sets
 * `editedAt` to now (so the UI shows "edited"). Only text messages can be
 * edited (not financial/attachment messages). Returns the updated message.
 */
export async function PATCH(
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
    const content = (body.content || "").toString().trim();
    if (!content) return apiError("Content cannot be empty", 400);
    if (content.length > 4000) return apiError("Message too long (max 4000 chars)", 400);

    const msg = await db.message.findUnique({ where: { id: msgId }, select: { id: true, senderId: true, kind: true, conversationId: true } });
    if (!msg) return apiError("Message not found", 404);
    if (msg.conversationId !== id) return apiError("Message not in this conversation", 400);
    if (msg.senderId !== userId) return apiError("You can only edit your own messages", 403);
    if (msg.kind !== "text") return apiError("Only text messages can be edited", 400);

    const updated = await db.message.update({
      where: { id: msgId },
      data: { content, editedAt: new Date() },
    });
    return NextResponse.json({ message: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
