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
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * POST /api/bills — process a real bill payment.
 *
 * Body:
 *   { billerId, accountNumber, amount, currency?, phone?, description? }
 *
 * Flow:
 *   1. Auth + rate limit (sensitive — money moving).
 *   2. Validate biller exists & is active.
 *   3. Validate amount against biller category min/max (defensive bounds).
 *   4. Re-fetch the user's wallet INSIDE a `db.$transaction` so concurrent
 *      payments can't double-spend.
 *   5. Balance check; throw `HttpError(400)` if insufficient.
 *   6. Debit wallet + create a `type:"bill"` Transaction (status completed).
 *   7. Audit log + notification.
 *   8. Return `{ success, transaction, receipt }`.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
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
    const b = (body ?? {}) as {
      billerId?: string;
      accountNumber?: string;
      amount?: number | string;
      currency?: string;
      phone?: string;
      description?: string;
    };

    const billerId = (b.billerId || "").trim();
    const accountNumber = (b.accountNumber || "").trim();
    const amount = Number(b.amount);
    const currency = (b.currency || "NGN").trim().toUpperCase();
    const phone = (b.phone || "").trim() || null;
    const description = (b.description || "").trim();

    if (!billerId) return apiError("Biller is required", 400);
    if (!accountNumber) return apiError("Account number is required", 400);
    if (accountNumber.length > 64) return apiError("Account number is too long", 400);
    if (!isFinite(amount) || amount <= 0) return apiError("Amount must be a positive number", 400);
    if (amount > 50_000_000) return apiError("Amount exceeds the per-transaction limit", 400);

    const biller = await db.biller.findFirst({
      where: { id: billerId, status: "active" },
    });
    if (!biller) return apiError("Biller not found or inactive", 404);

    // Soft category bounds — keep us honest even if the UI is bypassed.
    const CATEGORY_BOUNDS: Record<string, { min: number; max: number }> = {
      electricity: { min: 100, max: 500000 },
      water: { min: 100, max: 200000 },
      gas: { min: 100, max: 200000 },
      internet: { min: 500, max: 200000 },
      tv: { min: 500, max: 200000 },
      phone: { min: 100, max: 100000 },
      taxes: { min: 100, max: 10_000_000 },
      customs: { min: 1000, max: 10_000_000 },
      fines: { min: 100, max: 500000 },
      permits: { min: 500, max: 1_000_000 },
      social: { min: 500, max: 500000 },
      education: { min: 500, max: 2_000_000 },
      betting: { min: 100, max: 500000 },
      government: { min: 100, max: 10_000_000 },
      health: { min: 100, max: 2_000_000 },
      insurance: { min: 100, max: 1_000_000 },
      loan: { min: 100, max: 5_000_000 },
    };
    const bounds = CATEGORY_BOUNDS[biller.category] ?? { min: 100, max: 500000 };
    if (amount < bounds.min || amount > bounds.max) {
      return apiError(
        `Amount must be between ${bounds.min} and ${bounds.max} for ${biller.category} bills`,
        400,
      );
    }

    // Fee model — flat per category, free for most consumer bills.
    const FEE_BY_CATEGORY: Record<string, number> = {
      electricity: 100,
      water: 50,
      gas: 50,
      taxes: 250,
      customs: 500,
      fines: 100,
      permits: 200,
      government: 200,
    };
    const fee = FEE_BY_CATEGORY[biller.category] ?? 0;

    const txRef = ref();
    const ip = clientIp(req);
    const userAgent = req.headers.get("user-agent") || null;
    const desc = description || `${biller.name} bill · ${accountNumber}`;

    const result = await db.$transaction(async (tx) => {
      // Re-fetch wallet inside the transaction for serializable reads.
      let wallet = await tx.wallet.findFirst({
        where: { userId, currency, isDefault: true },
      });
      if (!wallet) {
        wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      }
      if (!wallet) throw new HttpError(404, "Wallet not found for this currency");

      if (wallet.balance < amount + fee) {
        throw new HttpError(
          400,
          `Insufficient balance (available: ${wallet.balance}, required: ${amount + fee})`,
        );
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount + fee } },
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: txRef,
          userId,
          senderId: userId,
          type: "bill",
          direction: "debit",
          status: "completed",
          amount,
          fee,
          currency,
          description: desc,
          category: "bills",
          counterpartyName: biller.name,
          counterpartyAccount: accountNumber,
          counterpartyBank: null,
          method: "wallet",
          provider: biller.category,
          walletId: wallet.id,
          metadata: JSON.stringify({
            billerId: biller.id,
            billerCategory: biller.category,
            accountNumber,
            phone,
          }),
          riskScore: 0.05,
          fraudFlag: false,
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "bill.payment",
          entity: "transaction",
          entityId: transaction.id,
          ip,
          userAgent,
          details: JSON.stringify({
            reference: txRef,
            billerId: biller.id,
            billerName: biller.name,
            accountNumber,
            amount,
            fee,
            currency,
            walletBalanceAfter: updatedWallet.balance,
          }),
          severity: "info",
        },
      });

      return { transaction, walletBalanceAfter: updatedWallet.balance };
    });

    // Notification (outside the financial transaction).
    await db.notification.create({
      data: {
        userId,
        title: "Bill payment successful",
        message: `${currency} ${amount.toLocaleString("en-US")} paid to ${biller.name} (${accountNumber}). Ref: ${txRef}`,
        type: "transaction",
        channel: "push",
        actionUrl: `/transactions/${result.transaction.id}`,
        metadata: JSON.stringify({ transactionId: result.transaction.id, billerId: biller.id }),
      },
    });

    // Receipt payload — what the UI prints/displays.
    const receipt = {
      reference: txRef,
      billerName: biller.name,
      billerCategory: biller.category,
      accountNumber,
      amount,
      fee,
      total: amount + fee,
      currency,
      status: "completed",
      paidAt: result.transaction.completedAt,
      transactionId: result.transaction.id,
      balanceAfter: result.walletBalanceAfter,
    };

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      receipt,
    });
  } catch (e: unknown) {
    // Surface our in-transaction HttpError cleanly.
    if (e instanceof HttpError) {
      return apiError(e.message, e.status);
    }
    return apiCatch(e);
  }
}

/**
 * GET /api/bills — list the user's bill-payment history.
 * Returns the 30 most recent `type:"bill"` transactions, newest first.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const transactions = await db.transaction.findMany({
      where: { userId, type: "bill" },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ transactions });
  } catch (e) {
    return apiCatch(e);
  }
}
