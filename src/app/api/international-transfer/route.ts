import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COUNTRIES, CURRENCY_SYMBOL } from "@/lib/gaexpay";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + "INT" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Fallback exchange rates vs USD (1 USD = X currency)
// Source: approximate mid-market rates used across the app
const USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1540, GHS: 12.5, KES: 129, UGX: 3780,
  XOF: 605, XAF: 605, ZAR: 18.6, ETB: 56, RWF: 1285, TZS: 2535, EGP: 48.5,
  MAD: 9.95, DZD: 134, TND: 3.1, BIF: 2950, CDF: 2500, AOA: 920, MZN: 63.8,
  ZMW: 25.4, BWP: 13.6, CNY: 7.24, JPY: 156.3, CAD: 1.36, AUD: 1.52, CHF: 0.88,
  AED: 3.67, SAR: 3.75, INR: 83.4, BRL: 5.4,
};

// Interbank-style rate via USD intermediary with a small FX margin.
const FX_MARGIN_PCT = 0.008; // 0.8% margin added to mid-market rate

function computeRate(from: string, to: string): { mid: number; rate: number; marginPct: number } {
  if (from === to) return { mid: 1, rate: 1, marginPct: 0 };
  const fromUsd = USD_RATES[from] ?? 1;
  const toUsd = USD_RATES[to] ?? 1;
  // X units of `from` = 1 USD = toUsd units of `to`
  const mid = (1 / fromUsd) * toUsd;
  const rate = mid * (1 - FX_MARGIN_PCT); // customer gets slightly less
  return { mid, rate, marginPct: FX_MARGIN_PCT * 100 };
}

function deliveryEstimate(method: string): { label: string; minHours: number; maxHours: number; instant: boolean } {
  switch (method) {
    case "momo":
      return { label: "Instant · within minutes", minHours: 0, maxHours: 1, instant: true };
    case "wallet":
      return { label: "Instant · within minutes", minHours: 0, maxHours: 0, instant: true };
    case "bank":
    default:
      return { label: "1–3 business days", minHours: 24, maxHours: 72, instant: false };
  }
}

function transferFee(method: string, amountUsd: number): { feeUsd: number; feePct: number; flatUsd: number; note: string } {
  switch (method) {
    case "momo":
      // 1% + $0.50, capped at $20
      return { feeUsd: Math.min(amountUsd * 0.01 + 0.5, 20), feePct: 1, flatUsd: 0.5, note: "Mobile money · 1% + $0.50 (max $20)" };
    case "wallet":
      // 0.5% + $0.25
      return { feeUsd: amountUsd * 0.005 + 0.25, feePct: 0.5, flatUsd: 0.25, note: "GaexPay Wallet · 0.5% + $0.25" };
    case "bank":
    default:
      // 1.5% + $5, capped at $50
      return { feeUsd: Math.min(amountUsd * 0.015 + 5, 50), feePct: 1.5, flatUsd: 5, note: "Bank wire · 1.5% + $5 (max $50)" };
  }
}

