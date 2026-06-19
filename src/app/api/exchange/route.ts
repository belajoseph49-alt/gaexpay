import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Fallback rates
const RATES: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12, UGX: 0.42, XOF: 2.5, ZAR: 82,
};

export async function POST(req: Request) {
  const body = await req.json();
  const { fromWalletId, toWalletId, amount } = body;

  if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const fromWallet = await db.wallet.findFirst({ where: { id: fromWalletId, userId: DEMO_USER_ID } });
  const toWallet = await db.wallet.findFirst({ where: { id: toWalletId, userId: DEMO_USER_ID } });

  if (!fromWallet || !toWallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  if (fromWallet.balance < amount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // Calculate exchange rate
  let rate: number;
  if (fromWallet.currency === toWallet.currency) {
    rate = 1;
  } else {
    // Try DB first
    const dbRate = await db.exchangeRate.findFirst({
      where: { base: fromWallet.currency, quote: toWallet.currency },
    });
    if (dbRate) {
      rate = dbRate.rate;
    } else {
      // Fallback: convert via NGN
      rate = RATES[toWallet.currency] / RATES[fromWallet.currency];
    }
  }

  const convertedAmount = amount * rate;
  const fee = amount * 0.005; // 0.5% exchange fee

  // Update wallets
  await db.wallet.update({
    where: { id: fromWalletId },
    data: { balance: { decrement: amount + fee } },
  });
  await db.wallet.update({
    where: { id: toWalletId },
    data: { balance: { increment: convertedAmount } },
  });

  // Create debit transaction
  const debitTx = await db.transaction.create({
    data: {
      reference: ref(),
      userId: DEMO_USER_ID,
      senderId: DEMO_USER_ID,
      type: "exchange",
      direction: "debit",
      status: "completed",
      amount,
      fee,
      currency: fromWallet.currency,
      description: `Exchange to ${toWallet.currency}`,
      category: "general",
      counterpartyName: `Exchange → ${toWallet.currency}`,
      method: "wallet",
      walletId: fromWalletId,
      completedAt: new Date(),
    },
  });

  // Create credit transaction
  const creditTx = await db.transaction.create({
    data: {
      reference: ref(),
      userId: DEMO_USER_ID,
      senderId: DEMO_USER_ID,
      type: "exchange",
      direction: "credit",
      status: "completed",
      amount: convertedAmount,
      fee: 0,
      currency: toWallet.currency,
      description: `Exchange from ${fromWallet.currency}`,
      category: "general",
      counterpartyName: `Exchange ← ${fromWallet.currency}`,
      method: "wallet",
      walletId: toWalletId,
      completedAt: new Date(),
    },
  });

  // Create notification
  await db.notification.create({
    data: {
      userId: DEMO_USER_ID,
      title: "Exchange completed",
      message: `Converted ${fromWallet.currency} ${amount.toLocaleString()} to ${toWallet.currency} ${convertedAmount.toLocaleString()} at rate ${rate.toFixed(4)}.`,
      type: "transaction",
      channel: "push",
    },
  });

  return NextResponse.json({
    success: true,
    rate,
    convertedAmount,
    fee,
    debitTx,
    creditTx,
  });
}
