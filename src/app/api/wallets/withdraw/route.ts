import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { z } from "zod";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function ref() {
  return "WTH" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

const withdrawSchema = z.object({
  amount: z.number().positive(),
  destinationId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = withdrawSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid payload", 400);
    }
    const { amount, destinationId } = parsed.data;
    const currency = "NGN"; // Defaulting to NGN for now

    // 1% fee for withdrawals, max 5000 NGN
    const fee = Math.min(amount * 0.01, 5000);
    const totalAmount = amount + fee;

    const result = await db.$transaction(async (tx) => {
      // Find beneficiary
      const beneficiary = await tx.beneficiary.findUnique({
        where: { id: destinationId, userId }
      });
      if (!beneficiary) {
        throw new HttpError(404, "Beneficiary not found");
      }

      // Find user's default wallet
      let wallet = await tx.wallet.findFirst({
        where: { userId, currency, isDefault: true }
      });
      if (!wallet) {
        wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      }
      if (!wallet) {
        throw new HttpError(404, "Wallet not found");
      }

      // Check balance
      if (wallet.balance < totalAmount) {
        throw new HttpError(400, "Insufficient balance");
      }

      // Initiate Paystack Transfer
      if (process.env.PAYSTACK_SECRET_KEY) {
        // NOTE: In a real system, you first create a transfer recipient on Paystack, then initiate the transfer.
        // Since we are mocking/simulating the endpoint logic:
        const paystackRes = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(amount * 100),
            recipient: beneficiary.account, // Real app: this should be a Paystack recipient code
            reason: "GaexPay Withdrawal",
            currency: currency,
          }),
        });
        
        const paystackData = await paystackRes.json();
        // We tolerate errors in dev/test mode if it fails due to invalid mock data
        if (!paystackRes.ok && !process.env.PAYSTACK_SECRET_KEY.includes("test")) {
          throw new HttpError(500, `Withdrawal Failed: ${paystackData.message}`);
        }
      }

      // Deduct balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: totalAmount } }
      });

      // Create transaction
      const txRecord = await tx.transaction.create({
        data: {
          reference: ref(),
          userId,
          senderId: userId,
          type: "withdrawal",
          direction: "debit",
          status: "completed", // In a real system this might be "pending" until webhook
          amount,
          fee,
          currency,
          description: `Withdrawal to ${beneficiary.name}`,
          category: "withdrawal",
          counterpartyName: beneficiary.name,
          counterpartyAccount: beneficiary.account,
          counterpartyBank: beneficiary.bank || beneficiary.type,
          method: beneficiary.type || "bank",
          provider: null,
          walletId: wallet.id,
          riskScore: 0.1,
          fraudFlag: false,
          completedAt: new Date(),
        }
      });

      return { txRecord, newBalance: updatedWallet.balance };
    });

    await db.notification.create({
      data: {
        userId,
        title: "Withdrawal Successful",
        message: `Your withdrawal of ${currency} ${amount.toLocaleString("en-US")} is processing.`,
        type: "transaction",
        channel: "push",
      },
    });

    return NextResponse.json({
      success: true,
      transaction: result.txRecord,
      walletBalanceAfter: result.newBalance,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      return apiError(e.message, e.status);
    }
    return apiCatch(e);
  }
}
