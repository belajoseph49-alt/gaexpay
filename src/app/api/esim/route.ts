import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

interface ESimPlan {
  id: string;
  label: string;
  dataAmount: string;
  durationDays: number;
  price: number;
  coverage: string;
}

const ESIM_PLANS: Record<string, { countryName: string; flag: string; plans: ESimPlan[] }> = {
  FR: {
    countryName: "France",
    flag: "🇫🇷",
    plans: [
      { id: "fr_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 5, coverage: "France · 4G/5G" },
      { id: "fr_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 18, coverage: "France · 4G/5G" },
      { id: "fr_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 32, coverage: "France · 4G/5G" },
      { id: "fr_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 55, coverage: "France · 5G" },
    ],
  },
  DE: {
    countryName: "Germany",
    flag: "🇩🇪",
    plans: [
      { id: "de_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 5, coverage: "Germany · 4G/5G" },
      { id: "de_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 17, coverage: "Germany · 4G/5G" },
      { id: "de_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 30, coverage: "Germany · 4G/5G" },
      { id: "de_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 52, coverage: "Germany · 5G" },
    ],
  },
  GB: {
    countryName: "United Kingdom",
    flag: "🇬🇧",
    plans: [
      { id: "gb_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 4, coverage: "UK · 4G/5G" },
      { id: "gb_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 15, coverage: "UK · 4G/5G" },
      { id: "gb_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 28, coverage: "UK · 4G/5G" },
      { id: "gb_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 48, coverage: "UK · 5G" },
    ],
  },
  JP: {
    countryName: "Japan",
    flag: "🇯🇵",
    plans: [
      { id: "jp_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 6, coverage: "Japan · 4G/5G" },
      { id: "jp_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 21, coverage: "Japan · 4G/5G" },
      { id: "jp_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 38, coverage: "Japan · 4G/5G" },
      { id: "jp_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 60, coverage: "Japan · 5G" },
    ],
  },
  US: {
    countryName: "United States",
    flag: "🇺🇸",
    plans: [
      { id: "us_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 5, coverage: "USA · 4G/5G" },
      { id: "us_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 19, coverage: "USA · 4G/5G" },
      { id: "us_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 34, coverage: "USA · 4G/5G" },
      { id: "us_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 58, coverage: "USA · 5G" },
    ],
  },
  TH: {
    countryName: "Thailand",
    flag: "🇹🇭",
    plans: [
      { id: "th_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 4, coverage: "Thailand · 4G" },
      { id: "th_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 13, coverage: "Thailand · 4G" },
      { id: "th_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 24, coverage: "Thailand · 4G" },
      { id: "th_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 42, coverage: "Thailand · 4G" },
    ],
  },
  AE: {
    countryName: "UAE",
    flag: "🇦🇪",
    plans: [
      { id: "ae_1gb_7d", label: "1 GB · 7 Days", dataAmount: "1GB", durationDays: 7, price: 6, coverage: "UAE · 4G/5G" },
      { id: "ae_5gb_30d", label: "5 GB · 30 Days", dataAmount: "5GB", durationDays: 30, price: 20, coverage: "UAE · 4G/5G" },
      { id: "ae_10gb_30d", label: "10 GB · 30 Days", dataAmount: "10GB", durationDays: 30, price: 36, coverage: "UAE · 4G/5G" },
      { id: "ae_unlim_30d", label: "Unlimited · 30 Days", dataAmount: "Unlimited", durationDays: 30, price: 56, coverage: "UAE · 5G" },
    ],
  },
};

/** GET /api/esim — list supported countries + the user's purchases. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const countries = Object.entries(ESIM_PLANS).map(([code, info]) => ({
      code,
      name: info.countryName,
      flag: info.flag,
      plans: info.plans,
    }));

    const purchases = await db.eSimPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ countries, purchases });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/esim — purchase an eSim plan with wallet balance. */
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
    const b = (body ?? {}) as { countryCode?: string; planId?: string };
    const code = (b.countryCode || "").toUpperCase();
    const planId = b.planId || "";
    const country = ESIM_PLANS[code];
    if (!country) return apiError("Unsupported country", 400);
    const plan = country.plans.find((p) => p.id === planId);
    if (!plan) return apiError("Invalid plan for this country", 400);

    // Charge USD wallet
    const wallet = await db.wallet.findFirst({
      where: { userId, currency: "USD", type: "primary" },
    });
    if (!wallet) return apiError("No USD wallet found", 404);
    if (wallet.balance < plan.price) return apiError("Insufficient balance", 400);

    const updatedWallet = await db.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: plan.price } },
    });

    // Generate activation QR (a fake LPA activation string — this is the format
    // real eSIM QR codes use: LPA:1$<SMDP>$$<matchingID>)
    const matchingId = `${code}-${plan.id}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const activationQr = `LPA:1$gsim.gaexpay.example$${matchingId}`;

    const purchase = await db.eSimPurchase.create({
      data: {
        userId,
        countryCode: code,
        countryName: country.countryName,
        flag: country.flag,
        planId: plan.id,
        planLabel: plan.label,
        dataAmount: plan.dataAmount,
        durationDays: plan.durationDays,
        price: plan.price,
        currency: "USD",
        activationQr,
        status: "active",
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
      },
    });

    await db.transaction.create({
      data: {
        reference: `ESIM-${matchingId}`,
        userId,
        type: "payment",
        direction: "debit",
        status: "completed",
        amount: plan.price,
        fee: 0,
        currency: "USD",
        description: `eSim ${plan.label} · ${country.countryName}`,
        category: "travel",
        counterpartyName: "GaexPay eSim",
        method: "wallet",
        walletId: wallet.id,
        completedAt: new Date(),
        metadata: JSON.stringify({ esimPurchaseId: purchase.id, planId: plan.id, newWalletBalance: updatedWallet.balance }),
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "esim.purchase",
        entity: "esim_purchase",
        entityId: purchase.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ countryCode: code, planId: plan.id, price: plan.price }),
        severity: "info",
      },
    });

    return NextResponse.json({ purchase, walletBalance: updatedWallet.balance });
  } catch (e) {
    return apiCatch(e);
  }
}

export { ESIM_PLANS };
