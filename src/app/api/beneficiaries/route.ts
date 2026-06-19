import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/beneficiaries — list saved recipients. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const beneficiaries = await db.beneficiary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ beneficiaries });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/beneficiaries — save a new recipient (sensitive: used for future money flows). */
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
    // Prisma's `create` will reject unknown fields at runtime; we accept the
    // typed shape and let the DB enforce the rest.
    const b = (body ?? {}) as Record<string, unknown>;

    const beneficiary = await db.beneficiary.create({
      data: { userId, ...(b as object) } as never,
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "beneficiary.create",
        entity: "beneficiary",
        entityId: beneficiary.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        severity: "info",
      },
    });

    return NextResponse.json({ beneficiary });
  } catch (e) {
    return apiCatch(e);
  }
}

/** DELETE /api/beneficiaries?id=... — remove a saved recipient. */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return apiError("id required", 400);

    // Ensure the beneficiary belongs to the user before deleting.
    const existing = await db.beneficiary.findFirst({ where: { id, userId } });
    if (!existing) return apiError("Beneficiary not found", 404);

    await db.beneficiary.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "beneficiary.delete",
        entity: "beneficiary",
        entityId: id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        severity: "info",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
