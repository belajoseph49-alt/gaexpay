import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const NGN_RATE: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12, UGX: 0.42, XOF: 2.5, ZAR: 82,
};

/** GET /api/wallets — list the authenticated user's wallets. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const wallets = await db.wallet.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    const totalNGN = wallets.reduce((sum, w) => {
      return sum + w.balance * (NGN_RATE[w.currency] ?? 1);
    }, 0);
    return NextResponse.json({ wallets, totalNGN });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/wallets — create a new wallet (sensitive: opens new balance container). */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // Sensitive rate limit — wallet creation is a privileged action.
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
    const b = (body ?? {}) as { currency?: string; label?: string; type?: string };

    const wallet = await db.wallet.create({
      data: {
        userId,
        currency: b.currency ?? "NGN",
        label: b.label ?? "New Wallet",
        type: b.type ?? "primary",
        balance: 0,
        ledgerBalance: 0,
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "wallet.create",
        entity: "wallet",
        entityId: wallet.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ currency: wallet.currency, label: wallet.label, type: wallet.type }),
        severity: "info",
      },
    });

    return NextResponse.json({ wallet });
  } catch (e) {
    return apiCatch(e);
  }
}
