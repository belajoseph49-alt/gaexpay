import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import {
  CARRIERS,
  DATA_BUNDLES,
  bundlesByNetwork,
  customBundlePrice,
  getBundle,
  getCarrier,
  detectNetwork,
  normalizePhone,
  isValidPhone,
  formatDataSize,
  type DataBundle,
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

interface DataReceipt {
  transactionId: string;
  reference: string;
  type: "data";
  amount: number;
  currency: string;
  fee: number;
  network: string;
  networkName: string;
  networkColor: string;
  phoneNumber: string;
  detectedNetwork: string | null;
  networkMatched: boolean;
  bundleId: string | null;
  bundleName: string;
  dataSizeMB: number;
  dataSizeLabel: string;
  validity: string;
  expiry: Date;
  date: Date | null;
  newBalance: number;
}

/**
 * POST /api/data
 *
 * Process a real mobile-data bundle purchase:
 *   - Validates phone, network, and either bundleId (catalog plan) or
 *     customMB (custom plan priced at ₦0.45 / MB, floor ₦50).
 *   - Debits the wallet, writes a Transaction (type "data",
 *     status "completed"), writes an AuditLog, sends a Notification.
 *   - Returns a full receipt including bundle name, data size, expiry.
 *
 * Body:
 *   { phoneNumber: string, network: string, bundleId?: string,
 *     customMB?: number, amount?: number, currency?: string }
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
        { error: "Too many data requests. Please slow down." },
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
      bundleId?: string;
      customMB?: number;
      amount?: number;
      currency?: string;
    };

    const phoneNumber = (b.phoneNumber || "").trim();
    const networkId = (b.network || "").trim().toLowerCase();
    const bundleId = (b.bundleId || "").trim();
    const customMB = Number(b.customMB || 0);
    const currency = (b.currency || "NGN").toUpperCase().trim();

    // ---------- Validate phone + network ----------
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
    if (currency.length !== 3) return apiError("Invalid currency", 400);

    // ---------- Resolve the bundle (catalog OR custom) ----------
    let bundle: DataBundle | null = null;
    let amount: number;

    if (bundleId) {
      const found = getBundle(bundleId);
      if (!found) return apiError("Unknown bundle id", 400);
      if (found.network !== carrier.id) {
        return apiError(
          `Bundle ${bundleId} does not belong to ${carrier.name}`,
          400,
        );
      }
      bundle = found;
      amount = found.price;
    } else if (customMB && customMB > 0) {
      if (customMB > 1_000_000) return apiError("Custom size too large", 400);
      amount = customBundlePrice(customMB);
    } else {
      return apiError("Provide either bundleId or customMB", 400);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return apiError("Computed amount must be greater than zero", 400);
    }
    if (amount > 1e9) return apiError("Amount too large", 400);

    const detected = detectNetwork(phoneNumber);
    const normalizedPhone = normalizePhone(phoneNumber);

    // Bundle display fields
    const bundleName = bundle ? bundle.name : `Custom ${formatDataSize(customMB)}`;
    const dataSizeMB = bundle ? bundle.sizeMB : customMB;
    const dataSizeLabel = formatDataSize(dataSizeMB);
    const validity = bundle ? bundle.validityLabel : "30 days";
    const expiry = new Date();
    if (bundle?.validity === "daily") expiry.setDate(expiry.getDate() + 1);
    else if (bundle?.validity === "weekly") expiry.setDate(expiry.getDate() + 7);
    else expiry.setDate(expiry.getDate() + 30);

    const txRef = ref();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

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
          type: "data",
          direction: "debit",
          status: "completed",
          amount,
          fee: 0,
          currency,
          description: `Data bundle ${bundleName} — ${carrier.name} ${normalizedPhone}`,
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
            kind: "data",
            network: carrier.id,
            networkName: carrier.name,
            phoneNumber: normalizedPhone,
            bundleId: bundle ? bundle.id : null,
            bundleName,
            dataSizeMB,
            dataSizeLabel,
            validity,
            expiry: expiry.toISOString(),
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
          action: "data.purchase",
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
            bundleId: bundle ? bundle.id : null,
            dataSizeMB,
            validity,
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
        title: "Data purchase successful",
        message: `You bought ${bundleName} (${dataSizeLabel}, ${validity}) for ${normalizedPhone} on ${carrier.name}.`,
        type: "transaction",
        channel: "push",
      },
    });

    // ---------- Response ----------
    const receipt: DataReceipt = {
      transactionId: result.txRecord.id,
      reference: result.txRecord.reference,
      type: "data",
      amount,
      currency,
      fee: 0,
      network: carrier.id,
      networkName: carrier.name,
      networkColor: carrier.color,
      phoneNumber: normalizedPhone,
      detectedNetwork: detected || null,
      networkMatched: !detected || detected === carrier.id,
      bundleId: bundle ? bundle.id : null,
      bundleName,
      dataSizeMB,
      dataSizeLabel,
      validity,
      expiry,
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
 * GET /api/data
 *
 * Returns the user's data purchase history (last 10), plus the full
 * bundle catalog grouped by network, plus the carrier list — so the
 * client can render the entire Data tab in one round-trip.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const transactions = await db.transaction.findMany({
      where: { userId, type: "data" },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      transactions,
      carriers: CARRIERS,
      bundles: bundlesByNetwork(),
      bundleList: DATA_BUNDLES,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
