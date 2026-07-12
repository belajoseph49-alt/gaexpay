import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/conversations/[id]/messages/[msgId]/pin
 *
 * Toggles the pinned state of a message in the conversation. Pinned messages
 * appear at the top of the chat thread. Returns the updated pinned status.
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

    const msg = await db.message.findUnique({ where: { id: msgId }, select: { id: true, pinned: true, conversationId: true } });
    if (!msg) return apiError("Message not found", 404);
    if (msg.conversationId !== id) return apiError("Message not in this conversation", 400);

    // Limit to 3 pinned messages per conversation
    if (!msg.pinned) {
      const pinnedCount = await db.message.count({ where: { conversationId: id, pinned: true } });
      if (pinnedCount >= 3) return apiError("You can pin up to 3 messages per conversation", 400);
    }

    const updated = await db.message.update({
      where: { id: msgId },
      data: { pinned: !msg.pinned },
    });
    return NextResponse.json({ pinned: updated.pinned });
  } catch (e) {
    return apiCatch(e);
  }
}
