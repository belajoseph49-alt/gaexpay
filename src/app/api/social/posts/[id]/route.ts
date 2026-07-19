// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/social/posts/[id]
 *   Returns a single post with author, likes, and comments.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const post = await db.socialPost.findUnique({
      where: { id },
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
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!post) return apiError("Post not found", 404);

    return NextResponse.json({
      post: { ...post, likedByMe: post.likes.some((l) => l.userId === userId) },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * DELETE /api/social/posts/[id]
 *   Deletes a post authored by the authenticated user.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const post = await db.socialPost.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post) return apiError("Post not found", 404);
    if (post.authorId !== userId) return apiError("You can only delete your own posts", 403);

    await db.socialPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
