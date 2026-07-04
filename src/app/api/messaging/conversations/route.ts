import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/conversations
 *
 * Returns the auth user's conversations ordered by most recent message.
 * Each conversation includes the other participant's profile, the last
 * message preview, and an unread count.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      include: {
        participantA: {
          select: {
            id: true, firstName: true, lastName: true, username: true,
            avatar: true, kycStatus: true, status: true,
          },
        },
        participantB: {
          select: {
            id: true, firstName: true, lastName: true, username: true,
            avatar: true, kycStatus: true, status: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Compute unread counts separately (cheap to do inline)
    const convIds = conversations.map((c) => c.id);
    const unreadMessages = await db.message.findMany({
      where: {
        conversationId: { in: convIds },
        senderId: { not: userId },
        status: { in: ["sent", "delivered"] },
      },
      select: { conversationId: true },
    });
    const unreadMap: Record<string, number> = {};
    for (const m of unreadMessages) {
      unreadMap[m.conversationId] = (unreadMap[m.conversationId] ?? 0) + 1;
    }

    const result = conversations.map((c) => {
      const isA = c.participantAId === userId;
      const other = isA ? c.participantB : c.participantA;
      const last = c.messages[0] ?? null;
      return {
        id: c.id,
        user: other,
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              senderId: last.senderId,
              isMine: last.senderId === userId,
              status: last.status,
              createdAt: last.createdAt,
            }
          : null,
        unreadCount: unreadMap[c.id] ?? 0,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (e) {
    return apiCatch(e);
  }
}
