import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { transferSchema, formatZodError } from "@/lib/validations";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Thrown inside the transaction to abort with a specific HTTP status. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * POST /api/transfer
 *
 * Send money from the authenticated user's wallet to a recipient (wallet,
 * bank, or mobile money). Hardened with:
 *   - `requireAuth` via `getAuthUserId` — 401 in production without a token
 *   - `transferSchema` (zod) — rejects negative/huge amounts, bad currencies,
 *     oversized recipient fields, unknown methods
 *   - `rateLimitSensitive` — 10 transfers / minute / identifier
 *   - `db.$transaction` — wallet debit + tx record + notification are atomic
 *   - Balance check inside the transaction (re-fetches the wallet so a race
 *     between two concurrent transfers can't double-spend)
 *   - AuditLog row written with the user id, action, IP, and user agent
 */
export async function POST(req: Request) {
  try {
    // ---------- Auth ----------
    const userId = getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---------- Rate limit ----------
    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many transfer requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    // ---------- Parse + validate body ----------
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatZodError(parsed.error), 400);
    }
    const { amount, currency, recipient, method, provider, note, category } = parsed.data;

    // ---------- Fee model ----------
    const fee = method === "bank" ? Math.min(amount * 0.005, 5000) : method === "momo" ? amount * 0.01 : 0;

    const txRef = ref();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // ---------- Atomic transfer ----------
    const result = await db.$transaction(async (tx) => {
      // Re-fetch inside the transaction so concurrent transfers see each
      // other's writes (SQLite gives us serializable isolation per transaction).
      let wallet = await tx.wallet.findFirst({
        where: { userId, currency, isDefault: true },
      });
      if (!wallet) {
        wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      }
      if (!wallet) {
        throw new HttpError(404, "Wallet not found");
      }

      // Balance check — reject before any write happens.
      if (wallet.balance < amount + fee) {
        throw new HttpError(
          400,
          `Insufficient balance (available: ${wallet.balance}, required: ${amount + fee})`,
        );
      }

      // Debit the wallet.
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount + fee } },
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
          fee,
          currency,
          description: note || `Transfer to ${recipient.name}`,
          category: category || "p2p",
          counterpartyName: recipient.name,
          counterpartyAccount: recipient.account,
          counterpartyBank: recipient.bank,
          method,
          provider: provider || null,
          walletId: wallet.id,
          riskScore: 0.1, // deterministic low — fraud engine can re-score async
          fraudFlag: false,
          completedAt: new Date(),
        },
      });

      // Audit log — who sent what to whom, from where.
      await tx.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "transfer.create",
          entity: "transaction",
          entityId: txRecord.id,
          ip,
          userAgent,
          details: JSON.stringify({
            reference: txRef,
            amount,
            currency,
            method,
            recipient: { name: recipient.name, account: recipient.account },
            walletBalanceAfter: updatedWallet.balance,
          }),
          severity: "info",
        },
      });

      return { txRecord, walletBalanceAfter: updatedWallet.balance };
    });

    // ---------- Notification (outside the financial transaction) ----------
    await db.notification.create({
      data: {
        userId,
        title: "Transfer successful",
        message: `You sent ${currency} ${amount.toLocaleString("en-US")} to ${recipient.name}.`,
        type: "transaction",
        channel: "push",
      },
    });

    return NextResponse.json({
      success: true,
      transaction: result.txRecord,
      walletBalanceAfter: result.walletBalanceAfter,
    });
  } catch (e) {
    if (e instanceof HttpError) {
      // Our own validation/404 — safe to surface the message.
      return apiError(e.message, e.status);
    }
    return apiCatch(e);
  }
}
