import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/conversations/[id]/messages/[msgId]/react
 * Body: { emoji: string }
 *
 * Toggles a reaction on a message. If the user already reacted with the same
 * emoji, it's removed. Otherwise the previous reaction (if any) is replaced.
 * Returns the updated reactions array.
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
    const emoji = (body.emoji || "").toString().trim().slice(0, 8);
    if (!emoji) return apiError("Emoji is required", 400);

    const msg = await db.message.findUnique({ where: { id: msgId }, select: { id: true, reactions: true, conversationId: true } });
    if (!msg) return apiError("Message not found", 404);
    if (msg.conversationId !== id) return apiError("Message not in this conversation", 400);

    let reactions: Array<{ u: string; e: string }> = [];
    try { reactions = JSON.parse(msg.reactions || "[]"); } catch { reactions = []; }

    // Remove any existing reaction by this user
    reactions = reactions.filter((r) => r.u !== userId);
    // If the user hadn't reacted with THIS emoji, add it (toggle behavior)
    const hadThis = reactions.some((r) => r.u === userId && r.e === emoji);
    if (!hadThis) reactions.push({ u: userId, e: emoji });

    await db.message.update({ where: { id: msgId }, data: { reactions: JSON.stringify(reactions) } });
    return NextResponse.json({ reactions });
  } catch (e) {
    return apiCatch(e);
  }
}
