import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { serializeParticipation } from "@/lib/savings-challenges";

export const dynamic = "force-dynamic";

/**
 * POST /api/savings-challenges/[id]/abandon
 *
 * Marks the caller's participation as "abandoned". The participation row
 * is preserved (so historical contributions + streaks remain visible),
 * only the status flips.
 *
 *  401 — unauthenticated
 *  404 — participation not found
 *  400 — already abandoned / completed (cannot abandon a finished challenge)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;

    const existing = await db.userChallengeParticipation.findUnique({
      where: { userId_challengeId: { userId, challengeId: id } },
      include: { challenge: true },
    });
    if (!existing) return apiError("Participation not found", 404);
    if (existing.status === "abandoned") {
      return apiError("Challenge already abandoned", 400);
    }
    if (existing.status === "completed") {
      return apiError("Cannot abandon a completed challenge", 400);
    }

    const updated = await db.userChallengeParticipation.update({
      where: { id: existing.id },
      data: { status: "abandoned" },
      include: {
        challenge: true,
        contributions: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "savings_challenge.abandon",
        entity: "savings_challenge",
        entityId: id,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ challengeSlug: existing.challenge.slug }),
        severity: "warning",
      },
    });

    return NextResponse.json({
      participation: serializeParticipation(updated),
    });
  } catch (e) {
    return apiCatch(e);
  }
}
