import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

export async function GET() {
  const transfers = await db.scheduledTransfer.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: { nextRunAt: "asc" },
  });
  const totalMonthly = transfers
    .filter((t) => t.status === "active" && t.frequency === "monthly")
    .reduce((s, t) => s + t.amount, 0);
  return NextResponse.json({ transfers, totalMonthly });
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
