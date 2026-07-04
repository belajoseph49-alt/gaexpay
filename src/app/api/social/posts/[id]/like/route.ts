import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/social/posts/[id]/like
 *   Toggles the authenticated user's like on a post.
 *   Returns { liked: boolean, likesCount: number }.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) return apiRateLimited(rl.retryAfterMs);

    const { id } = await params;
    const post = await db.socialPost.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!post) return apiError("Post not found", 404);

    const existing = await db.socialLike.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    if (existing) {
      await db.$transaction([
        db.socialLike.delete({ where: { id: existing.id } }),
        db.socialPost.update({
          where: { id },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      const updated = await db.socialPost.findUnique({
        where: { id },
        select: { likesCount: true },
      });
      return NextResponse.json({
        liked: false,
        likesCount: Math.max(0, updated?.likesCount ?? 0),
      });
    }

    await db.$transaction([
      db.socialLike.create({ data: { postId: id, userId } }),
      db.socialPost.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    const updated = await db.socialPost.findUnique({
      where: { id },
      select: { likesCount: true },
    });
    return NextResponse.json({
      liked: true,
      likesCount: updated?.likesCount ?? 1,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
