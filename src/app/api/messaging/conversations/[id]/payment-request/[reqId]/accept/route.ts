import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return "GXPC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * POST /api/messaging/conversations/[id]/payment-request/[reqId]/accept
 *
 * The auth user (payer) accepts and pays a payment request.
 * - Re-fetches wallet inside db.$transaction (real-time balance check)
 * - Creates a Transaction row (debit) → appears in main wallet history
 * - Marks PaymentRequest.status = "paid" + links transactionId
 * - Creates a native "payment" chat message (confirmation card)
 * - Returns { message, walletBalanceAfter, txRef }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; reqId: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id, reqId } = await params;

    const request = await db.paymentRequest.findUnique({
      where: { id: reqId },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!request) return apiError("Payment request not found", 404);
    if (request.conversationId !== id) return apiError("Request does not belong to this conversation", 400);
    if (request.payerId !== userId) return apiError("You are not the payer of this request", 403);
    if (request.status === "paid") return apiError("This request has already been paid", 400);
    if (request.status === "declined") return apiError("This request was already declined", 400);

    const { amount, currency } = request;
    const requesterName = `${request.requester.firstName} ${request.requester.lastName}`.trim();
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
          description: request.note || `Paid request to ${requesterName}`,
          category: "p2p",
          counterpartyName: requesterName,
          method: "wallet",
          walletId: wallet.id,
          riskScore: 0.1,
          fraudFlag: false,
          completedAt: new Date(),
        },
      });

      // Mark the request as paid + link the transaction
      await tx.paymentRequest.update({
        where: { id: reqId },
        data: {
          status: "paid",
          transactionId: txRecord.id,
          resolvedAt: new Date(),
        },
      });

      // Confirmation card message in the chat
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
            note: request.note || null,
            direction: "out",
            recipientName: requesterName,
            transactionId: txRecord.id,
            requestId: reqId,
            requestPaid: true,
          }),
          status: "sent",
        },
      });

      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      return { message, walletBalanceAfter: updatedWallet.balance, txRef };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    if (e?.message === "WALLET_NOT_FOUND") return apiError("Wallet not found for this currency", 404);
    if (e?.message?.startsWith("Insufficient balance")) return apiError(e.message, 400);
    return apiCatch(e);
  }
}
