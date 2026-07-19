import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/communities/[id]/join
 *   Join a public community. Idempotent (already a member → 200 OK).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id: groupId } = await params;
    const group = await db.chatGroup.findUnique({
      where: { id: groupId },
      include: { conversation: { select: { id: true } } },
    });
    if (!group) return apiError("Community not found", 404);

    // Idempotent join
    const existing = await db.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing) {
      return NextResponse.json({
        message: "Already a member",
        conversationId: group.conversation?.id ?? null,
      });
    }

    await db.chatGroupMember.create({
      data: { groupId, userId, role: "member" },
    });

    // Post system message if conversation exists
    if (group.conversation?.id) {
      const me = await db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
      const name = me ? `${me.firstName} ${me.lastName}`.trim() : "Someone";
      await db.message.create({
        data: {
          conversationId: group.conversation.id,
          senderId: userId,
          content: `${name} joined the community.`,
          kind: "system",
          status: "delivered",
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      message: "Joined",
      conversationId: group.conversation?.id ?? null,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
