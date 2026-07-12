import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/messaging/groups
 *   Returns all groups the auth user is a member of.
 *
 * POST /api/messaging/groups
 * Body: { name: string, description?: string, avatar?: string, memberIds: string[] }
 *   Creates a new group chat. The auth user becomes the creator + admin.
 *   Each member in memberIds is added as a "member" role. Creates the
 *   underlying Conversation (groupId set, participantA/B null) + ChatGroup +
 *   ChatGroupMember rows. Returns { group, conversation }.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const memberships = await db.chatGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, kycStatus: true } } } },
            conversation: { select: { id: true } },
          },
        },
      },
      orderBy: { group: { updatedAt: "desc" } },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      avatar: m.group.avatar,
      role: m.role,
      conversationId: m.group.conversation?.id ?? null,
      memberCount: m.group.members.length,
      members: m.group.members.map((mem) => ({ ...mem.user, role: mem.role })),
      updatedAt: m.group.updatedAt,
    }));

    return NextResponse.json({ groups });
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
    const description = (body.description || "").toString().trim().slice(0, 280);
    const avatar = (body.avatar || "").toString().trim().slice(0, 500);
    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds.filter((x: any) => typeof x === "string") : [];

    if (!name) return apiError("Group name is required", 400);
    if (memberIds.length === 0) return apiError("Add at least one member", 400);
    if (memberIds.length > 50) return apiError("A group can have at most 50 members", 400);

    // Verify all member ids exist
    const users = await db.user.findMany({ where: { id: { in: memberIds } }, select: { id: true } });
    if (users.length !== memberIds.length) return apiError("One or more members not found", 404);

    // Create group + conversation + members atomically
    const result = await db.$transaction(async (tx) => {
      const group = await tx.chatGroup.create({
        data: {
          name,
          description: description || null,
          avatar: avatar || null,
          createdBy: userId,
        },
      });
      const conversation = await tx.conversation.create({
        data: { groupId: group.id },
      });
      // Link conversation back to group
      await tx.chatGroup.update({ where: { id: group.id }, data: { /* conversation is via groupId unique */ } });
      // Creator as admin
      await tx.chatGroupMember.create({
        data: { groupId: group.id, userId, role: "admin" },
      });
      // Other members
      for (const mid of memberIds) {
        if (mid === userId) continue;
        await tx.chatGroupMember.create({
          data: { groupId: group.id, userId: mid, role: "member" },
        }).catch(() => {/* skip dups */});
      }
      return { group, conversation };
    });

    return NextResponse.json({ group: result.group, conversation: result.conversation });
  } catch (e) {
    return apiCatch(e);
  }
}
