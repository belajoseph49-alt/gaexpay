/**
 * prisma/seed-staking.ts — Staking pools + demo live streams (Task 17-c)
 *
 * Seeds:
 *   - 5 StakingPool rows (BTC, ETH, USDT, GAEX, PI) if missing.
 *   - 4 demo LiveStream rows (3 live + 1 scheduled) plus their streamer User rows
 *     (matched against existing seeded users by email, created if absent).
 *   - 1 demo Stake for the canonical demo user (BTC pool, unlocked early so the
 *     "Unstake" button is actionable in QA).
 *
 * Idempotent: re-running adds nothing new unless the pools/streams are absent.
 *
 * Run with: `bunx tsx prisma/seed-staking.ts`
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_USER_ID = "cmqk4on7w0000l54pde5vpp0q";

const POOLS = [
  { token: "BTC", apy: 5.0, lockPeriodDays: 30, minStake: 0.001 },
  { token: "ETH", apy: 6.5, lockPeriodDays: 60, minStake: 0.01 },
  { token: "USDT", apy: 12.0, lockPeriodDays: 90, minStake: 10 },
  { token: "GAEX", apy: 25.0, lockPeriodDays: 180, minStake: 50 },
  { token: "PI", apy: 15.0, lockPeriodDays: 90, minStake: 100 },
];

const STREAMERS = [
  {
    email: "adaeze.streamer@gaexpay.demo",
    firstName: "Zara",
    lastName: "Crypto",
    title: "Bitcoin Halving Q&A — Live Market Breakdown",
    category: "crypto",
    viewers: 1284,
    goal: 500,
  },
  {
    email: "tunde.seller@gaexpay.demo",
    firstName: "Tunde",
    lastName: "Wears",
    title: "Flash Sale: Ankara Collection 30% Off",
    category: "shopping",
    viewers: 642,
    goal: 200,
  },
  {
    email: "aminata.cook@gaexpay.demo",
    firstName: "Aminata",
    lastName: "Kitchen",
    title: "Cooking Jollof Rice Live — Send Tips!",
    category: "food",
    viewers: 318,
    goal: 100,
  },
  {
    email: "kwame.fitness@gaexpay.demo",
    firstName: "Kwame",
    lastName: "Fit",
    title: "Morning HIIT Workout — Tomorrow 7am",
    category: "fitness",
    viewers: 0,
    goal: 150,
    scheduled: true,
  },
];

async function main() {
  console.log("Seeding staking pools + demo live streams...");

  // 1. Staking pools
  for (const p of POOLS) {
    const existing = await db.stakingPool.findFirst({ where: { token: p.token } });
    if (existing) {
      console.log(`  pool ${p.token}: already exists (${existing.id})`);
      continue;
    }
    const created = await db.stakingPool.create({
      data: {
        token: p.token,
        apy: p.apy,
        lockPeriodDays: p.lockPeriodDays,
        minStake: p.minStake,
        totalStaked:
          p.token === "BTC" ? 2.41 :
          p.token === "ETH" ? 84.2 :
          p.token === "USDT" ? 482500 :
          p.token === "GAEX" ? 1245000 :
          312000,
      },
    });
    console.log(`  pool ${p.token}: created (${created.id})`);
  }

  // 2. Demo live streams (with streamer Users)
  for (const s of STREAMERS) {
    let streamer = await db.user.findUnique({ where: { email: s.email } });
    if (!streamer) {
      streamer = await db.user.create({
        data: {
          email: s.email,
          phone: `+23480000${Math.floor(100000 + Math.random() * 899999)}`,
          passwordHash: "demo_streamer_hash",
          firstName: s.firstName,
          lastName: s.lastName,
          country: "Nigeria",
          kycStatus: "verified",
          kycTier: 2,
          accountType: "business",
          role: "user",
        },
      });
      console.log(`  streamer ${s.firstName} ${s.lastName}: created`);
    }

    if (s.scheduled) {
      const existing = await db.liveStream.findFirst({
        where: { streamerId: streamer.id, status: "scheduled" },
      });
      if (!existing) {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.liveStream.create({
          data: {
            streamerId: streamer.id,
            title: s.title,
            category: s.category,
            status: "scheduled",
            viewerCount: 0,
            donationGoal: s.goal,
            scheduledFor: tomorrow,
            startedAt: new Date(),
          },
        });
        console.log(`  stream "${s.title}": scheduled`);
      }
    } else {
      const existing = await db.liveStream.findFirst({
        where: { streamerId: streamer.id, status: "live" },
      });
      if (!existing) {
        await db.liveStream.create({
          data: {
            streamerId: streamer.id,
            title: s.title,
            category: s.category,
            status: "live",
            viewerCount: s.viewers,
            donationGoal: s.goal,
            donationsTotal: Math.floor(Math.random() * s.goal),
            startedAt: new Date(Date.now() - Math.floor(Math.random() * 5400000)),
          },
        });
        console.log(`  stream "${s.title}": live`);
      }
    }
  }

  // 3. One demo stake (BTC pool, already unlocked so QA can unstake)
  const btcPool = await db.stakingPool.findFirst({ where: { token: "BTC" } });
  if (btcPool) {
    const existing = await db.stake.findFirst({
      where: { userId: DEMO_USER_ID, poolId: btcPool.id },
    });
    if (!existing) {
      const stakedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const unlockAt = new Date(stakedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.stake.create({
        data: {
          userId: DEMO_USER_ID,
          poolId: btcPool.id,
          amount: 0.005,
          currency: "BTC",
          rewardsEarned: 0.005 * 0.05 * (35 / 365),
          stakedAt,
          unlockAt,
          status: "active",
        },
      });
      console.log("  demo stake: created (BTC, unlocked)");
    } else {
      console.log("  demo stake: already exists");
    }
  }

  console.log("Seed complete.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
