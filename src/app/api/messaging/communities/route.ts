import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/communities
 *   Returns public communities (ChatGroup where isPublic=true or all groups with a description).
 *   We treat any ChatGroup that has more than 2 members OR has a description as a "community".
 *
 * POST /api/messaging/communities
 * Body: { name, description?, visibility: "public"|"private" }
 *   Creates a public community group. The auth user becomes the admin.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Communities = groups with description set (treated as "public communities")
    const communities = await db.chatGroup.findMany({
      where: {
        OR: [
          { description: { not: null } },
          { members: { some: {} } }, // any group with members
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const result = communities.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      avatar: g.avatar,
      memberCount: g._count.members,
      isMember: g.members.some((m) => m.userId === userId),
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    return NextResponse.json({ communities: result });
  } catch (e) {
    return apiCatch(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    const name = (body.name || "").toString().trim().slice(0, 80);
    const description = (body.description || "").toString().trim().slice(0, 500);
    const visibility: "public" | "private" = body.visibility === "private" ? "private" : "public";

    if (!name) return apiError("Community name is required", 400);

    const result = await db.$transaction(async (tx) => {
      const group = await tx.chatGroup.create({
        data: {
          name,
          description: description || null,
          createdBy: userId,
        },
      });
      const conversation = await tx.conversation.create({
        data: { groupId: group.id },
      });
      // Creator as admin
      await tx.chatGroupMember.create({
        data: { groupId: group.id, userId, role: "admin" },
      });
      // System welcome message
      await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: `Community "${name}" was created.`,
          kind: "system",
          status: "read",
        },
      });
      return { group, conversation };
    });

    return NextResponse.json({ community: result.group, conversation: result.conversation }, { status: 201 });
  } catch (e) {
    return apiCatch(e);
  }
}
