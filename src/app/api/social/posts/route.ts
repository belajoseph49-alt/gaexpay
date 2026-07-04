import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/social/posts?authorId=...
 *   Returns posts authored by a given user (default: the auth user).
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const url = new URL(req.url);
    const authorId = url.searchParams.get("authorId") || userId;

    const posts = await db.socialPost.findMany({
      where: { authorId },
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
          select: { id: true, userId: true },
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
      take: 30,
    });

    const mapped = posts.map((p) => ({
      ...p,
      comments: [...p.comments].reverse(),
      likedByMe: p.likes.some((l) => l.userId === userId),
    }));

    return NextResponse.json({ posts: mapped });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * POST /api/social/posts
 * Body: { content, imageUrl?, amountTag?, amountKind?, currency? }
 *
 * Creates a new post authored by the authenticated user.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) return apiRateLimited(rl.retryAfterMs);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      content?: string;
      imageUrl?: string | null;
      amountTag?: number | null;
      amountKind?: string;
      currency?: string;
    };

    const content = (b.content || "").trim();
    if (!content) return apiError("Post content cannot be empty", 400);
    if (content.length > 1200) return apiError("Post too long (max 1200 chars)", 400);

    const imageUrl =
      typeof b.imageUrl === "string" && b.imageUrl.trim()
        ? b.imageUrl.trim().slice(0, 1024)
        : null;

    const amountTag =
      typeof b.amountTag === "number" && b.amountTag > 0 ? b.amountTag : null;
    const amountKind =
      b.amountKind === "split" ? "split" : "request";
    const currency =
      typeof b.currency === "string" && b.currency.length === 3
        ? b.currency.toUpperCase()
        : "NGN";

    const post = await db.socialPost.create({
      data: {
        authorId: userId,
        content,
        imageUrl,
        amountTag,
        amountKind,
        currency,
      },
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
        likes: { select: { id: true, userId: true } },
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
        },
      },
    });

    return NextResponse.json({
      post: {
        ...post,
        likedByMe: false,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
