/**
 * POST /api/kyc/submit
 *
 * Submit a full KYC verification package for a PERSONAL account.
 *
 * Flow:
 *  1. Require auth (no demo fallback in prod — see getAuthUserId).
 *  2. Reject if accountType !== "personal" (business accounts use /api/kyb).
 *  3. Validate required fields: dob, nationality, address, documentType,
 *     documentNumber, documentExpiry, frontImage, backImage, selfieImage.
 *  4. Update User (dob, country, address, kycStatus=pending, kycSubmittedAt).
 *  5. Create a KycDocument row with all images + metadata.
 *  6. Create an in-app Notification so the user gets a confirmation ping.
 *  7. Audit log the submission (no PII beyond the doc type).
 *
 * Returns the updated user kyc fields + the new document id.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const VALID_DOC_TYPES = new Set([
  "passport",
  "national_id",
  "drivers_license",
  "voters_card",
]);

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

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
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))),
          },
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

    // Load user — confirm personal account.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountType: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
      },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (user.accountType !== "personal") {
      return apiError(
        "Business accounts must use the KYB flow (/api/kyb/submit)",
        400,
      );
    }

    // ---- Validate required fields ----
    const dob = nonEmpty(b.dob) ? b.dob.trim() : "";
    const nationality = nonEmpty(b.nationality) ? b.nationality.trim() : "";
    const address = nonEmpty(b.address) ? b.address.trim() : "";
    const city = nonEmpty(b.city) ? b.city.trim() : "";
    const documentType = nonEmpty(b.documentType) ? b.documentType.trim() : "";
    const documentNumber = nonEmpty(b.documentNumber)
      ? b.documentNumber.trim()
      : "";
    const documentExpiry = nonEmpty(b.documentExpiry)
      ? b.documentExpiry.trim()
      : "";
    const frontImage = nonEmpty(b.frontImage) ? b.frontImage.trim() : "";
    const selfieImage = nonEmpty(b.selfieImage) ? b.selfieImage.trim() : "";
    // backImage is optional (not all doc types have a back, e.g. passport).
    const backImage = nonEmpty(b.backImage) ? b.backImage.trim() : "";

    if (!dob) return apiError("Date of birth is required", 400);
    if (!nationality) return apiError("Nationality is required", 400);
    if (!address) return apiError("Address is required", 400);
    if (!VALID_DOC_TYPES.has(documentType)) {
      return apiError("Invalid document type", 400);
    }
    if (!documentNumber) return apiError("Document number is required", 400);
    if (!documentExpiry) return apiError("Document expiry is required", 400);
    if (!frontImage) return apiError("Document front image is required", 400);
    if (!selfieImage) return apiError("Selfie image is required", 400);

    // Basic date sanity — reject obviously bad DOBs.
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      return apiError("Invalid date of birth", 400);
    }
    const ageMs = Date.now() - dobDate.getTime();
    const ageYears = ageMs / (365.25 * 24 * 3600 * 1000);
    if (ageYears < 16 || ageYears > 120) {
      return apiError("You must be at least 16 years old to verify", 400);
    }

    // ---- Persist ----
    const now = new Date();
    const [updatedUser, doc] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          dob,
          country: nationality,
          city: city || null,
          address,
          kycStatus: "pending",
          kycSubmittedAt: now,
          kycRejectionReason: null,
        },
        select: {
          id: true,
          kycStatus: true,
          kycTier: true,
          kycSubmittedAt: true,
          kycVerifiedAt: true,
          kycRejectionReason: true,
        },
      }),
      db.kycDocument.create({
        data: {
          userId,
          type: documentType,
          documentNumber,
          frontImage,
          backImage: backImage || null,
          selfieImage,
          status: "pending",
        },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // ---- Notification + audit (best-effort, non-blocking) ----
    await Promise.all([
      db.notification.create({
        data: {
          userId,
          title: "KYC Submission Received",
          message:
            "We've received your identity verification documents. Review usually takes 24-48 hours.",
          type: "info",
          channel: "in_app",
          actionUrl: "/identity",
        },
      }),
      db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "kyc.submit",
          entity: "kyc_document",
          entityId: doc.id,
          ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({ documentType }),
          severity: "info",
        },
      }),
    ]);

    return NextResponse.json(
      { user: updatedUser, document: doc },
      { status: 201 },
    );
  } catch (e) {
    return apiCatch(e);
  }
}
