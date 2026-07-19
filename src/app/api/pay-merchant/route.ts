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

/**
 * POST /api/pay-merchant — generic payment endpoint used by the QR pay, bills,
 * airtime, and merchant-checkout flows. Money-moving: debits the user's wallet
 * (in the form of a Transaction record) and audits the action.
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
    const b = (body ?? {}) as {
      amount?: number | string; currency?: string; description?: string;
      type?: string; category?: string; counterpartyName?: string;
      method?: string; provider?: string; title?: string; message?: string;
    };
    const amount = Number(b.amount);
    if (!isFinite(amount) || amount <= 0) return apiError("Amount must be a positive number", 400);

    const { currency = "NGN", description, type, category, counterpartyName, method, provider } = b;
    const fee = method === "momo" ? amount * 0.01 : 0;

    const tx = await db.transaction.create({
      data: {
        reference: ref(),
        userId,
        senderId: userId,
        type: type || "payment",
        direction: "debit",
        status: "completed",
        amount,
        fee,
        currency,
        description: description || `${type || "payment"} payment`,
        category: category || "general",
        counterpartyName,
        method: method || "wallet",
        provider: provider || null,
        completedAt: new Date(),
      },
    });

    await db.notification.create({
      data: {
        userId,
        title: b.title || "Payment successful",
        message: b.message || `${currency} ${amount.toLocaleString()} paid to ${counterpartyName || "merchant"}.`,
        type: "transaction",
        channel: "push",
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "merchant_pay",
        entity: "transaction",
        entityId: tx.id,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          reference: tx.reference,
          amount,
          currency,
          type: tx.type,
          method: tx.method,
          counterparty: counterpartyName || null,
        }),
        severity: "info",
      },
    });

    return NextResponse.json({ success: true, transaction: tx });
  } catch (e) {
    return apiCatch(e);
  }
}
