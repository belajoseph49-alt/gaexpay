import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/cards — list the authenticated user's cards. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const cards = await db.card.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ cards });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/cards — issue a new card (sensitive: financial instrument). */
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
      type?: string; brand?: string; nickname?: string; holderName?: string;
      currency?: string; limit?: number; color?: string;
    };

    const last4 = Math.floor(1000 + Math.random() * 9000).toString();
    const card = await db.card.create({
      data: {
        userId,
        type: b.type ?? "virtual",
        brand: b.brand ?? "visa",
        nickname: b.nickname ?? "GaexPay Card",
        maskedNumber: `**** **** **** ${last4}`,
        fullNumberEnc: "enc_" + last4,
        expiryMonth: String(Math.floor(Math.random() * 12) + 1).padStart(2, "0"),
        expiryYear: String(26 + Math.floor(Math.random() * 4)),
        cvvEnc: "enc_cvv_new",
        holderName: b.holderName ?? "ADAEZE OKONKWO",
        currency: b.currency ?? "NGN",
        balance: 0,
        limit: b.limit ?? 200000,
        spending: 0,
        status: "active",
        color: b.color ?? "emerald",
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "card.create",
        entity: "card",
        entityId: card.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ type: card.type, brand: card.brand, currency: card.currency }),
        severity: "info",
      },
    });

    return NextResponse.json({ card });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/cards — update card status (freeze/unfreeze) or nickname. */
export async function PATCH(req: Request) {
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
    const b = (body ?? {}) as { id?: string; status?: string; nickname?: string };
    if (!b.id) return apiError("Card id required", 400);

    // Ensure the card belongs to the authenticated user before updating.
    const existing = await db.card.findFirst({ where: { id: b.id, userId } });
    if (!existing) return apiError("Card not found", 404);

    const card = await db.card.update({
      where: { id: b.id },
      data: { ...(b.status && { status: b.status }), ...(b.nickname && { nickname: b.nickname }) },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "card.update",
        entity: "card",
        entityId: card.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ status: b.status, nickname: b.nickname }),
        severity: b.status === "frozen" ? "warning" : "info",
      },
    });

    return NextResponse.json({ card });
  } catch (e) {
    return apiCatch(e);
  }
}
