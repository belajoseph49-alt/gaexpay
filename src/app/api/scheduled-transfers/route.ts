import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getNextRun(frequency: string, from: Date): Date {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

export async function GET() {
  const transfers = await db.scheduledTransfer.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { nextRunAt: "asc" },
  });

  // Auto-process any due transfers (nextRunAt <= now)
  const now = new Date();
  const processed: any[] = [];
  for (const t of transfers) {
    if (t.status === "active" && new Date(t.nextRunAt) <= now) {
      // Create a transaction for this scheduled run
      const tx = await db.transaction.create({
        data: {
          reference: ref(),
          userId: DEMO_USER_ID,
          senderId: DEMO_USER_ID,
          type: "transfer",
          direction: "debit",
          status: "completed",
          amount: t.amount,
          fee: t.method === "bank" ? Math.min(t.amount * 0.005, 5000) : t.method === "momo" ? t.amount * 0.01 : 0,
          currency: t.currency,
          description: t.note || `Scheduled transfer to ${t.recipientName}`,
          category: "p2p",
          counterpartyName: t.recipientName,
          counterpartyAccount: t.recipientAccount,
          counterpartyBank: t.recipientBank,
          method: t.method,
          provider: t.provider,
          completedAt: now,
        },
      });

      // Create notification
      await db.notification.create({
        data: {
          userId: DEMO_USER_ID,
          title: "Scheduled transfer executed",
          message: `${t.currency} ${t.amount.toLocaleString()} sent to ${t.recipientName} automatically.`,
          type: "transaction",
          channel: "push",
        },
      });

      // Update the scheduled transfer
      const nextRun = t.frequency === "once" ? null : getNextRun(t.frequency, now);
      const updated = await db.scheduledTransfer.update({
        where: { id: t.id },
        data: {
          lastRunAt: now,
          nextRunAt: nextRun || now,
          totalRuns: { increment: 1 },
          status: t.frequency === "once" ? "completed" : "active",
        },
      });
      processed.push({ transfer: updated, tx });
    }
  }

  // Re-fetch after processing
  const finalTransfers = processed.length > 0
    ? await db.scheduledTransfer.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { nextRunAt: "asc" } })
    : transfers;

  const totalMonthly = finalTransfers
    .filter((t) => t.status === "active" && t.frequency === "monthly")
    .reduce((s, t) => s + t.amount, 0);

  return NextResponse.json({
    transfers: finalTransfers,
    totalMonthly,
    processed: processed.length,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const transfer = await db.scheduledTransfer.create({
    data: {
      userId: DEMO_USER_ID,
      recipientName: body.recipientName,
      recipientAccount: body.recipientAccount,
      recipientBank: body.recipientBank,
      method: body.method || "wallet",
      provider: body.provider,
      amount: Number(body.amount),
      currency: body.currency || "NGN",
      note: body.note,
      frequency: body.frequency,
      nextRunAt: new Date(body.nextRunAt),
      status: "active",
    },
  });
  return NextResponse.json({ transfer });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const transfer = await db.scheduledTransfer.update({
    where: { id: body.id },
    data: { ...(body.status && { status: body.status }) },
  });
  return NextResponse.json({ transfer });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.scheduledTransfer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
