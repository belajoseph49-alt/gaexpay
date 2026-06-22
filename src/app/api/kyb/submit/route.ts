/**
 * POST /api/kyb/submit
 *
 * Submit a full KYB (Know Your Business) verification package for a BUSINESS
 * account.
 *
 * Flow:
 *  1. Require auth.
 *  2. Reject if accountType !== "business" (personal accounts use /api/kyc).
 *  3. Validate required company info, directors (>=1), beneficial owners
 *     (only required if ownership ≥25% exists), and the 4 mandatory legal
 *     documents.
 *  4. Upsert the BusinessProfile with all data + JSON-encoded directors /
 *     beneficialOwners / documents arrays.
 *  5. Set kybStatus = "pending", kybSubmittedAt = now.
 *  6. In-app notification + audit log.
 *
 * Returns the updated business profile.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const VALID_COMPANY_TYPES = new Set([
  "llc",
  "corporation",
  "partnership",
  "sole_proprietor",
  "other",
]);

const REQUIRED_LEGAL_DOCS = [
  "certificate_of_incorporation",
  "tax_registration_certificate",
  "memorandum_articles",
  "business_license",
] as const;

interface DirectorInput {
  fullName: string;
  idNumber: string;
  role: string;
  dob: string;
  nationality: string;
  idDocument?: string;
}

interface BeneficialOwnerInput {
  fullName: string;
  idNumber: string;
  ownershipPercent: number;
  dob: string;
  nationality: string;
  idDocument?: string;
}

interface LegalDocInput {
  type: string;
  fileName?: string;
  dataUrl: string;
}

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

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

    // Load user — confirm business account.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountType: true,
        businessProfile: { select: { id: true } },
        status: true,
      },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (user.accountType !== "business") {
      return apiError(
        "Personal accounts must use the KYC flow (/api/kyc/submit)",
        400,
      );
    }

    // ---- Validate company info ----
    const companyName = nonEmpty(b.companyName) ? b.companyName.trim() : "";
    const companyType = nonEmpty(b.companyType) ? b.companyType.trim() : "";
    const registrationNumber = nonEmpty(b.registrationNumber)
      ? b.registrationNumber.trim()
      : "";
    const taxId = nonEmpty(b.taxId) ? b.taxId.trim() : "";
    const commercialRegistry = nonEmpty(b.commercialRegistry)
      ? b.commercialRegistry.trim()
      : "";
    const legalAddress = nonEmpty(b.legalAddress) ? b.legalAddress.trim() : "";
    const legalCity = nonEmpty(b.legalCity) ? b.legalCity.trim() : "";
    const legalCountry = nonEmpty(b.legalCountry) ? b.legalCountry.trim() : "";
    const website = nonEmpty(b.website) ? b.website.trim() : "";
    const industry = nonEmpty(b.industry) ? b.industry.trim() : "";

    if (!companyName) return apiError("Company name is required", 400);
    if (!VALID_COMPANY_TYPES.has(companyType)) {
      return apiError("Invalid company type", 400);
    }
    if (!registrationNumber) {
      return apiError("Registration number is required", 400);
    }
    if (!taxId) return apiError("Tax ID is required", 400);
    if (!legalAddress) return apiError("Legal address is required", 400);
    if (!legalCity) return apiError("Legal city is required", 400);
    if (!legalCountry) return apiError("Legal country is required", 400);

    // ---- Validate directors (>=1) ----
    const directorsRaw = asArray<DirectorInput>(b.directors);
    if (directorsRaw.length === 0) {
      return apiError("At least one director is required", 400);
    }
    const directors: DirectorInput[] = [];
    for (const [i, d] of directorsRaw.entries()) {
      if (!d || typeof d !== "object") {
        return apiError(`Director #${i + 1} is invalid`, 400);
      }
      const fullName = nonEmpty(d.fullName) ? d.fullName.trim() : "";
      const idNumber = nonEmpty(d.idNumber) ? d.idNumber.trim() : "";
      const role = nonEmpty(d.role) ? d.role.trim() : "";
      const dob = nonEmpty(d.dob) ? d.dob.trim() : "";
      const nationality = nonEmpty(d.nationality) ? d.nationality.trim() : "";
      if (!fullName || !idNumber || !role || !dob || !nationality) {
        return apiError(
          `Director #${i + 1} is missing required fields`,
          400,
        );
      }
      directors.push({
        fullName,
        idNumber,
        role,
        dob,
        nationality,
        idDocument: nonEmpty(d.idDocument) ? d.idDocument : undefined,
      });
    }

    // ---- Validate beneficial owners (only those with ≥25% required) ----
    const ownersRaw = asArray<BeneficialOwnerInput>(b.beneficialOwners);
    const beneficialOwners: BeneficialOwnerInput[] = [];
    let totalOwnership = 0;
    for (const [i, o] of ownersRaw.entries()) {
      if (!o || typeof o !== "object") {
        return apiError(`Beneficial owner #${i + 1} is invalid`, 400);
      }
      const fullName = nonEmpty(o.fullName) ? o.fullName.trim() : "";
      const idNumber = nonEmpty(o.idNumber) ? o.idNumber.trim() : "";
      const ownershipPercent =
        typeof o.ownershipPercent === "number" ? o.ownershipPercent : Number(o.ownershipPercent);
      const dob = nonEmpty(o.dob) ? o.dob.trim() : "";
      const nationality = nonEmpty(o.nationality) ? o.nationality.trim() : "";
      if (!fullName || !idNumber || !dob || !nationality) {
        return apiError(
          `Beneficial owner #${i + 1} is missing required fields`,
          400,
        );
      }
      if (
        Number.isNaN(ownershipPercent) ||
        ownershipPercent < 0 ||
        ownershipPercent > 100
      ) {
        return apiError(
          `Beneficial owner #${i + 1} has invalid ownership percentage`,
          400,
        );
      }
      totalOwnership += ownershipPercent;
      beneficialOwners.push({
        fullName,
        idNumber,
        ownershipPercent,
        dob,
        nationality,
        idDocument: nonEmpty(o.idDocument) ? o.idDocument : undefined,
      });
    }
    if (totalOwnership > 100) {
      return apiError(
        "Total beneficial ownership cannot exceed 100%",
        400,
      );
    }

    // ---- Validate legal documents ----
    const legalDocsRaw = asArray<LegalDocInput>(b.documents);
    const docsByType = new Map<string, LegalDocInput>();
    for (const d of legalDocsRaw) {
      if (d && nonEmpty(d.type) && nonEmpty(d.dataUrl)) {
        docsByType.set(d.type, d);
      }
    }
    const missingDocs = REQUIRED_LEGAL_DOCS.filter((t) => !docsByType.has(t));
    if (missingDocs.length > 0) {
      return apiError(
        `Missing legal documents: ${missingDocs.join(", ")}`,
        400,
      );
    }

    // ---- Persist (upsert BusinessProfile) ----
    const now = new Date();
    const documentsJson = JSON.stringify(
      Array.from(docsByType.values()).map((d) => ({
        type: d.type,
        fileName: d.fileName ?? null,
        uploadedAt: now.toISOString(),
        verified: false,
        // NOTE: we store the data URL so compliance reviewers can pull it
        // from the admin panel. The data URL is already capped client-side
        // to ~2MB per file.
        dataUrl: d.dataUrl,
      })),
    );

    const profile = await db.businessProfile.upsert({
      where: { userId },
      create: {
        userId,
        companyName,
        companyType,
        registrationNumber,
        taxId,
        commercialRegistry,
        legalAddress,
        legalCity,
        legalCountry,
        website: website || null,
        industry: industry || null,
        directors: JSON.stringify(directors),
        beneficialOwners: JSON.stringify(beneficialOwners),
        documents: documentsJson,
        kybStatus: "pending",
        kybSubmittedAt: now,
        kybRejectionReason: null,
      },
      update: {
        companyName,
        companyType,
        registrationNumber,
        taxId,
        commercialRegistry,
        legalAddress,
        legalCity,
        legalCountry,
        website: website || null,
        industry: industry || null,
        directors: JSON.stringify(directors),
        beneficialOwners: JSON.stringify(beneficialOwners),
        documents: documentsJson,
        kybStatus: "pending",
        kybSubmittedAt: now,
        kybRejectionReason: null,
      },
      select: {
        id: true,
        companyName: true,
        companyType: true,
        kybStatus: true,
        kybTier: true,
        kybSubmittedAt: true,
        kybVerifiedAt: true,
        kybRejectionReason: true,
        legalCountry: true,
        legalCity: true,
        industry: true,
        website: true,
      },
    });

    // ---- Notification + audit (best-effort) ----
    await Promise.all([
      db.notification.create({
        data: {
          userId,
          title: "KYB Submission Received",
          message: `We've received the verification documents for ${companyName}. Review usually takes 24-72 hours.`,
          type: "info",
          channel: "in_app",
          actionUrl: "/identity",
        },
      }),
      db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "kyb.submit",
          entity: "business_profile",
          entityId: profile.id,
          ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({
            companyName,
            companyType,
            directorsCount: directors.length,
            beneficialOwnersCount: beneficialOwners.length,
          }),
          severity: "info",
        },
      }),
    ]);

    return NextResponse.json({ profile }, { status: 201 });
  } catch (e) {
    return apiCatch(e);
  }
}
