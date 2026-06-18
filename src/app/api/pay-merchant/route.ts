import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function createPaymentTx(body: any) {
  const { amount, currency = "NGN", description, type, category, counterpartyName, method, provider } = body;
  const fee = method === "momo" ? Number(amount) * 0.01 : 0;
  return db.transaction.create({
    data: {
      reference: ref(),
      userId: DEMO_USER_ID,
      senderId: DEMO_USER_ID,
      type: type || "payment",
      direction: "debit",
      status: "completed",
      amount: Number(amount),
      fee,
      currency,
      description: description || `${type} payment`,
      category: category || "general",
      counterpartyName,
      method: method || "wallet",
      provider: provider || null,
      completedAt: new Date(),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tx = await createPaymentTx(body);
    await db.notification.create({
      data: {
        userId: DEMO_USER_ID,
        title: body.title || "Payment successful",
        message: body.message || `${body.currency || "NGN"} ${Number(body.amount).toLocaleString()} paid to ${body.counterpartyName || "merchant"}.`,
        type: "transaction",
        channel: "push",
      },
    });
    return NextResponse.json({ success: true, transaction: tx });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
