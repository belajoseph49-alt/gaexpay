/**
 * src/lib/savings-challenges.ts
 *
 * Shared serializers + helpers for the Savings Challenges feature.
 *
 * Used by:
 *   - src/app/api/savings-challenges/route.ts           (list)
 *   - src/app/api/savings-challenges/[id]/join/route.ts
 *   - src/app/api/savings-challenges/[id]/contribute/route.ts
 *   - src/app/api/savings-challenges/[id]/abandon/route.ts
 */

export interface ChallengeSerialized {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  targetAmount: number;
  durationDays: number;
  difficulty: string;
  colorFrom: string;
  colorTo: string;
  badgeBronze: number;
  badgeSilver: number;
  badgeGold: number;
  badgePlatinum: number;
  createdAt: string;
}

export interface ContributionSerialized {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface ParticipationSerialized {
  id: string;
  challengeId: string;
  status: string;
  currentAmount: number;
  streak: number;
  longestStreak: number;
  lastContributionAt: string | null;
  joinedAt: string;
  completedAt: string | null;
  challenge: ChallengeSerialized;
  progress: number; // 0-100
  badges: string[]; // ["bronze","silver","gold","platinum"] subset
  daysLeft: number | null;
  recentContributions: ContributionSerialized[];
}

export function serializeChallenge(c: {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  targetAmount: number;
  durationDays: number;
  difficulty: string;
  colorFrom: string;
  colorTo: string;
  badgeBronze: number;
  badgeSilver: number;
  badgeGold: number;
  badgePlatinum: number;
  createdAt: Date | string;
}): ChallengeSerialized {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    icon: c.icon,
    category: c.category,
    targetAmount: c.targetAmount,
    durationDays: c.durationDays,
    difficulty: c.difficulty,
    colorFrom: c.colorFrom,
    colorTo: c.colorTo,
    badgeBronze: c.badgeBronze,
    badgeSilver: c.badgeSilver,
    badgeGold: c.badgeGold,
    badgePlatinum: c.badgePlatinum,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
  };
}

export function computeBadges(progress: number, c: ChallengeSerialized): string[] {
  const badges: string[] = [];
  if (progress >= c.badgeBronze) badges.push("bronze");
  if (progress >= c.badgeSilver) badges.push("silver");
  if (progress >= c.badgeGold) badges.push("gold");
  if (progress >= c.badgePlatinum) badges.push("platinum");
  return badges;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the derived participation payload (progress %, badges, days-left,
 * recent contributions) from a raw Prisma row.
 *
 * `row.contributions` may be omitted (e.g. join/abandon responses that
 * don't need the history) — the `recentContributions` array will be empty.
 */
export function serializeParticipation(
  row: {
    id: string;
    challengeId: string;
    status: string;
    currentAmount: number;
    streak: number;
    longestStreak: number;
    lastContributionAt: Date | string | null;
    joinedAt: Date | string;
    completedAt: Date | string | null;
    challenge: any;
    contributions?: Array<{
      id: string;
      amount: number;
      note: string | null;
      createdAt: Date | string;
    }>;
  },
  now: number = Date.now(),
): ParticipationSerialized {
  const challenge = serializeChallenge(row.challenge);
  const target = challenge.targetAmount;
  const progress = target > 0 ? Math.min(100, (row.currentAmount / target) * 100) : 0;
  const badges = computeBadges(progress, challenge);
  const joinedAtMs = new Date(row.joinedAt).getTime();
  const daysLeft = Math.max(0, Math.round((joinedAtMs + challenge.durationDays * DAY_MS - now) / DAY_MS));
  return {
    id: row.id,
    challengeId: row.challengeId,
    status: row.status,
    currentAmount: row.currentAmount,
    streak: row.streak,
    longestStreak: row.longestStreak,
    lastContributionAt: row.lastContributionAt
      ? row.lastContributionAt instanceof Date
        ? row.lastContributionAt.toISOString()
        : String(row.lastContributionAt)
      : null,
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : String(row.joinedAt),
    completedAt: row.completedAt
      ? row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : String(row.completedAt)
      : null,
    challenge,
    progress,
    badges,
    daysLeft,
    recentContributions: (row.contributions ?? []).map((c) => ({
      id: c.id,
      amount: c.amount,
      note: c.note ?? null,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    })),
  };
}

/**
 * Streak helper — used by the contribute route.
 *
 * Rules:
 *   - If `lastAt` is null OR > 1 day ago (in days, calendar-day aware): reset
 *     to 1.
 *   - If `lastAt` is within the same day OR exactly 1 day ago (i.e. consecutive
 *     day): increment by 1.
 *
 * Cap `longestStreak` so it tracks the historical best.
 */
export function updateStreak(lastAt: Date | null, now: Date, currentStreak: number): {
  streak: number;
  longestStreak: number;
} {
  if (!lastAt) {
    return { streak: 1, longestStreak: Math.max(currentStreak, 1) };
  }
  // Calendar-day diff (UTC midnight-to-midnight).
  const lastDay = new Date(Date.UTC(lastAt.getUTCFullYear(), lastAt.getUTCMonth(), lastAt.getUTCDate())).getTime();
  const todayDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
  const dayDiff = Math.round((todayDay - lastDay) / DAY_MS);
  let newStreak: number;
  if (dayDiff <= 0) {
    // Same day — don't double-count, but also don't reset.
    newStreak = Math.max(currentStreak, 1);
  } else if (dayDiff === 1) {
    newStreak = currentStreak + 1;
  } else {
    // Gap > 1 day — reset.
    newStreak = 1;
  }
  return {
    streak: newStreak,
    longestStreak: Math.max(currentStreak, newStreak),
  };
}
