import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, currency = "NGN", recipient, method = "wallet", provider, note, category = "p2p" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const wallet = await db.wallet.findFirst({
      where: { userId: DEMO_USER_ID, currency, isDefault: true },
    });
    if (!wallet) {
      const anyWallet = await db.wallet.findFirst({ where: { userId: DEMO_USER_ID, currency } });
      if (!anyWallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const fee = method === "bank" ? Math.min(amount * 0.005, 5000) : method === "momo" ? amount * 0.01 : 0;

    const tx = await db.transaction.create({
      data: {
        reference: ref(),
        userId: DEMO_USER_ID,
        senderId: DEMO_USER_ID,
        type: "transfer",
        direction: "debit",
        status: "completed",
        amount: Number(amount),
        fee,
        currency,
        description: note || `Transfer to ${recipient?.name || recipient}`,
        category,
        counterpartyName: recipient?.name,
        counterpartyAccount: recipient?.account,
        counterpartyBank: recipient?.bank,
        method,
        provider: provider || null,
        riskScore: Math.random() < 0.05 ? 0.8 : 0.1,
        fraudFlag: false,
        completedAt: new Date(),
      },
    });

    await db.notification.create({
      data: {
        userId: DEMO_USER_ID,
        title: "Transfer successful",
        message: `You sent ${currency} ${Number(amount).toLocaleString()} to ${recipient?.name || recipient}.`,
        type: "transaction",
        channel: "push",
      },
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
