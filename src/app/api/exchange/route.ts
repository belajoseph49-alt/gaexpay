import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

// Fallback rates
const RATES: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12, UGX: 0.42, XOF: 2.5, ZAR: 82,
};

/**
 * POST /api/exchange — convert balance between two of the user's wallets.
 *
 * Money-moving: debits one wallet, credits another, charges a 0.5% fee.
 * Wrapped in `db.$transaction` so a failure mid-flow can't lose funds.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as { fromWalletId?: string; toWalletId?: string; amount?: number | string };
    const { fromWalletId, toWalletId, amount } = b;
    if (!fromWalletId || !toWalletId || !amount) {
      return apiError("Missing required fields", 400);
    }
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) return apiError("Amount must be positive", 400);

    const result = await db.$transaction(async (tx) => {
      const fromWallet = await tx.wallet.findFirst({ where: { id: fromWalletId, userId } });
      const toWallet = await tx.wallet.findFirst({ where: { id: toWalletId, userId } });
      if (!fromWallet || !toWallet) {
        throw new HttpError(404, "Wallet not found");
      }
      if (fromWallet.balance < amt) {
        throw new HttpError(400, "Insufficient balance");
      }

      // Calculate exchange rate
      let rate: number;
      if (fromWallet.currency === toWallet.currency) {
        rate = 1;
      } else {
        const dbRate = await tx.exchangeRate.findFirst({
          where: { base: fromWallet.currency, quote: toWallet.currency },
        });
        if (dbRate) {
          rate = dbRate.rate;
        } else {
          rate = RATES[toWallet.currency] / RATES[fromWallet.currency];
        }
      }

      const convertedAmount = amt * rate;
      const fee = amt * 0.005; // 0.5% exchange fee

      await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amt + fee } },
      });
      await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: convertedAmount } },
      });

      const debitTx = await tx.transaction.create({
        data: {
          reference: ref(),
          userId,
          senderId: userId,
          type: "exchange",
          direction: "debit",
          status: "completed",
          amount: amt,
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

      const creditTx = await tx.transaction.create({
        data: {
          reference: ref(),
          userId,
          senderId: userId,
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

      await tx.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "exchange.create",
          entity: "transaction",
          entityId: debitTx.id,
          ip: clientIp(req),
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({
            from: fromWallet.currency,
            to: toWallet.currency,
            amount: amt,
            convertedAmount,
            rate,
            fee,
            creditTxId: creditTx.id,
          }),
          severity: "info",
        },
      });

      return { rate, convertedAmount, fee, debitTx, creditTx };
    });

    // Notification (outside the financial transaction)
    await db.notification.create({
      data: {
        userId,
        title: "Exchange completed",
        message: `Converted ${result.debitTx.currency} ${amount} to ${result.creditTx.currency} ${result.convertedAmount.toLocaleString()} at rate ${result.rate.toFixed(4)}.`,
        type: "transaction",
        channel: "push",
      },
    });

    return NextResponse.json({
      success: true,
      rate: result.rate,
      convertedAmount: result.convertedAmount,
      fee: result.fee,
      debitTx: result.debitTx,
      creditTx: result.creditTx,
    });
  } catch (e) {
    if (e instanceof HttpError) return apiError(e.message, e.status);
    return apiCatch(e);
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
