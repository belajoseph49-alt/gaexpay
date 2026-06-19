import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/kyc — current user's KYC status + submitted documents. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const [docs, user] = await Promise.all([
      db.kycDocument.findMany({ where: { userId } }),
      db.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, kycTier: true, kycSubmittedAt: true, kycVerifiedAt: true, kycRejectionReason: true },
      }),
    ]);
    return NextResponse.json({ documents: docs, ...user });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * POST /api/kyc — submit a KYC document.
 *
 * SENSITIVE: identity documents (govt ID, utility bill, selfie). Rate-limited
 * aggressively to prevent document-spam/abuse and recorded in the audit log
 * so compliance can trace who uploaded what and when.
 */
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
    const b = (body ?? {}) as Record<string, unknown>;

    const doc = await db.kycDocument.create({
      data: { userId, ...(b as object), status: "pending" } as never,
    });
    await db.user.update({
      where: { id: userId },
      data: { kycStatus: "pending", kycSubmittedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "kyc.document_upload",
        entity: "kyc_document",
        entityId: doc.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ documentType: (b as { type?: string }).type ?? "unknown" }),
        severity: "info",
      },
    });

    return NextResponse.json({ document: doc });
  } catch (e) {
    return apiCatch(e);
  }
}
