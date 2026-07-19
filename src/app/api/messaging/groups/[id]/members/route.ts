import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/groups/[id]/members
 * Body: { userIds: string[] }
 *   Adds members to a group. Only group admins can add members.
 *
 * GET /api/messaging/groups/[id]/members
 *   Returns the group's members with roles.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);
    const { id } = await params;

    const membership = await db.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });
    if (!membership) return apiError("Not a member of this group", 403);

    const members = await db.chatGroupMember.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, kycStatus: true, username: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return NextResponse.json({ members: members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })) });
  } catch (e) {
    return apiCatch(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);
    const { id } = await params;

    // Must be admin
    const myMembership = await db.chatGroupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });
    if (!myMembership || myMembership.role !== "admin") {
      return apiError("Only group admins can add members", 403);
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
    if (userIds.length === 0) return apiError("No users to add", 400);

    const count = await db.chatGroupMember.count({ where: { groupId: id } });
    if (count + userIds.length > 50) return apiError("Group would exceed 50 members", 400);

    const existing = await db.chatGroupMember.findMany({
      where: { groupId: id, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const toAdd = userIds.filter((uid) => !existingIds.has(uid));

    for (const uid of toAdd) {
      await db.chatGroupMember.create({
        data: { groupId: id, userId: uid, role: "member" },
      }).catch(() => {/* skip */});
    }
    await db.chatGroup.update({ where: { id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ added: toAdd.length });
  } catch (e) {
    return apiCatch(e);
  }
}
