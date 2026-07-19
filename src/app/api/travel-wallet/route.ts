import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Local FX rate table (USD → local currency). Used for travel wallet previews.
const USD_RATES: Record<string, { rate: number; currency: string; name: string; flag: string }> = {
  FR: { rate: 0.92, currency: "EUR", name: "France", flag: "🇫🇷" },
  DE: { rate: 0.92, currency: "EUR", name: "Germany", flag: "🇩🇪" },
  ES: { rate: 0.92, currency: "EUR", name: "Spain", flag: "🇪🇸" },
  IT: { rate: 0.92, currency: "EUR", name: "Italy", flag: "🇮🇹" },
  PT: { rate: 0.92, currency: "EUR", name: "Portugal", flag: "🇵🇹" },
  NL: { rate: 0.92, currency: "EUR", name: "Netherlands", flag: "🇳🇱" },
  GB: { rate: 0.79, currency: "GBP", name: "United Kingdom", flag: "🇬🇧" },
  JP: { rate: 149.5, currency: "JPY", name: "Japan", flag: "🇯🇵" },
  KR: { rate: 1320, currency: "KRW", name: "South Korea", flag: "🇰🇷" },
  TH: { rate: 35.8, currency: "THB", name: "Thailand", flag: "🇹🇭" },
  SG: { rate: 1.34, currency: "SGD", name: "Singapore", flag: "🇸🇬" },
  ID: { rate: 15800, currency: "IDR", name: "Indonesia", flag: "🇮🇩" },
  VN: { rate: 24500, currency: "VND", name: "Vietnam", flag: "🇻🇳" },
  IN: { rate: 83.2, currency: "INR", name: "India", flag: "🇮🇳" },
  AE: { rate: 3.67, currency: "AED", name: "UAE", flag: "🇦🇪" },
  SA: { rate: 3.75, currency: "SAR", name: "Saudi Arabia", flag: "🇸🇦" },
  TR: { rate: 32.1, currency: "TRY", name: "Turkey", flag: "🇹🇷" },
  EG: { rate: 48.6, currency: "EGP", name: "Egypt", flag: "🇪🇬" },
  MA: { rate: 9.95, currency: "MAD", name: "Morocco", flag: "🇲🇦" },
  BR: { rate: 5.04, currency: "BRL", name: "Brazil", flag: "🇧🇷" },
  MX: { rate: 17.1, currency: "MXN", name: "Mexico", flag: "🇲🇽" },
  AU: { rate: 1.51, currency: "AUD", name: "Australia", flag: "🇦🇺" },
  CA: { rate: 1.36, currency: "CAD", name: "Canada", flag: "🇨🇦" },
  CH: { rate: 0.88, currency: "CHF", name: "Switzerland", flag: "🇨🇭" },
  US: { rate: 1, currency: "USD", name: "United States", flag: "🇺🇸" },
};

/** GET /api/travel-wallet — list destinations + supported country catalog. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const destinations = await db.travelWalletDestination.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const refreshed = destinations.map((d) => {
      const rateLockedExpired = !!d.rateLockedUntil && d.rateLockedUntil < now;
      return {
        ...d,
        lockedRate: rateLockedExpired ? null : d.lockedRate,
        rateLockedUntil: rateLockedExpired ? null : d.rateLockedUntil,
      };
    });

    return NextResponse.json({
      destinations: refreshed,
      supportedCountries: Object.entries(USD_RATES).map(([code, info]) => ({
        code,
        name: info.name,
        flag: info.flag,
        currency: info.currency,
        exchangeRate: info.rate,
      })),
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/travel-wallet — add a destination, lock rate, or convert funds. */
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
      action?: "add" | "lock" | "convert" | "remove";
      countryCode?: string;
      budget?: number | string;
      amount?: number | string;
      destinationId?: string;
    };
    const action = b.action || "add";

    if (action === "add") {
      const code = (b.countryCode || "").toUpperCase();
      const info = USD_RATES[code];
      if (!info) return apiError("Unsupported destination", 400);

      const existing = await db.travelWalletDestination.findFirst({
        where: { userId, countryCode: code },
      });
      if (existing) return apiError("Destination already added", 400);

      const dest = await db.travelWalletDestination.create({
        data: {
          userId,
          countryCode: code,
          countryName: info.name,
          flag: info.flag,
          currency: info.currency,
          exchangeRate: info.rate,
          budget: b.budget ? Number(b.budget) : null,
          spent: 0,
          status: "active",
        },
      });
      return NextResponse.json({ destination: dest });
    }

    if (action === "lock") {
      const id = b.destinationId;
      if (!id) return apiError("destinationId required", 400);
      const dest = await db.travelWalletDestination.findFirst({ where: { id, userId } });
      if (!dest) return apiError("Destination not found", 404);

      const updated = await db.travelWalletDestination.update({
        where: { id },
        data: {
          lockedRate: dest.exchangeRate,
          rateLockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ destination: updated });
    }

    if (action === "convert") {
      const id = b.destinationId;
      const amount = Number(b.amount);
      if (!id || !amount || amount <= 0) return apiError("destinationId and positive amount required", 400);
      const dest = await db.travelWalletDestination.findFirst({ where: { id, userId } });
      if (!dest) return apiError("Destination not found", 404);

      // Deduct from USD wallet
      const usdWallet = await db.wallet.findFirst({
        where: { userId, currency: "USD", type: "primary" },
      });
      if (!usdWallet || usdWallet.balance < amount) {
        return apiError("Insufficient USD balance", 400);
      }
      const updatedWallet = await db.wallet.update({
        where: { id: usdWallet.id },
        data: { balance: { decrement: amount } },
      });

      // Add to destination spent
      const updatedDest = await db.travelWalletDestination.update({
        where: { id },
        data: { spent: { increment: amount } },
      });

      await db.transaction.create({
        data: {
          reference: `TRV-${id.slice(-6).toUpperCase()}-${Date.now().toString(36)}`,
          userId,
          type: "exchange",
          direction: "debit",
          status: "completed",
          amount,
          fee: 0,
          currency: "USD",
          description: `Travel wallet conversion to ${dest.currency} (${dest.countryName})`,
          category: "travel",
          method: "wallet",
          walletId: usdWallet.id,
          completedAt: new Date(),
          metadata: JSON.stringify({ destinationId: id, rate: dest.exchangeRate, newWalletBalance: updatedWallet.balance, newDestinationSpent: updatedDest.spent }),
        },
      });

      return NextResponse.json({
        destination: updatedDest,
        convertedAmount: amount * dest.exchangeRate,
        walletBalance: updatedWallet.balance,
      });
    }

    if (action === "remove") {
      const id = b.destinationId;
      if (!id) return apiError("destinationId required", 400);
      await db.travelWalletDestination.deleteMany({ where: { id, userId } });
      return NextResponse.json({ removed: true });
    }

    return apiError("Unknown action", 400);
  } catch (e) {
    return apiCatch(e);
  }
}
