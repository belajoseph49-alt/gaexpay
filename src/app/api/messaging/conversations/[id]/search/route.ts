import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { getConvForUser } from "@/lib/chat-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/conversations/[id]/search?q=keyword
 *
 * Searches text messages in a conversation by keyword (case-insensitive
 * substring match). Returns up to 50 matching messages (newest first).
 * Only searches non-deleted text messages.
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
    const q = (url.searchParams.get("q") || "").trim();
    if (q.length < 1) return apiError("Query too short", 400);

    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        kind: "text",
        deletedFor: { not: "all" },
        content: { contains: q },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, content: true, senderId: true, createdAt: true, kind: true },
    });
    return NextResponse.json({ messages, q });
  } catch (e) {
    return apiCatch(e);
  }
}
