import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import {
  CARRIERS,
  getCarrier,
  detectNetwork,
  normalizePhone,
  isValidPhone,
} from "@/lib/carriers";

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
  return (
    "GXP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

interface AirtimeReceipt {
  transactionId: string;
  reference: string;
  type: "airtime";
  amount: number;
  currency: string;
  fee: number;
  network: string;
  networkName: string;
  networkColor: string;
  phoneNumber: string;
  detectedNetwork: string | null;
  networkMatched: boolean;
  date: Date | null;
  newBalance: number;
}

/**
 * POST /api/airtime
 *
 * Process a real airtime top-up:
 *   - Validates phone number format and network support.
 *   - Validates amount > 0 and the user has sufficient balance.
 *   - Debits the wallet, writes a Transaction (type "airtime",
 *     status "completed"), writes an AuditLog, sends a Notification.
 *   - Returns a full receipt (reference, amount, network, phone, date,
 *     new balance).
 *
 * Body: { phoneNumber: string, network: string, amount: number, currency?: string }
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
        { error: "Too many airtime requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))),
          },
        },
      );
    }

    // ---------- Parse body ----------
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      phoneNumber?: string;
      network?: string;
      amount?: number;
      currency?: string;
    };

    const phoneNumber = (b.phoneNumber || "").trim();
    const networkId = (b.network || "").trim().toLowerCase();
    const amount = Number(b.amount);
    const currency = (b.currency || "NGN").toUpperCase().trim();

    // ---------- Validate ----------
    if (!phoneNumber) return apiError("Phone number is required", 400);
    if (!isValidPhone(phoneNumber)) {
      return apiError("Invalid phone number format", 400);
    }
    const carrier = getCarrier(networkId);
    if (!carrier) {
      return apiError(
        `Unsupported network. Supported: ${CARRIERS.map((c) => c.name).join(", ")}`,
        400,
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("Amount must be greater than zero", 400);
    }
    if (amount > 1e9) return apiError("Amount too large", 400);
    if (currency.length !== 3) return apiError("Invalid currency", 400);

    // Cross-check the auto-detected network against the user's selection.
    // We do NOT hard-reject mismatches (some users intentionally top up
    // a number ported to another network), but we surface the detected
    // network in the response so the client can show a soft warning.
    const detected = detectNetwork(phoneNumber);

    const txRef = ref();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const normalizedPhone = normalizePhone(phoneNumber);

    // ---------- Atomic purchase ----------
    const result = await db.$transaction(async (tx) => {
      let wallet = await tx.wallet.findFirst({
        where: { userId, currency, isDefault: true },
      });
      if (!wallet) {
        wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      }
      if (!wallet) {
        throw new HttpError(404, "Wallet not found for this currency");
      }

      if (wallet.balance < amount) {
        throw new HttpError(
          400,
          `Insufficient balance (available: ${wallet.balance}, required: ${amount})`,
        );
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
          type: "airtime",
          direction: "debit",
          status: "completed",
          amount,
          fee: 0,
          currency,
          description: `Airtime top-up ${carrier.name} ${normalizedPhone}`,
          category: "general",
          counterpartyName: `${carrier.name} — ${normalizedPhone}`,
          counterpartyAccount: normalizedPhone,
          counterpartyBank: carrier.name,
          method: "airtime",
          provider: carrier.id,
          walletId: wallet.id,
          riskScore: 0.1,
          fraudFlag: false,
          metadata: JSON.stringify({
            kind: "airtime",
            network: carrier.id,
            networkName: carrier.name,
            phoneNumber: normalizedPhone,
            amount,
            currency,
            detectedNetwork: detected || null,
            networkMatched: !detected || detected === carrier.id,
            walletBalanceAfter: updatedWallet.balance,
          }),
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "airtime.purchase",
          entity: "transaction",
          entityId: txRecord.id,
          ip,
          userAgent,
          details: JSON.stringify({
            reference: txRef,
            amount,
            currency,
            network: carrier.id,
            phone: normalizedPhone,
            walletBalanceAfter: updatedWallet.balance,
          }),
          severity: "info",
        },
      });

      return { txRecord, walletBalanceAfter: updatedWallet.balance };
    });

    // ---------- Notification ----------
    await db.notification.create({
      data: {
        userId,
        title: "Airtime purchase successful",
        message: `You topped up ${currency} ${amount.toLocaleString("en-US")} of ${carrier.name} airtime for ${normalizedPhone}.`,
        type: "transaction",
        channel: "push",
      },
    });

    // ---------- Response (full receipt) ----------
    const receipt: AirtimeReceipt = {
      transactionId: result.txRecord.id,
      reference: result.txRecord.reference,
      type: "airtime",
      amount,
      currency,
      fee: 0,
      network: carrier.id,
      networkName: carrier.name,
      networkColor: carrier.color,
      phoneNumber: normalizedPhone,
      detectedNetwork: detected || null,
      networkMatched: !detected || detected === carrier.id,
      date: result.txRecord.completedAt,
      newBalance: result.walletBalanceAfter,
    };

    return NextResponse.json({
      success: true,
      transaction: result.txRecord,
      receipt,
    });
  } catch (e) {
    if (e instanceof HttpError) return apiError(e.message, e.status);
    return apiCatch(e);
  }
}

/**
 * GET /api/airtime
 *
 * Returns the user's airtime purchase history (last 10) plus the list
 * of supported carriers so the client can render the picker without an
 * extra round-trip.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const transactions = await db.transaction.findMany({
      where: { userId, type: "airtime" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      transactions,
      carriers: CARRIERS,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
