import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import {
  serializeParticipation,
  computeBadges,
  updateStreak,
} from "@/lib/savings-challenges";

export const dynamic = "force-dynamic";

/**
 * POST /api/savings-challenges/[id]/contribute
 *
 * Body: { amount: number, note?: string }
 *
 * Adds a contribution to the caller's participation. Updates:
 *   - currentAmount (+=amount)
 *   - streak / longestStreak (calendar-day aware — increment if last
 *     contribution was yesterday or today, reset to 1 if longer gap)
 *   - lastContributionAt = now
 *   - status = "completed" + completedAt = now if currentAmount >= targetAmount
 *
 * Returns the updated participation plus a `newBadges` array (badges newly
 * unlocked by this contribution — used by the client to fire confetti +
 * toast).
 *
 *  401 — unauthenticated
 *  404 — challenge not found, or caller hasn't joined
 *  400 — invalid amount
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { amount?: number | string; note?: string };
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("amount must be a positive number", 400);
    }
    if (amount > 1e9) return apiError("amount too large", 400);
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 280) : null;

    const participation = await db.userChallengeParticipation.findUnique({
      where: { userId_challengeId: { userId, challengeId: id } },
      include: { challenge: true },
    });
    if (!participation) return apiError("Participation not found", 404);
    if (participation.status === "abandoned") {
      return apiError("Cannot contribute to an abandoned challenge", 400);
    }

    // Compute new streak + longestStreak (calendar-day aware).
    // `updateStreak` only knows about the current streak; we preserve the
    // historical longestStreak by taking the max with the existing value.
    const now = new Date();
    const streakUpdate = updateStreak(
      participation.lastContributionAt,
      now,
      participation.streak,
    );
    const streak = streakUpdate.streak;
    const longestStreak = Math.max(participation.longestStreak, streakUpdate.longestStreak);

    const newAmount = participation.currentAmount + amount;
    const target = participation.challenge.targetAmount;
    const isCompleted = target > 0 && newAmount >= target;

    // Compute badges before + after, so the client can detect newly-unlocked
    // ones and fire confetti.
    const beforeProgress = target > 0 ? Math.min(100, (participation.currentAmount / target) * 100) : 0;
    const afterProgress = target > 0 ? Math.min(100, (newAmount / target) * 100) : 0;
    const beforeBadges = computeBadges(beforeProgress, {
      ...participation.challenge,
      createdAt: participation.challenge.createdAt instanceof Date
        ? participation.challenge.createdAt.toISOString()
        : String(participation.challenge.createdAt),
    });
    const afterBadges = computeBadges(afterProgress, {
      ...participation.challenge,
      createdAt: participation.challenge.createdAt instanceof Date
        ? participation.challenge.createdAt.toISOString()
        : String(participation.challenge.createdAt),
    });
    const newBadges = afterBadges.filter((x) => !beforeBadges.includes(x));

    // Single atomic update — write contribution + update participation in
    // one transaction so the streak counter can never drift from the
    // contribution log.
    const updated = await db.$transaction(async (tx) => {
      await tx.challengeContribution.create({
        data: {
          participationId: participation.id,
          amount,
          note,
        },
      });
      return tx.userChallengeParticipation.update({
        where: { id: participation.id },
        data: {
          currentAmount: newAmount,
          streak,
          longestStreak,
          lastContributionAt: now,
          status: isCompleted ? "completed" : participation.status,
          completedAt: isCompleted ? now : participation.completedAt,
        },
        include: {
          challenge: true,
          contributions: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "savings_challenge.contribute",
        entity: "savings_challenge",
        entityId: id,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          amount,
          streak,
          longestStreak,
          newBadges,
          completed: isCompleted,
        }),
        severity: "info",
      },
    });

    return NextResponse.json({
      participation: serializeParticipation(updated),
      newBadges,
      completed: isCompleted,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
