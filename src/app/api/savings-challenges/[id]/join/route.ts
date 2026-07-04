import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { serializeParticipation } from "@/lib/savings-challenges";

export const dynamic = "force-dynamic";

/**
 * POST /api/savings-challenges/[id]/join
 *
 * Join a challenge — creates a participation row for the caller.
 *
 *  401  — unauthenticated
 *  404  — challenge not found (or not "active" already)
 *  409  — already joined
 *  200  — joined; returns the new participation payload
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;

    const challenge = await db.savingsChallenge.findUnique({ where: { id } });
    if (!challenge) return apiError("Challenge not found", 404);

    const existing = await db.userChallengeParticipation.findUnique({
      where: { userId_challengeId: { userId, challengeId: id } },
    });
    if (existing) {
      return apiError("Already joined this challenge", 409);
    }

    const participation = await db.userChallengeParticipation.create({
      data: {
        userId,
        challengeId: id,
        status: "active",
        currentAmount: 0,
        streak: 0,
        longestStreak: 0,
      },
      include: {
        challenge: true,
        contributions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "savings_challenge.join",
        entity: "savings_challenge",
        entityId: id,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ challengeSlug: challenge.slug }),
        severity: "info",
      },
    });

    return NextResponse.json({
      participation: serializeParticipation(participation),
    });
  } catch (e) {
    return apiCatch(e);
  }
}
