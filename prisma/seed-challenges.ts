/**
 * prisma/seed-challenges.ts
 *
 * Seeds 6 gamified Savings Challenge templates and auto-enrolls the demo
 * user (demo@gaexpay.com) in 3 of them with realistic progress so the UI
 * looks alive on first visit.
 *
 * Idempotent: deletes each challenge by slug and any participations /
 * contributions for the demo user before re-inserting.
 *
 * Run with: `bunx tsx prisma/seed-challenges.ts`
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_EMAIL = "demo@gaexpay.com";

interface Template {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string; // streak | amount | behavior | roundup
  targetAmount: number;
  durationDays: number;
  difficulty: string; // easy | medium | hard
  colorFrom: string;
  colorTo: string;
  badgeBronze: number;
  badgeSilver: number;
  badgeGold: number;
  badgePlatinum: number;
}

const TEMPLATES: Template[] = [
  {
    slug: "52-week-challenge",
    title: "52-Week Challenge",
    description:
      "Save a little every week for a year. Week 1 = ₦1,000, week 2 = ₦2,000, all the way to week 52. By the end you'll have stashed ₦1,378,000.",
    icon: "🏆",
    category: "streak",
    targetAmount: 1378000,
    durationDays: 364,
    difficulty: "hard",
    colorFrom: "#7c3aed", // violet-600
    colorTo: "#c026d3", // fuchsia-600
    badgeBronze: 25,
    badgeSilver: 50,
    badgeGold: 75,
    badgePlatinum: 100,
  },
  {
    slug: "30-day-no-spend",
    title: "30-Day No-Spend",
    description:
      "Commit to 30 days of essential-only spending. No eating out, no impulse buys, no online shopping sprees. Build the savings habit.",
    icon: "🚫",
    category: "behavior",
    targetAmount: 0,
    durationDays: 30,
    difficulty: "medium",
    colorFrom: "#f59e0b", // amber-500
    colorTo: "#ea580c", // orange-600
    badgeBronze: 25,
    badgeSilver: 50,
    badgeGold: 75,
    badgePlatinum: 100,
  },
  {
    slug: "100k-stash",
    title: "₦100K Stash",
    description:
      "Stash away ₦100,000 in 90 days. Whether you're saving ₦1,000 a day or making weekly drops, the goal is the same: a six-figure cushion.",
    icon: "💰",
    category: "amount",
    targetAmount: 100000,
    durationDays: 90,
    difficulty: "medium",
    colorFrom: "#10b981", // emerald-500
    colorTo: "#059669", // emerald-600
    badgeBronze: 25,
    badgeSilver: 50,
    badgeGold: 75,
    badgePlatinum: 100,
  },
  {
    slug: "round-up-saver",
    title: "Round-Up Saver",
    description:
      "Every time you spend, we round up to the nearest ₦100 and save the change. Reach ₦50,000 in 60 days without noticing.",
    icon: "⬆️",
    category: "roundup",
    targetAmount: 50000,
    durationDays: 60,
    difficulty: "easy",
    colorFrom: "#8b5cf6", // violet-500
    colorTo: "#6d28d9", // violet-700
    badgeBronze: 25,
    badgeSilver: 50,
    badgeGold: 75,
    badgePlatinum: 100,
  },
  {
    slug: "holiday-fund",
    title: "Holiday Fund",
    description:
      "Build a ₦250,000 holiday stash over 120 days so the festive season feels effortless — gifts, travel, and feasts covered.",
    icon: "🎄",
    category: "amount",
    targetAmount: 250000,
    durationDays: 120,
    difficulty: "medium",
    colorFrom: "#dc2626", // rose-600
    colorTo: "#be123c", // rose-700
    badgeBronze: 25,
    badgeSilver: 50,
    badgeGold: 75,
    badgePlatinum: 100,
  },
  {
    slug: "emergency-builder",
    title: "Emergency Builder",
    description:
      "Build a serious ₦500,000 emergency fund over 180 days. Six months of expenses, locked and ready for whatever life throws.",
    icon: "🛡️",
    category: "amount",
    targetAmount: 500000,
    durationDays: 180,
    difficulty: "hard",
    colorFrom: "#0f766e", // teal-700
    colorTo: "#0d9488", // teal-600
    badgeBronze: 25,
    badgeSilver: 50,
    badgeGold: 75,
    badgePlatinum: 100,
  },
];

async function main() {
  console.log("Seeding Savings Challenges...");

  const demoUser = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demoUser) {
    console.error(`Demo user (${DEMO_EMAIL}) not found. Run prisma/seed.ts first.`);
    process.exit(1);
  }

  // 1. Wipe prior participations + contributions for the demo user (cascade).
  const existingParticipations = await db.userChallengeParticipation.findMany({
    where: { userId: demoUser.id },
    select: { id: true },
  });
  if (existingParticipations.length > 0) {
    await db.challengeContribution.deleteMany({
      where: { participationId: { in: existingParticipations.map((p) => p.id) } },
    });
    await db.userChallengeParticipation.deleteMany({ where: { userId: demoUser.id } });
  }

  // 2. Delete challenges by slug (idempotent re-insert).
  await db.savingsChallenge.deleteMany({
    where: { slug: { in: TEMPLATES.map((t) => t.slug) } },
  });

  // 3. Insert templates.
  const created: Record<string, { id: string; targetAmount: number }> = {};
  for (const tpl of TEMPLATES) {
    const ch = await db.savingsChallenge.create({ data: tpl });
    created[tpl.slug] = { id: ch.id, targetAmount: ch.targetAmount };
    console.log(`  + challenge "${ch.title}" (${ch.slug})`);
  }

  // 4. Auto-enroll demo user in 3 challenges with varying progress.
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  type Enrollment = {
    slug: string;
    currentAmount: number;
    streak: number;
    longestStreak: number;
    lastContributionDaysAgo: number; // 0 = today
    contributions: { amount: number; daysAgo: number }[];
    status?: "active" | "completed" | "abandoned";
  };

  const enrollments: Enrollment[] = [
    // ₦100K Stash — ~68% progress, 9-day streak, silver badge
    {
      slug: "100k-stash",
      currentAmount: 68000,
      streak: 9,
      longestStreak: 12,
      lastContributionDaysAgo: 0,
      contributions: [
        { amount: 5000, daysAgo: 9 },
        { amount: 7000, daysAgo: 8 },
        { amount: 8000, daysAgo: 7 },
        { amount: 6000, daysAgo: 6 },
        { amount: 9000, daysAgo: 5 },
        { amount: 7000, daysAgo: 4 },
        { amount: 8000, daysAgo: 3 },
        { amount: 9000, daysAgo: 2 },
        { amount: 9000, daysAgo: 1 },
        { amount: 0, daysAgo: 0 }, // today's contribution handled separately
      ],
    },
    // Round-Up Saver — ~42% progress, 5-day streak, bronze badge
    {
      slug: "round-up-saver",
      currentAmount: 21000,
      streak: 5,
      longestStreak: 7,
      lastContributionDaysAgo: 1,
      contributions: [
        { amount: 2200, daysAgo: 10 },
        { amount: 1800, daysAgo: 9 },
        { amount: 3000, daysAgo: 8 },
        { amount: 2500, daysAgo: 7 },
        { amount: 1500, daysAgo: 6 },
        { amount: 2000, daysAgo: 5 },
        { amount: 2800, daysAgo: 4 },
        { amount: 1200, daysAgo: 3 },
        { amount: 2000, daysAgo: 2 },
        { amount: 2000, daysAgo: 1 },
      ],
    },
    // 52-Week Challenge — ~28% progress (week 15 area), 15-week streak, bronze
    {
      slug: "52-week-challenge",
      currentAmount: 120000,
      streak: 15,
      longestStreak: 15,
      lastContributionDaysAgo: 2,
      contributions: [
        { amount: 1000, daysAgo: 105 },
        { amount: 2000, daysAgo: 98 },
        { amount: 3000, daysAgo: 91 },
        { amount: 4000, daysAgo: 84 },
        { amount: 5000, daysAgo: 77 },
        { amount: 6000, daysAgo: 70 },
        { amount: 7000, daysAgo: 63 },
        { amount: 8000, daysAgo: 56 },
        { amount: 9000, daysAgo: 49 },
        { amount: 10000, daysAgo: 42 },
        { amount: 11000, daysAgo: 35 },
        { amount: 12000, daysAgo: 28 },
        { amount: 13000, daysAgo: 21 },
        { amount: 14000, daysAgo: 14 },
        { amount: 15000, daysAgo: 7 },
        { amount: 0, daysAgo: 2 },
      ],
    },
  ];

  for (const e of enrollments) {
    const meta = created[e.slug];
    if (!meta) continue;
    const isCompleted = meta.targetAmount > 0 && e.currentAmount >= meta.targetAmount;
    const joinedAt = new Date(now - (meta.targetAmount > 0 ? Math.max(e.contributions.length, 10) * 7 * DAY : 30 * DAY));
    const lastContributionAt = new Date(now - e.lastContributionDaysAgo * DAY);

    const participation = await db.userChallengeParticipation.create({
      data: {
        userId: demoUser.id,
        challengeId: meta.id,
        status: e.status ?? (isCompleted ? "completed" : "active"),
        currentAmount: e.currentAmount,
        streak: e.streak,
        longestStreak: e.longestStreak,
        lastContributionAt,
        joinedAt,
        completedAt: isCompleted ? new Date(now) : null,
      },
    });

    for (const c of e.contributions) {
      if (c.amount <= 0) continue;
      await db.challengeContribution.create({
        data: {
          participationId: participation.id,
          amount: c.amount,
          note: "seed",
          createdAt: new Date(now - c.daysAgo * DAY),
        },
      });
    }

    console.log(
      `  ~ enrolled demo in "${e.slug}" — ₦${e.currentAmount.toLocaleString()} / ₦${meta.targetAmount.toLocaleString()}, streak=${e.streak}`,
    );
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
