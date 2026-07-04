import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Fixed 1:1 swap rate between stablecoins (USDT, USDC, cUSD)
const POCKET_META: Record<string, { name: string; color: string; symbol: string }> = {
  USDT: { name: "Tether Pocket", color: "violet", symbol: "₮" },
  USDC: { name: "USD Coin Pocket", color: "purple", symbol: "₮" },
  cUSD: { name: "Celo Dollar Pocket", color: "fuchsia", symbol: "₵" },
};

/** GET /api/pockets — list the user's stablecoin pockets. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    let pockets = await db.pocket.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // Auto-create the three default pockets if user has none
    if (pockets.length === 0) {
      for (const [code, meta] of Object.entries(POCKET_META)) {
        await db.pocket.create({
          data: {
            userId,
            code,
            name: meta.name,
            balance: 0,
            color: meta.color,
          },
        });
      }
      pockets = await db.pocket.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
    }

    const total = pockets.reduce((s, p) => s + p.balance, 0);
    return NextResponse.json({ pockets, totalBalance: total });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/pockets — swap between pockets (1:1, no fees). */
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
      fromPocketId?: string;
      toPocketId?: string;
      amount?: number | string;
    };
    const fromId = b.fromPocketId;
    const toId = b.toPocketId;
    const amount = Number(b.amount);
    if (!fromId || !toId) return apiError("fromPocketId and toPocketId required", 400);
    if (fromId === toId) return apiError("Cannot swap to the same pocket", 400);
    if (!amount || amount <= 0) return apiError("amount must be > 0", 400);

    const from = await db.pocket.findFirst({ where: { id: fromId, userId } });
    const to = await db.pocket.findFirst({ where: { id: toId, userId } });
    if (!from || !to) return apiError("Pocket not found", 404);
    if (from.balance < amount) return apiError("Insufficient pocket balance", 400);

    const updatedFrom = await db.pocket.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } },
    });
    const updatedTo = await db.pocket.update({
      where: { id: toId },
      data: { balance: { increment: amount } },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "pocket.swap",
        entity: "pocket",
        entityId: fromId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ from: from.code, to: to.code, amount }),
        severity: "info",
      },
    });

    return NextResponse.json({
      from: updatedFrom,
      to: updatedTo,
      swapAmount: amount,
      fee: 0,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
