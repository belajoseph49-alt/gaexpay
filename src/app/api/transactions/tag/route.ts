import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

const PRESET_TAGS = [
  { id: "essential", label: "Essential", color: "emerald", icon: "✅" },
  { id: "subscription", label: "Subscription", color: "violet", icon: "🔄" },
  { id: "business", label: "Business", color: "sky", icon: "💼" },
  { id: "personal", label: "Personal", color: "amber", icon: "👤" },
  { id: "investment", label: "Investment", color: "teal", icon: "📈" },
  { id: "gift", label: "Gift", color: "rose", icon: "🎁" },
  { id: "loan", label: "Loan", color: "orange", icon: "💰" },
  { id: "tax", label: "Tax", color: "slate", icon: "🧾" },
];

export async function GET() {
  const transactions = await db.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    select: { id: true, metadata: true },
  });

  // Extract all tags used
  const tagUsage: Record<string, number> = {};
  for (const t of transactions) {
    if (t.metadata) {
      try {
        const meta = JSON.parse(t.metadata);
        if (meta.tags && Array.isArray(meta.tags)) {
          for (const tag of meta.tags) {
            tagUsage[tag] = (tagUsage[tag] || 0) + 1;
          }
        }
      } catch {}
    }
  }

  const tags = PRESET_TAGS.map((t) => ({
    ...t,
    count: tagUsage[t.id] || 0,
  }));

  return NextResponse.json({ tags, tagUsage });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { transactionId, tags } = body;

  const tx = await db.transaction.findFirst({
    where: { id: transactionId, userId: DEMO_USER_ID },
  });
  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  // Parse existing metadata or create new
  let metadata: any = {};
  if (tx.metadata) {
    try { metadata = JSON.parse(tx.metadata); } catch {}
  }
  metadata.tags = tags;

  const updated = await db.transaction.update({
    where: { id: transactionId },
    data: { metadata: JSON.stringify(metadata) },
  });

  return NextResponse.json({ success: true, transaction: updated });
}
