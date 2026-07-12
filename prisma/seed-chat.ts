/**
 * prisma/seed-chat.ts — Task 21 (GaexChat)
 *
 * Seeds the social-chat demo data: chat contacts, conversations, plain-text
 * messages, and native financial messages (payment card, payment request,
 * bill split) so the GaexChat view looks alive on first visit.
 *
 * Idempotent: wipes Conversation/Message/PaymentRequest/ChatBillSplit rows
 * for the demo user before re-seeding. Does NOT touch the demo user or any
 * wallet/transaction data.
 *
 * Run: `bunx tsx prisma/seed-chat.ts`
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DEMO_EMAIL = "demo@gaexpay.com";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function hoursAgo(n: number) {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}
function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000);
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

const CHAT_CONTACTS = [
  { email: "chinedu@gaexpay.com", phone: "+23480310000001", firstName: "Chinedu", lastName: "Eze", username: "chinedu", city: "Lagos", country: "Nigeria", avatar: "https://i.pravatar.cc/200?img=12" },
  { email: "fatima@gaexpay.com", phone: "+23480310000002", firstName: "Fatima", lastName: "Bello", username: "fatima", city: "Abuja", country: "Nigeria", avatar: "https://i.pravatar.cc/200?img=23" },
  { email: "kwame@gaexpay.com", phone: "+233240000003", firstName: "Kwame", lastName: "Mensah", username: "kwame", city: "Accra", country: "Ghana", avatar: "https://i.pravatar.cc/200?img=33" },
  { email: "amina@gaexpay.com", phone: "+23480310000004", firstName: "Amina", lastName: "Hassan", username: "amina", city: "Kano", country: "Nigeria", avatar: "https://i.pravatar.cc/200?img=44" },
  { email: "tunde@gaexpay.com", phone: "+23480310000005", firstName: "Tunde", lastName: "Adeyemi", username: "tunde", city: "Ibadan", country: "Nigeria", avatar: "https://i.pravatar.cc/200?img=15" },
  { email: "grace@gaexpay.com", phone: "+254721000006", firstName: "Grace", lastName: "Mwangi", username: "grace", city: "Nairobi", country: "Kenya", avatar: "https://i.pravatar.cc/200?img=20" },
];

async function upsertConversation(aId: string, bId: string) {
  const [a, b] = aId < bId ? [aId, bId] : [bId, aId];
  return await db.conversation.upsert({
    where: {
      participantAId_participantBId: { participantAId: a, participantBId: b },
    },
    update: {},
    create: { participantAId: a, participantBId: b },
  });
}

async function main() {
  console.log("→ Seeding GaexChat data...");

  const demoUser = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demoUser) {
    console.error(`✗ Demo user (${DEMO_EMAIL}) not found. Run seed.ts first.`);
    process.exit(1);
  }

  // Ensure chat contacts exist
  const contacts = [];
  for (const c of CHAT_CONTACTS) {
    const existing = await db.user.findUnique({ where: { email: c.email } });
    if (existing) {
      contacts.push(existing);
      continue;
    }
    const u = await db.user.create({
      data: {
        email: c.email,
        phone: c.phone,
        passwordHash: "chat_hash",
        firstName: c.firstName,
        lastName: c.lastName,
        username: c.username,
        city: c.city,
        country: c.country,
        avatar: c.avatar,
        kycStatus: "verified",
        kycTier: 2,
        status: "active",
        createdAt: daysAgo(60),
      },
    });
    contacts.push(u);
  }
  console.log(`  ✓ ${contacts.length} chat contacts ready`);

  // Clean previous chat data for the demo user (idempotent)
  // Find conversations involving the demo user
  const demoConvs = await db.conversation.findMany({
    where: {
      OR: [{ participantAId: demoUser.id }, { participantBId: demoUser.id }],
    },
    select: { id: true },
  });
  const convIds = demoConvs.map((c) => c.id);
  if (convIds.length > 0) {
    await db.message.deleteMany({ where: { conversationId: { in: convIds } } });
  }
  await db.paymentRequest.deleteMany({
    where: { OR: [{ requesterId: demoUser.id }, { payerId: demoUser.id }] },
  });
  await db.chatBillSplitShare.deleteMany({
    where: { OR: [{ userId: demoUser.id }, { split: { initiatorId: demoUser.id } }] },
  });
  await db.chatBillSplit.deleteMany({ where: { initiatorId: demoUser.id } });
  await db.conversation.deleteMany({
    where: { OR: [{ participantAId: demoUser.id }, { participantBId: demoUser.id }] },
  });
  console.log(`  ✓ Cleaned previous chat data (${convIds.length} conversations)`);

  // ── Conversation 1: demo ↔ Chinedu (text + a payment card) ──────────────
  const conv1 = await upsertConversation(demoUser.id, contacts[0].id);
  const c1 = contacts[0];
  await db.message.create({ data: { conversationId: conv1.id, senderId: c1.id, content: "Hey Adaeze, did the rent payment go through yesterday?", status: "read", createdAt: hoursAgo(3) } });
  await db.message.create({ data: { conversationId: conv1.id, senderId: demoUser.id, content: "Yes o! Settled in seconds 😄", status: "read", createdAt: hoursAgo(2.9) } });
  await db.message.create({ data: { conversationId: conv1.id, senderId: c1.id, content: "Legend. Can you send me 2k for fuel? I'll pay back tonight.", status: "read", createdAt: hoursAgo(2.8) } });
  // Native payment card — demo sent ₦2,000 to Chinedu
  await db.message.create({
    data: {
      conversationId: conv1.id,
      senderId: demoUser.id,
      content: "Payment sent",
      kind: "payment",
      metadata: JSON.stringify({
        amount: 2000,
        currency: "NGN",
        status: "completed",
        txRef: "GXPC1PAY0001",
        note: "Fuel money 💸",
        direction: "out",
      }),
      status: "read",
      createdAt: hoursAgo(2.7),
    },
  });
  await db.message.create({ data: { conversationId: conv1.id, senderId: c1.id, content: "Got it 🙌 Thanks a lot!", status: "delivered", createdAt: minutesAgo(8) } });

  // ── Conversation 2: demo ↔ Fatima (text + pending payment request) ──────
  const conv2 = await upsertConversation(demoUser.id, contacts[1].id);
  const c2 = contacts[1];
  await db.message.create({ data: { conversationId: conv2.id, senderId: c2.id, content: "Did you see the dinner split post? 🍕", status: "read", createdAt: hoursAgo(5) } });
  await db.message.create({ data: { conversationId: conv2.id, senderId: demoUser.id, content: "Just paid my share now ✅", status: "read", createdAt: hoursAgo(4.9) } });
  // Payment request — Fatima asks demo for ₦1,500 for lunch
  const req = await db.paymentRequest.create({
    data: {
      conversationId: conv2.id,
      requesterId: c2.id,
      payerId: demoUser.id,
      amount: 1500,
      currency: "NGN",
      note: "Lunch split — Chicken Republic 🍗",
      status: "pending",
      createdAt: minutesAgo(20),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv2.id,
      senderId: c2.id,
      content: "Payment request",
      kind: "request",
      metadata: JSON.stringify({
        requestId: req.id,
        amount: 1500,
        currency: "NGN",
        note: "Lunch split — Chicken Republic 🍗",
        status: "pending",
        direction: "in", // demo is the payer
      }),
      status: "sent",
      createdAt: minutesAgo(20),
    },
  });
  await db.message.create({ data: { conversationId: conv2.id, senderId: c2.id, content: "Perfect, thanks girl 💃", status: "sent", createdAt: minutesAgo(3) } });

  // ── Conversation 3: demo ↔ Kwame (older chat, settled request) ──────────
  const conv3 = await upsertConversation(demoUser.id, contacts[2].id);
  const c3 = contacts[2];
  await db.message.create({ data: { conversationId: conv3.id, senderId: demoUser.id, content: "How's the weather in Accra?", status: "read", createdAt: daysAgo(2) } });
  await db.message.create({ data: { conversationId: conv3.id, senderId: c3.id, content: "Hot as usual ☀️ but we're managing. You?", status: "read", createdAt: daysAgo(1.9) } });
  // Settled request — demo asked Kwame for ₦5,000, he paid
  const req2 = await db.paymentRequest.create({
    data: {
      conversationId: conv3.id,
      requesterId: demoUser.id,
      payerId: c3.id,
      amount: 5000,
      currency: "NGN",
      note: "Birthday contribution 🎂",
      status: "paid",
      createdAt: daysAgo(1),
      resolvedAt: hoursAgo(20),
    },
  });
  await db.message.create({
    data: {
      conversationId: conv3.id,
      senderId: demoUser.id,
      content: "Payment request",
      kind: "request",
      metadata: JSON.stringify({
        requestId: req2.id,
        amount: 5000,
        currency: "NGN",
        note: "Birthday contribution 🎂",
        status: "paid",
        direction: "out", // demo is the requester
      }),
      status: "read",
      createdAt: daysAgo(1),
    },
  });
  await db.message.create({ data: { conversationId: conv3.id, senderId: c3.id, content: "Sent! Happy birthday in advance 🎉", status: "read", createdAt: hoursAgo(19) } });

  // ── Conversation 4: demo ↔ Amina (bill split) ───────────────────────────
  const conv4 = await upsertConversation(demoUser.id, contacts[3].id);
  const c4 = contacts[3];
  await db.message.create({ data: { conversationId: conv4.id, senderId: c4.id, content: "Did you get the DSTV renewal reminder?", status: "read", createdAt: hoursAgo(6) } });
  // Bill split — Amina initiated, demo + Amina each pay half of ₦12,500 DSTV bill
  const split = await db.chatBillSplit.create({
    data: {
      conversationId: conv4.id,
      initiatorId: c4.id,
      billerName: "DSTV",
      billerCategory: "tv",
      totalAmount: 12500,
      currency: "NGN",
      note: "DSTV Compact Plus — this month",
      status: "open",
      createdAt: hoursAgo(5.5),
    },
  });
  await db.chatBillSplitShare.create({ data: { splitId: split.id, userId: c4.id, shareAmount: 6250, status: "paid", paidAt: hoursAgo(5) } });
  await db.chatBillSplitShare.create({ data: { splitId: split.id, userId: demoUser.id, shareAmount: 6250, status: "pending" } });
  await db.message.create({
    data: {
      conversationId: conv4.id,
      senderId: c4.id,
      content: "Bill split",
      kind: "split",
      metadata: JSON.stringify({
        splitId: split.id,
        billerName: "DSTV",
        billerCategory: "tv",
        totalAmount: 12500,
        currency: "NGN",
        myShare: 6250,
        status: "open",
        direction: "in", // demo is being asked
      }),
      status: "sent",
      createdAt: hoursAgo(5.5),
    },
  });
  await db.message.create({ data: { conversationId: conv4.id, senderId: demoUser.id, content: "I'll pay my share shortly 🙏", status: "read", createdAt: hoursAgo(2) } });

  // ── Conversation 5: demo ↔ Tunde (simple text) ──────────────────────────
  const conv5 = await upsertConversation(demoUser.id, contacts[4].id);
  const c5 = contacts[4];
  await db.message.create({ data: { conversationId: conv5.id, senderId: c5.id, content: "Boss, you dey come tomorrow?", status: "read", createdAt: hoursAgo(8) } });
  await db.message.create({ data: { conversationId: conv5.id, senderId: demoUser.id, content: "Sure, 10am at the office.", status: "read", createdAt: hoursAgo(7.5) } });

  // ── Conversation 6: demo ↔ Grace (simple text) ──────────────────────────
  const conv6 = await upsertConversation(demoUser.id, contacts[5].id);
  const c6 = contacts[5];
  await db.message.create({ data: { conversationId: conv6.id, senderId: c6.id, content: "Karibu! How was your trip to Mombasa?", status: "read", createdAt: daysAgo(3) } });
  await db.message.create({ data: { conversationId: conv6.id, senderId: demoUser.id, content: "Amazing! Beach was 🤌", status: "read", createdAt: daysAgo(2.9) } });

  console.log(`  ✓ 6 conversations + financial messages seeded`);
  console.log("✓ GaexChat seed complete.");
}

main()
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
