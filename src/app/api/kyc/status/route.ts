/**
 * GET /api/kyc/status
 *
 * Return the authenticated user's KYC status, current tier, the daily limit
 * for that tier, what's needed to reach the next tier, and the list of
 * previously submitted documents.
 *
 * Tier definitions (aligned with KYC_TIERS in src/lib/gaexpay.ts):
 *   Tier 0 — Unverified: ₦0/day     (no KYC)
 *   Tier 1 — Basic:       ₦50k/day  (email + phone verified)
 *   Tier 2 — Verified:    ₦500k/day (ID document verified)
 *   Tier 3 — Full:        ₦5M/day   (ID + address + selfie verified)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

interface TierDef {
  tier: number;
  name: string;
  dailyLimit: number;
  requirements: string[];
}

const TIERS: TierDef[] = [
  {
    tier: 0,
    name: "Unverified",
    dailyLimit: 0,
    requirements: ["Submit your ID document to unlock transfers"],
  },
  {
    tier: 1,
    name: "Basic",
    dailyLimit: 50_000,
    requirements: ["Verify your email", "Verify your phone number"],
  },
  {
    tier: 2,
    name: "ID Verified",
    dailyLimit: 500_000,
    requirements: [
      "Submit a valid government-issued ID",
      "Document must be approved by our compliance team",
    ],
  },
  {
    tier: 3,
    name: "Fully Verified",
    dailyLimit: 5_000_000,
    requirements: [
      "Complete address verification",
      "Pass the liveness/selfie check",
    ],
  },
];

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const [user, documents] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          accountType: true,
          kycStatus: true,
          kycTier: true,
          kycSubmittedAt: true,
          kycVerifiedAt: true,
          kycRejectionReason: true,
          email: true,
          phone: true,
          address: true,
        },
      }),
      db.kycDocument.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          documentNumber: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
        },
      }),
    ]);

    if (!user) return apiError("User not found", 404);

    const currentTier =
      TIERS.find((t) => t.tier === user.kycTier) ?? TIERS[0];
    const nextTier = TIERS.find((t) => t.tier === user.kycTier + 1) ?? null;

    return NextResponse.json({
      accountType: user.accountType,
      kycStatus: user.kycStatus,
      kycTier: user.kycTier,
      kycSubmittedAt: user.kycSubmittedAt,
      kycVerifiedAt: user.kycVerifiedAt,
      kycRejectionReason: user.kycRejectionReason,
      currentTier,
      nextTier,
      dailyLimit: currentTier.dailyLimit,
      emailVerified: true, // email is verified at signup; expose for UI
      phoneVerified: true, // phone is verified at signup; expose for UI
      hasAddress: !!user.address,
      documents,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
