// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/social/posts/[id]/comments
 * Body: { content }
 *   Adds a comment authored by the authenticated user, increments commentsCount.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) return apiRateLimited(rl.retryAfterMs);

    const { id } = await params;
    const post = await db.socialPost.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!post) return apiError("Post not found", 404);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { content?: string };
    const content = (b.content || "").trim();
    if (!content) return apiError("Comment cannot be empty", 400);
    if (content.length > 500) return apiError("Comment too long (max 500 chars)", 400);

    const [comment] = await db.$transaction([
      db.socialComment.create({
        data: { postId: id, userId, content },
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
      }),
      db.socialPost.update({
        where: { id },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ comment });
  } catch (e) {
    return apiCatch(e);
  }
}
