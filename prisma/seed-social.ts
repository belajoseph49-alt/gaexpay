/**
 * prisma/seed-social.ts — Task 17-b
 *
 * Seeds social-network + messaging demo data for the existing demo user
 * (Adaeze Okonkwo, id = DEMO_USER_ID) and a few synthetic social users.
 *
 * Idempotent: wipes only the social/messaging tables before re-seeding.
 *
 * Run: `bunx tsx prisma/seed-social.ts`
 */
import { PrismaClient } from "@prisma/client";
import { DEMO_USER_ID } from "../src/lib/gaexpay";

const db = new PrismaClient();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}
function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}

async function main() {
  console.log("→ Seeding social + messaging data...");

  // Clean
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.socialComment.deleteMany();
  await db.socialLike.deleteMany();
  await db.socialPost.deleteMany();
  await db.connection.deleteMany();

  // Ensure the demo user exists
  let demoUser = await db.user.findUnique({ where: { id: DEMO_USER_ID } });
  if (!demoUser) {
    console.warn(
      `  ! Demo user ${DEMO_USER_ID} not found — creating minimal placeholder.`,
    );
    demoUser = await db.user.create({
      data: {
        id: DEMO_USER_ID,
        email: "demo@gaexpay.com",
        phone: "+2348012345678",
        passwordHash: "demo_hash_secure",
        firstName: "Adaeze",
        lastName: "Okonkwo",
        username: "adaeze",
        kycStatus: "verified",
        kycTier: 3,
        status: "active",
      },
    });
  }

  // ---- Social users (people the demo user can connect / chat with) ----
  const socialUsersData = [
    {
      email: "chinedu@gaexpay.com",
      phone: "+23480210000001",
      firstName: "Chinedu",
      lastName: "Eze",
      username: "chinedu",
      city: "Lagos",
      country: "Nigeria",
      avatar: "https://i.pravatar.cc/200?img=12",
    },
    {
      email: "fatima@gaexpay.com",
      phone: "+23480210000002",
      firstName: "Fatima",
      lastName: "Bello",
      username: "fatima",
      city: "Abuja",
      country: "Nigeria",
      avatar: "https://i.pravatar.cc/200?img=45",
    },
    {
      email: "kwame@gaexpay.com",
      phone: "+233241000003",
      firstName: "Kwame",
      lastName: "Mensah",
      username: "kwame",
      city: "Accra",
      country: "Ghana",
      avatar: "https://i.pravatar.cc/200?img=33",
    },
    {
      email: "amina@gaexpay.com",
      phone: "+23480210000004",
      firstName: "Amina",
      lastName: "Hassan",
      username: "amina",
      city: "Kano",
      country: "Nigeria",
      avatar: "https://i.pravatar.cc/200?img=47",
    },
    {
      email: "tunde@gaexpay.com",
      phone: "+23480210000005",
      firstName: "Tunde",
      lastName: "Adeyemi",
      username: "tunde",
      city: "Ibadan",
      country: "Nigeria",
      avatar: "https://i.pravatar.cc/200?img=15",
    },
    {
      email: "grace@gaexpay.com",
      phone: "+254721000006",
      firstName: "Grace",
      lastName: "Mwangi",
      username: "grace",
      city: "Nairobi",
      country: "Kenya",
      avatar: "https://i.pravatar.cc/200?img=20",
    },
    {
      email: "emeka@gaexpay.com",
      phone: "+23480210000007",
      firstName: "Emeka",
      lastName: "Nwosu",
      username: "emeka",
      city: "Port Harcourt",
      country: "Nigeria",
      avatar: "https://i.pravatar.cc/200?img=51",
    },
    {
      email: "zainab@gaexpay.com",
      phone: "+23480210000008",
      firstName: "Zainab",
      lastName: "Ibrahim",
      username: "zainab",
      city: "Kaduna",
      country: "Nigeria",
      avatar: "https://i.pravatar.cc/200?img=44",
    },
  ];

  const socialUsers = [];
  for (const s of socialUsersData) {
    const existing = await db.user.findUnique({ where: { email: s.email } });
    if (existing) {
      socialUsers.push(existing);
      continue;
    }
    const u = await db.user.create({
      data: {
        email: s.email,
        phone: s.phone,
        passwordHash: "social_hash",
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        city: s.city,
        country: s.country,
        avatar: s.avatar,
        kycStatus: "verified",
        kycTier: 2,
        status: "active",
        createdAt: daysAgo(rand(20, 90)),
      },
    });
    socialUsers.push(u);
  }
  console.log(`  ✓ ${socialUsers.length} social users ready`);

  // ---- Connections (5 accepted, 2 pending requests to demo user) ----
  const accepted = socialUsers.slice(0, 5);
  const pending = socialUsers.slice(5, 7);

  for (const u of accepted) {
    await db.connection.upsert({
      where: {
        requesterId_recipientId: {
          requesterId: DEMO_USER_ID,
          recipientId: u.id,
        },
      },
      update: { status: "accepted" },
      create: {
        requesterId: DEMO_USER_ID,
        recipientId: u.id,
        status: "accepted",
        createdAt: daysAgo(rand(7, 30)),
        updatedAt: daysAgo(rand(6, 29)),
      },
    });
  }
  for (const u of pending) {
    await db.connection.upsert({
      where: {
        requesterId_recipientId: {
          requesterId: u.id,
          recipientId: DEMO_USER_ID,
        },
      },
      update: { status: "pending" },
      create: {
        requesterId: u.id,
        recipientId: DEMO_USER_ID,
        status: "pending",
        createdAt: hoursAgo(rand(2, 36)),
      },
    });
  }
  console.log(`  ✓ ${accepted.length} accepted + ${pending.length} pending connections`);

  // ---- Social Posts ----
  const postSeeds = [
    {
      author: socialUsers[0], // Chinedu
      content:
        "Just paid my rent with GaexPay in 8 seconds. No queues, no slips, no stress. 🚀",
      createdAt: hoursAgo(2),
      likesCount: 3,
      comments: [
        { author: socialUsers[1], content: "Speed is unreal 🔥", minsAgo: 110 },
        { author: socialUsers[2], content: "Doing this for my next rent too!", minsAgo: 95 },
      ],
    },
    {
      author: socialUsers[1], // Fatima
      content:
        "Splitting weekend dinner with the girls — anyone who came last night please tap to pay your share 🍕",
      amountTag: 4500,
      amountKind: "split",
      currency: "NGN",
      createdAt: hoursAgo(5),
      likesCount: 5,
      comments: [
        { author: socialUsers[3], content: "Paying now 💸", minsAgo: 280 },
      ],
    },
    {
      author: socialUsers[2], // Kwame
      content:
        "Sent money home to mum in Kumasi this morning. She got the SMS before I closed the app. ❤️🌍",
      createdAt: hoursAgo(9),
      likesCount: 7,
      comments: [],
    },
    {
      author: socialUsers[3], // Amina
      content:
        "Raising funds for a small community library in Kano. Any amount helps — request below. 📚",
      amountTag: 1000,
      amountKind: "request",
      currency: "NGN",
      createdAt: hoursAgo(20),
      likesCount: 9,
      comments: [
        { author: socialUsers[0], content: "Sent 5k ❤️", minsAgo: 1180 },
        { author: socialUsers[5], content: "Will share with my network.", minsAgo: 1100 },
      ],
    },
    {
      author: socialUsers[4], // Tunde
      content:
        "Bought airtime + data in one flow from the new Pay tab. The auto-detect for MTN is *so* clean 👏",
      createdAt: daysAgo(1),
      likesCount: 4,
      comments: [],
    },
    {
      author: demoUser, // The demo user (so their posts appear on their own feed)
      content:
        "Started a new savings goal for the family trip to Zanzibar 🏝️  Already 30% there in 2 weeks.",
      createdAt: daysAgo(2),
      likesCount: 12,
      comments: [
        { author: socialUsers[0], content: "Zanzibar is magical! Have fun 🌊", minsAgo: 2880 },
      ],
    },
    {
      author: socialUsers[5], // Grace
      content:
        "Reminder: GaexPay Pro now waives all transfer fees on weekends. Tell a friend 📢",
      createdAt: daysAgo(3),
      likesCount: 18,
      comments: [
        { author: socialUsers[1], content: "Just upgraded ✨", minsAgo: 4320 },
        { author: socialUsers[4], content: "Worth it!", minsAgo: 4200 },
      ],
    },
    {
      author: socialUsers[6], // Emeka
      content:
        "Marketplace find: bought fuel at the TotalEnergies QR-station in PH — scan, pay, drive off. ⛽",
      imageUrl:
        "https://images.unsplash.com/photo-1541014741259-de529411b96a?w=800&q=80",
      createdAt: daysAgo(4),
      likesCount: 6,
      comments: [],
    },
    {
      author: socialUsers[7], // Zainab
      content:
        "Budgets feature helped me cut my food spend by 22% this month. Anyone else using it?",
      createdAt: daysAgo(5),
      likesCount: 8,
      comments: [
        { author: socialUsers[0], content: "Down 15% here 📉", minsAgo: 7200 },
      ],
    },
  ];

  for (const seed of postSeeds) {
    const post = await db.socialPost.create({
      data: {
        authorId: seed.author.id,
        content: seed.content,
        imageUrl: seed.imageUrl ?? null,
        amountTag: seed.amountTag ?? null,
        amountKind: seed.amountKind ?? "request",
        currency: seed.currency ?? "NGN",
        likesCount: seed.likesCount,
        commentsCount: seed.comments?.length ?? 0,
        createdAt: seed.createdAt,
        updatedAt: seed.createdAt,
      },
    });

    // Likes — first N social users (excluding the author if present)
    const likersPool = socialUsers.filter((u) => u.id !== seed.author.id);
    const likers = likersPool.slice(0, seed.likesCount);
    for (const liker of likers) {
      await db.socialLike.create({
        data: {
          postId: post.id,
          userId: liker.id,
          createdAt: hoursAgo(rand(1, 48)),
        },
      });
    }

    // Comments
    for (const c of seed.comments ?? []) {
      await db.socialComment.create({
        data: {
          postId: post.id,
          userId: c.author.id,
          content: c.content,
          createdAt: minutesAgo(c.minsAgo),
        },
      });
    }
  }
  console.log(`  ✓ ${postSeeds.length} social posts seeded`);

  // ---- Conversations + Messages ----
  // Conversation 1: demo user ↔ Chinedu (5 messages, mostly chitchat)
  const conv1 = await upsertConversation(DEMO_USER_ID, socialUsers[0].id);
  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: socialUsers[0].id,
      content: "Hey Adaeze, did the rent payment go through yesterday?",
      status: "read",
      createdAt: hoursAgo(3),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: DEMO_USER_ID,
      content: "Yes o! Settled in seconds 😄",
      status: "read",
      createdAt: hoursAgo(2.9),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: socialUsers[0].id,
      content: "Legend. Can you send me 2k for fuel? I'll pay back tonight.",
      status: "read",
      createdAt: hoursAgo(2.8),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: DEMO_USER_ID,
      content: "Done ✅ check your wallet.",
      status: "read",
      createdAt: hoursAgo(2.7),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: socialUsers[0].id,
      content: "Got it 🙌 Thanks a lot!",
      status: "delivered",
      createdAt: minutesAgo(8),
    },
  });

  // Conversation 2: demo user ↔ Fatima (3 messages, has unread)
  const conv2 = await upsertConversation(DEMO_USER_ID, socialUsers[1].id);
  await db.message.create({
    data: {
      conversationId: conv2.id,
      senderId: socialUsers[1].id,
      content: "Did you see the dinner split post? 🍕",
      status: "read",
      createdAt: hoursAgo(5),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv2.id,
      senderId: DEMO_USER_ID,
      content: "Just paid my share now ✅",
      status: "read",
      createdAt: hoursAgo(4.9),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv2.id,
      senderId: socialUsers[1].id,
      content: "Perfect, thanks girl 💃",
      status: "sent",
      createdAt: minutesAgo(3),
    },
  });

  // Conversation 3: demo user ↔ Kwame (2 messages, older)
  const conv3 = await upsertConversation(DEMO_USER_ID, socialUsers[2].id);
  await db.message.create({
    data: {
      conversationId: conv3.id,
      senderId: DEMO_USER_ID,
      content: "How's the weather in Accra?",
      status: "read",
      createdAt: daysAgo(2),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv3.id,
      senderId: socialUsers[2].id,
      content: "Hot as usual ☀️ but we're managing. You?",
      status: "read",
      createdAt: daysAgo(1.9),
    },
  });

  // Touch conversation updatedAt to match last message time
  for (const c of [conv1, conv2, conv3]) {
    const last = await db.message.findFirst({
      where: { conversationId: c.id },
      orderBy: { createdAt: "desc" },
    });
    if (last) {
      await db.conversation.update({
        where: { id: c.id },
        data: { updatedAt: last.createdAt },
      });
    }
  }
  console.log(`  ✓ 3 conversations + 10 messages seeded`);

  console.log("✅ Social + messaging seed complete.");
}

async function upsertConversation(aId: string, bId: string) {
  // Normalize: participantAId is the lexicographically smaller id, so the
  // @@unique pair is stable regardless of which side initiates.
  const [a, b] = aId < bId ? [aId, bId] : [bId, aId];
  return await db.conversation.upsert({
    where: {
      participantAId_participantBId: {
        participantAId: a,
        participantBId: b,
      },
    },
    update: {},
    create: {
      participantAId: a,
      participantBId: b,
    },
  });
}

main()
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
