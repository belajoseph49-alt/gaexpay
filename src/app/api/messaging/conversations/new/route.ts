import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch, apiRateLimited } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/messaging/conversations/new
 * Body: { identifier } — a @username, an email, or a phone number.
 *
 * Starts (or returns the existing) 1-to-1 conversation between the auth user
 * and the user identified by `identifier`. Returns the conversation id and the
 * other participant's profile so the client can switch to the chat window.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) return apiRateLimited(rl.retryAfterMs);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { identifier?: string };
    const raw = (b.identifier || "").trim();
    if (!raw) return apiError("identifier is required", 400);

    // Strip leading @ if present
    const handle = raw.replace(/^@/, "").trim();
    if (!handle) return apiError("identifier cannot be empty", 400);

    // Find the user by username, email, or phone (exact match, case-insensitive
    // for username/email — SQLite's lower() is fine for ASCII-only handles).
    const target = await db.user.findFirst({
      where: {
        OR: [
          { username: handle },
          { email: handle },
          { phone: handle },
          // Lowercased fallback for usernames
          ...(handle.includes("@") || /^[a-z0-9._-]+$/i.test(handle)
            ? [{ username: handle.toLowerCase() }, { email: handle.toLowerCase() }]
            : []),
        ],
      },
      select: {
        id: true, firstName: true, lastName: true, username: true,
        avatar: true, kycStatus: true, status: true,
      },
    });

    if (!target) return apiError("User not found", 404);
    if (target.id === userId) return apiError("Cannot start a conversation with yourself", 400);
    if (target.status !== "active") return apiError("User is not active", 400);

    // Normalize the unique pair: lexicographically smaller id is participantA
    const [aId, bId] =
      userId < target.id ? [userId, target.id] : [target.id, userId];

    const conv = await db.conversation.upsert({
      where: {
        participantAId_participantBId: {
          participantAId: aId,
          participantBId: bId,
        },
      },
      update: {},
      create: {
        participantAId: aId,
        participantBId: bId,
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      conversation: {
        id: conv.id,
        user: target,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
