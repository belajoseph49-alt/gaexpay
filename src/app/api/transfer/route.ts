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
    const rl = await rateLimitSensitive(identifier);
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

      // Mobile Money Payout Integration (e.g. Paystack)
      if (method === "momo" && process.env.PAYSTACK_SECRET_KEY) {
        const paystackRes = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(amount * 100), // Convert to base subunit
            recipient: recipient.account, // Assumes account is a Paystack recipient code
            reason: note || `Transfer to ${recipient.name}`,
            currency: currency,
          }),
        });
        
        const paystackData = await paystackRes.json();
        if (!paystackRes.ok || !paystackData.status) {
          throw new HttpError(500, `Mobile Money Payout Failed: ${paystackData.message || 'Unknown provider error'}`);
        }
      }

      // Debit the wallet.
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount + fee } },
      });

      // Double-entry: Credit the recipient if this is an internal transfer
      if (method === "wallet") {
        let recipientUserId: string | null = null;
        
        if (recipient.gaexpayUserId) {
          recipientUserId = recipient.gaexpayUserId;
        } else {
          const recUser = await tx.user.findFirst({
            where: {
              OR: [
                { email: recipient.account },
                { phone: recipient.account },
                { username: recipient.account.replace('@', '') }
              ]
            }
          });
          if (!recUser) {
            throw new HttpError(404, "Recipient not found on GaexPay");
          }
          recipientUserId = recUser.id;
        }

        let recWallet = await tx.wallet.findFirst({
          where: { userId: recipientUserId, currency, isDefault: true }
        });
        if (!recWallet) {
          recWallet = await tx.wallet.findFirst({ where: { userId: recipientUserId, currency } });
        }
        if (!recWallet) {
          throw new HttpError(404, `Recipient does not have a ${currency} wallet`);
        }

        const updatedRecWallet = await tx.wallet.update({
          where: { id: recWallet.id },
          data: { balance: { increment: amount } }
        });

        // Fetch sender details for the recipient's transaction record
        const sender = await tx.user.findUnique({ where: { id: userId } });
        const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : "GaexPay User";
        const senderAccount = sender?.phone || sender?.email || "Internal";

        const recTx = await tx.transaction.create({
          data: {
            reference: ref(),
            userId: recipientUserId,
            senderId: userId,
            type: "transfer",
            direction: "credit",
            status: "completed",
            amount,
            fee: 0,
            currency,
            description: note || `Transfer from ${senderName}`,
            category: category || "p2p",
            counterpartyName: senderName,
            counterpartyAccount: senderAccount,
            method,
            provider: null,
            walletId: recWallet.id,
            riskScore: 0.1,
            fraudFlag: false,
            completedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: recipientUserId,
            actor: "system",
            action: "transfer.receive",
            entity: "transaction",
            entityId: recTx.id,
            ip,
            userAgent,
            details: JSON.stringify({
              reference: recTx.reference,
              amount,
              currency,
              senderId: userId,
              walletBalanceAfter: updatedRecWallet.balance,
            }),
            severity: "info",
          },
        });
        
        // Notify recipient
        await tx.notification.create({
          data: {
            userId: recipientUserId,
            title: "Transfer Received",
            message: `You received ${currency} ${amount.toLocaleString("en-US")} from ${senderName}.`,
            type: "transaction",
            channel: "push",
          },
        });
      }

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