export async function POST(req: Request) {
  try {
    // ---------- Auth ----------
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // ---------- Rate limit (money-moving) ----------
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
      recipientName?: string; recipientAccount?: string; recipientBank?: string;
      recipientCountry?: string; senderCountry?: string; amount?: number | string;
      fromCurrency?: string; toCurrency?: string; method?: string; provider?: string;
      note?: string; purpose?: string;
    };
    const {
      recipientName,
      recipientAccount,
      recipientBank,
      recipientCountry,
      senderCountry = "NG",
      amount,
      fromCurrency,
      toCurrency,
      method = "bank",
      provider,
      note,
      purpose = "other",
    } = b;

    // Validate required fields
    if (!recipientName || !recipientAccount || !recipientCountry || !amount || !fromCurrency || !toCurrency) {
      return apiError(
        "Missing required fields: recipientName, recipientAccount, recipientCountry, amount, fromCurrency, toCurrency",
        400,
      );
    }

    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) {
      return apiError("Amount must be a positive number", 400);
    }

    if (!["bank", "momo", "wallet"].includes(method)) {
      return apiError("Method must be one of: bank, momo, wallet", 400);
    }

    const senderCountryObj = COUNTRIES.find((c) => c.code === senderCountry);
    const recipientCountryObj = COUNTRIES.find((c) => c.code === recipientCountry);
    if (!recipientCountryObj) {
      return apiError(`Unsupported recipient country: ${recipientCountry}`, 400);
    }

    // Compute FX
    const { mid, rate, marginPct } = computeRate(fromCurrency, toCurrency);
    const convertedAmount = amt * rate;

    // Compute fee in `fromCurrency` (we derive USD value first)
    const fromUsd = USD_RATES[fromCurrency] ?? 1;
    const amountUsd = amt / fromUsd;
    const feeInfo = transferFee(method, amountUsd);
    const feeInFromCurrency = feeInfo.feeUsd * fromUsd;
    const totalInFromCurrency = amt + feeInFromCurrency;

    const delivery = deliveryEstimate(method);
    const reference = ref();

    // Build counterparty label
    const counterpartyName = recipientName;
    const counterpartyAccount = String(recipientAccount);
    const counterpartyBank =
      method === "bank"
        ? recipientBank || "International Bank"
        : method === "momo"
          ? provider || "Mobile Money"
          : "GaexPay Wallet";

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Persist a Transaction record (type: transfer, category: p2p)
    const tx = await db.transaction.create({
      data: {
        reference,
        userId,
        senderId: userId,
        type: "transfer",
        direction: "debit",
        status: delivery.instant ? "completed" : "pending",
        amount: amt,
        fee: feeInFromCurrency,
        currency: fromCurrency,
        description: note || `International transfer to ${recipientName} (${recipientCountryObj.name})`,
        category: "p2p",
        counterpartyName,
        counterpartyAccount,
        counterpartyBank,
        method,
        provider: provider || (method === "bank" ? counterpartyBank : null),
        riskScore: Math.random() < 0.04 ? 0.7 : 0.08,
        fraudFlag: false,
        completedAt: delivery.instant ? new Date() : null,
        metadata: JSON.stringify({
          international: true,
          purpose,
          senderCountry: senderCountryObj?.code || senderCountry,
          senderCountryName: senderCountryObj?.name || senderCountry,
          recipientCountry: recipientCountryObj.code,
          recipientCountryName: recipientCountryObj.name,
          recipientFlag: recipientCountryObj.flag,
          fromCurrency,
          toCurrency,
          midRate: mid,
          appliedRate: rate,
          marginPct,
          convertedAmount,
          feeUsd: feeInfo.feeUsd,
          feePct: feeInfo.feePct,
          feeFlatUsd: feeInfo.flatUsd,
          feeNote: feeInfo.note,
          totalInFromCurrency,
          deliveryLabel: delivery.label,
          deliveryInstant: delivery.instant,
          deliveryMinHours: delivery.minHours,
          deliveryMaxHours: delivery.maxHours,
          recipientBank,
          note: note || "",
        }),
      },
    });

    // Create a notification
    await db.notification.create({
      data: {
        userId,
        title: delivery.instant ? "International transfer sent" : "International transfer initiated",
        message: `${CURRENCY_SYMBOL[fromCurrency] ?? ""}${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fromCurrency} → ${CURRENCY_SYMBOL[toCurrency] ?? ""}${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCurrency} to ${recipientName} (${recipientCountryObj.name}). ${delivery.instant ? "Delivered instantly." : `Estimated delivery: ${delivery.label}.`}`,
        type: "transaction",
        channel: "push",
        actionUrl: `/transactions?ref=${reference}`,
        metadata: JSON.stringify({ reference, method, recipientCountry: recipientCountryObj.code }),
      },
    });

    // Audit log entry (best-effort)
    try {
      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "international_transfer",
          entity: "Transaction",
          entityId: tx.id,
          ip,
          userAgent,
          severity: "info",
          details: JSON.stringify({
            reference,
            fromCurrency,
            toCurrency,
            amount: amt,
            convertedAmount,
            method,
            recipientCountry: recipientCountryObj.code,
          }),
        },
      });
    } catch {
      // audit log writes are best-effort
    }

    return NextResponse.json({
      success: true,
      reference,
      transaction: tx,
      transfer: {
        reference,
        recipientName,
        recipientAccount,
        recipientBank: counterpartyBank,
        recipientCountry: {
          code: recipientCountryObj.code,
          name: recipientCountryObj.name,
          flag: recipientCountryObj.flag,
          currency: recipientCountryObj.currency,
          phonePrefix: recipientCountryObj.phonePrefix,
        },
        senderCountry: senderCountryObj
          ? { code: senderCountryObj.code, name: senderCountryObj.name, flag: senderCountryObj.flag, currency: senderCountryObj.currency }
          : { code: senderCountry, name: senderCountry, flag: "🏳️", currency: fromCurrency },
        amount: amt,
        fromCurrency,
        toCurrency,
        midRate: mid,
        exchangeRate: rate,
        marginPct,
        convertedAmount,
        fee: {
          amount: feeInFromCurrency,
          amountUsd: feeInfo.feeUsd,
          pct: feeInfo.feePct,
          flatUsd: feeInfo.flatUsd,
          note: feeInfo.note,
        },
        total: totalInFromCurrency,
        totalUsd: amountUsd + feeInfo.feeUsd,
        method,
        provider: provider || null,
        purpose,
        note: note || "",
        delivery: {
          label: delivery.label,
          instant: delivery.instant,
          minHours: delivery.minHours,
          maxHours: delivery.maxHours,
        },
        status: tx.status,
        createdAt: tx.createdAt,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

// GET — lightweight quote helper (no DB writes) used for live previews.
// Still requires auth so anonymous attackers can't probe live FX rates.
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const from = (searchParams.get("from") || "USD").toUpperCase();
    const to = (searchParams.get("to") || "NGN").toUpperCase();
    const amount = Number(searchParams.get("amount") || 100);
    const method = (searchParams.get("method") || "bank") as "bank" | "momo" | "wallet";

    const { mid, rate, marginPct } = computeRate(from, to);
    const fromUsd = USD_RATES[from] ?? 1;
    const amountUsd = amount / fromUsd;
    const feeInfo = transferFee(method, amountUsd);
    const feeInFromCurrency = feeInfo.feeUsd * fromUsd;
    const converted = amount * rate;
    const delivery = deliveryEstimate(method);

    return NextResponse.json({
      from,
      to,
      amount,
      midRate: mid,
      exchangeRate: rate,
      marginPct,
      convertedAmount: converted,
      fee: {
        amount: feeInFromCurrency,
        amountUsd: feeInfo.feeUsd,
        pct: feeInfo.feePct,
        flatUsd: feeInfo.flatUsd,
        note: feeInfo.note,
      },
      total: amount + feeInFromCurrency,
      totalUsd: amountUsd + feeInfo.feeUsd,
      delivery,
      method,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return apiCatch(e);
  }
}
