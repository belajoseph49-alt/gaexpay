import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return "GXPC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

async function getConvForUser(conversationId: string, userId: string) {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, participantAId: true, participantBId: true },
  });
  if (!conv) return null;
  if (conv.participantAId !== userId && conv.participantBId !== userId) return null;
  const otherId = conv.participantAId === userId ? conv.participantBId : conv.participantAId;
  return { conv, otherId };
}

/**
 * POST /api/messaging/conversations/[id]/send-money
 * Body: { amount, currency?, note? }
 * Sends money to the other participant. Real-time balance check inside
 * db.$transaction. Creates a Transaction row + a native "payment" chat
 * message (transaction card). Returns { message, walletBalanceAfter, txRef }.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const ctx = await getConvForUser(id, userId);
    if (!ctx) return apiError("Conversation not found", 404);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const amount = Number(body.amount);
    const currency = (body.currency || "NGN").toString().toUpperCase();
    const note = (body.note || "").toString().trim().slice(0, 200);
    if (!Number.isFinite(amount) || amount <= 0) return apiError("Invalid amount", 400);
    if (amount > 10_000_000) return apiError("Amount too large", 400);

    const recipient = await db.user.findUnique({
      where: { id: ctx.otherId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!recipient) return apiError("Recipient not found", 404);
    const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim();

    const txRef = ref();

    const result = await db.$transaction(async (tx) => {
      let wallet = await tx.wallet.findFirst({ where: { userId, currency, isDefault: true } });
      if (!wallet) wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      if (!wallet) throw new Error("WALLET_NOT_FOUND");

      if (wallet.balance < amount) {
        throw new Error(`Insufficient balance (available: ${wallet.balance}, required: ${amount})`);
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      const txRecord = await tx.transaction.create({
        data: {
          reference: txRef,
          userId,
          senderId: userId,
          type: "transfer",
          direction: "debit",
          status: "completed",
          amount,
          fee: 0,
          currency,
          description: note || `Sent to ${recipientName} via GaexChat`,
          category: "p2p",
          counterpartyName: recipientName,
          method: "wallet",
          provider: null,
          walletId: wallet.id,
          riskScore: 0.1,
          fraudFlag: false,
          completedAt: new Date(),
        },
      });

      const message = await tx.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: "Payment sent",
          kind: "payment",
          metadata: JSON.stringify({
            amount,
            currency,
            status: "completed",
            txRef,
            note: note || null,
            direction: "out",
            recipientName,
            transactionId: txRecord.id,
          }),
          status: "sent",
        },
      });

      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      return { message, walletBalanceAfter: updatedWallet.balance, txRef };
    });

    await db.notification.create({
      data: {
        userId,
        title: "Payment sent",
        message: `You sent ${currency} ${amount.toLocaleString("en-US")} to ${recipientName} via GaexChat.`,
        type: "transaction",
        channel: "push",
      },
    }).catch(() => {/* ignore */});

    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.message === "WALLET_NOT_FOUND") return apiError("Wallet not found for this currency", 404);
    if (e?.message?.startsWith("Insufficient balance")) return apiError(e.message, 400);
    return apiCatch(e);
  }
}
