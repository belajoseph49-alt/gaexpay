import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";
import { serializeChallenge, serializeParticipation } from "@/lib/savings-challenges";

export const dynamic = "force-dynamic";

/**
 * GET /api/savings-challenges
 *
 * Returns the full catalog of available challenges plus the caller's
 * participations (with derived progress %, unlocked badges, days-left,
 * and the 10 most-recent contributions per participation).
 *
 * Always returns 200, even when unauthenticated — the catalog is public,
 * the participations array is just empty for anon users.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);

    const challenges = await db.savingsChallenge.findMany({
      orderBy: { createdAt: "asc" },
    });

    let participations: any[] = [];
    if (userId) {
      participations = await db.userChallengeParticipation.findMany({
        where: { userId },
        include: {
          challenge: true,
          contributions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { joinedAt: "desc" },
      });
    }

    const participationsOut = participations.map((p) => serializeParticipation(p));

    // KPIs across all active participations
    const activeParticipations = participationsOut.filter((p) => p.status === "active");
    const totalSaved = activeParticipations.reduce((s, p) => s + p.currentAmount, 0);
    const bestStreak = participationsOut.reduce((s, p) => Math.max(s, p.longestStreak), 0);

    return NextResponse.json({
      challenges: challenges.map(serializeChallenge),
      participations: participationsOut,
      activeCount: activeParticipations.length,
      totalSaved,
      bestStreak,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
