/**
 * GET /api/kyb/status
 *
 * Return the authenticated business user's KYB status + their BusinessProfile
 * (directors, beneficial owners, legal documents metadata — but NOT the raw
 * data URLs of the documents, those are admin-only).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

interface StoredDoc {
  type: string;
  fileName?: string | null;
  uploadedAt?: string;
  verified?: boolean;
}

function parseJsonArray<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountType: true,
        businessProfile: {
          select: {
            id: true,
            companyName: true,
            companyType: true,
            registrationNumber: true,
            taxId: true,
            commercialRegistry: true,
            legalAddress: true,
            legalCity: true,
            legalCountry: true,
            website: true,
            industry: true,
            directors: true,
            beneficialOwners: true,
            documents: true,
            kybStatus: true,
            kybSubmittedAt: true,
            kybVerifiedAt: true,
            kybRejectionReason: true,
            kybTier: true,
          },
        },
      },
    });

    if (!user) return apiError("User not found", 404);
    if (user.accountType !== "business") {
      return apiError(
        "Personal accounts do not have a KYB profile",
        400,
      );
    }

    const profile = user.businessProfile;

    // Strip the heavy dataUrl field from documents before returning to the
    // client — the user already has those files locally, and the admin
    // panel fetches them through a separate authenticated route.
    const docsMeta = parseJsonArray<StoredDoc>(profile?.documents ?? null).map(
      (d) => ({
        type: d.type,
        fileName: d.fileName ?? null,
        uploadedAt: d.uploadedAt ?? null,
        verified: d.verified ?? false,
      }),
    );

    return NextResponse.json({
      accountType: user.accountType,
      hasProfile: !!profile,
      profile: profile
        ? {
            ...profile,
            directors: parseJsonArray(profile.directors),
            beneficialOwners: parseJsonArray(profile.beneficialOwners),
            documents: docsMeta,
          }
        : null,
      // Convenience flags for the UI:
      kybStatus: profile?.kybStatus ?? "unverified",
      kybTier: profile?.kybTier ?? 0,
      kybSubmittedAt: profile?.kybSubmittedAt ?? null,
      kybVerifiedAt: profile?.kybVerifiedAt ?? null,
      kybRejectionReason: profile?.kybRejectionReason ?? null,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
