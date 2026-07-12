/**
 * prisma/seed-chat-groups.ts — Task 22 (GaexChat groups)
 *
 * Seeds one demo group ("Lagos Family") with the demo user + 3 contacts so
 * the group chat is visible on first visit.
 *
 * Idempotent: deletes the demo group (by name) before re-seeding.
 *
 * Run: `bunx tsx prisma/seed-chat-groups.ts`
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DEMO_EMAIL = "demo@gaexpay.com";
const GROUP_NAME = "Lagos Family 👨‍👩‍👧‍👦";

async function main() {
  console.log("→ Seeding GaexChat group data...");

  const demoUser = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demoUser) {
    console.error(`✗ Demo user (${DEMO_EMAIL}) not found. Run seed.ts first.`);
    process.exit(1);
  }

  // Find the chat contacts created by seed-chat.ts
  const contacts = await db.user.findMany({
    where: {
      email: { in: ["chinedu@gaexpay.com", "fatima@gaexpay.com", "kwame@gaexpay.com"] },
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (contacts.length < 3) {
    console.warn(`  ! Only ${contacts.length} contacts found — run seed-chat.ts first.`);
  }

  // Clean previous demo group (idempotent)
  const existing = await db.chatGroup.findMany({ where: { name: GROUP_NAME, createdBy: demoUser.id }, select: { id: true } });
  for (const g of existing) {
    await db.chatGroupMember.deleteMany({ where: { groupId: g.id } });
    await db.message.deleteMany({ where: { conversation: { groupId: g.id } } });
    await db.conversation.deleteMany({ where: { groupId: g.id } });
    await db.chatGroup.delete({ where: { id: g.id } });
  }

  // Create group + conversation + members
  const group = await db.chatGroup.create({
    data: {
      name: GROUP_NAME,
      description: "Family chat — split bills & share updates 🏡",
      avatar: null,
      createdBy: demoUser.id,
    },
  });
  const conversation = await db.conversation.create({
    data: { groupId: group.id },
  });

  // Demo user as admin
  await db.chatGroupMember.create({ data: { groupId: group.id, userId: demoUser.id, role: "admin" } });
  for (const c of contacts) {
    await db.chatGroupMember.create({ data: { groupId: group.id, userId: c.id, role: "member" } }).catch(() => {/* skip */});
  }

  // Seed a few group messages
  if (contacts.length >= 3) {
    const [chinedu, fatima, kwame] = contacts;
    const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000);
    await db.message.create({ data: { conversationId: conversation.id, senderId: demoUser.id, content: "Hey family! 👋 Who's up for Sunday lunch?", status: "read", createdAt: hoursAgo(4) } });
    await db.message.create({ data: { conversationId: conversation.id, senderId: chinedu.id, content: "I'm in! 🙋‍♂️", status: "read", createdAt: hoursAgo(3.9) } });
    await db.message.create({ data: { conversationId: conversation.id, senderId: fatima.id, content: "Count me in too. Should we split the groceries?", status: "read", createdAt: hoursAgo(3.8) } });
    await db.message.create({ data: { conversationId: conversation.id, senderId: demoUser.id, content: "Great idea Fatima 🙌 I'll create a split for ₦15,000.", status: "read", createdAt: hoursAgo(3.7) } });
    // A group bill-split card
    const split = await db.chatBillSplit.create({
      data: {
        conversationId: conversation.id,
        initiatorId: demoUser.id,
        billerName: "Sunday Lunch Groceries",
        billerCategory: "food",
        totalAmount: 15000,
        currency: "NGN",
        note: "Shoprite haul — split 4 ways",
        status: "open",
      },
    });
    // 4 shares of ₦3,750 each
    const allMembers = [demoUser.id, chinedu.id, fatima.id, kwame.id];
    for (const uid of allMembers) {
      await db.chatBillSplitShare.create({
        data: {
          splitId: split.id,
          userId: uid,
          shareAmount: 3750,
          status: uid === demoUser.id ? "paid" : "pending",
          paidAt: uid === demoUser.id ? hoursAgo(3.5) : null,
        },
      });
    }
    await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: demoUser.id,
        content: "Bill split",
        kind: "split",
        metadata: JSON.stringify({
          splitId: split.id,
          billerName: "Sunday Lunch Groceries",
          billerCategory: "food",
          totalAmount: 15000,
          myShare: 3750,
          currency: "NGN",
          note: "Shoprite haul — split 4 ways",
          status: "open",
          direction: "out",
        }),
        status: "read",
        createdAt: hoursAgo(3.5),
      },
    });
    await db.message.create({ data: { conversationId: conversation.id, senderId: kwame.id, content: "Just paid my share ✅", status: "delivered", createdAt: hoursAgo(0.5) } });
  }

  console.log("✓ Demo group seeded.");
}

main()
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
