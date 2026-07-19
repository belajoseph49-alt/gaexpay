// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/social/feed
 *
 * Returns the social feed for the authenticated user:
 *   - Posts authored by the user OR by any accepted connection (newest first).
 *   - Includes author, likes (sample), and recent comments.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Fetch accepted connections (both directions)
    const conns = await db.connection.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
      select: { requesterId: true, recipientId: true },
    });
    const connectedIds = new Set<string>();
    for (const c of conns) {
      connectedIds.add(c.requesterId);
      connectedIds.add(c.recipientId);
    }
    connectedIds.add(userId); // include self

    const authorIds = Array.from(connectedIds);

    const posts = await db.socialPost.findMany({
      where: { authorId: { in: authorIds } },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatar: true,
            city: true,
            country: true,
            kycStatus: true,
          },
        },
        likes: {
          select: {
            id: true,
            userId: true,
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    // Reverse the comments so oldest shows first when expanded
    const postsWithOrderedComments = posts.map((p) => ({
      ...p,
      comments: [...p.comments].reverse(),
      likedByMe: p.likes.some((l) => l.userId === userId),
    }));

    return NextResponse.json({ posts: postsWithOrderedComments });
  } catch (e) {
    return apiCatch(e);
  }
}
