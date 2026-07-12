import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return "GXPC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * POST /api/messaging/conversations/[id]/bill-split/[splitId]/pay
 *
 * The auth user pays their pending share of a bill split.
 * - Real-time wallet balance check inside db.$transaction
 * - Creates a Transaction row (debit) → main wallet history
 * - Marks ChatBillSplitShare.status = "paid"
 * - If all shares paid, marks ChatBillSplit.status = "settled"
 * - Creates a native "payment" confirmation card message
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; splitId: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id, splitId } = await params;

    const split = await db.chatBillSplit.findUnique({
      where: { id: splitId },
      include: { shares: true },
    });
    if (!split) return apiError("Bill split not found", 404);
    if (split.conversationId !== id) return apiError("Split does not belong to this conversation", 400);

    const myShare = split.shares.find((s) => s.userId === userId);
    if (!myShare) return apiError("You are not part of this split", 403);
    if (myShare.status === "paid") return apiError("You have already paid your share", 400);

    const { shareAmount, currency } = myShare;
    const txRef = ref();

    const result = await db.$transaction(async (tx) => {
      let wallet = await tx.wallet.findFirst({ where: { userId, currency, isDefault: true } });
      if (!wallet) wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      if (!wallet) throw new Error("WALLET_NOT_FOUND");

      if (wallet.balance < shareAmount) {
        throw new Error(`Insufficient balance (available: ${wallet.balance}, required: ${shareAmount})`);
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: shareAmount } },
      });

      const txRecord = await tx.transaction.create({
        data: {
          reference: txRef,
          userId,
          senderId: userId,
          type: "bill",
          direction: "debit",
          status: "completed",
          amount: shareAmount,
          fee: 0,
          currency,
          description: split.note || `Bill split — ${split.billerName}`,
          category: "bills",
          counterpartyName: split.billerName,
          method: "wallet",
          walletId: wallet.id,
          riskScore: 0.1,
          fraudFlag: false,
          completedAt: new Date(),
        },
      });

      // Mark my share as paid
      await tx.chatBillSplitShare.update({
        where: { id: myShare.id },
        data: { status: "paid", paidAt: new Date(), transactionId: txRecord.id },
      });

      // Check if all shares are now paid → settle the split
      const remainingShares = await tx.chatBillSplitShare.count({
        where: { splitId, status: "pending" },
      });
      if (remainingShares === 0) {
        await tx.chatBillSplit.update({
          where: { id: splitId },
          data: { status: "settled" },
        });
      }

      // Confirmation card message
      const message = await tx.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: "Bill share paid",
          kind: "payment",
          metadata: JSON.stringify({
            amount: shareAmount,
            currency,
            status: "completed",
            txRef,
            note: split.note || null,
            direction: "out",
            recipientName: split.billerName,
            transactionId: txRecord.id,
            splitId,
            splitPaid: true,
            billerName: split.billerName,
          }),
          status: "sent",
        },
      });

      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      const settled = remainingShares === 0;
      return { message, walletBalanceAfter: updatedWallet.balance, txRef, settled };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.message === "WALLET_NOT_FOUND") return apiError("Wallet not found for this currency", 404);
    if (e?.message?.startsWith("Insufficient balance")) return apiError(e.message, 400);
    return apiCatch(e);
  }
}
