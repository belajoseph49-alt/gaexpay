/**
 * GET /api/auth/me
 *
 * Return the authenticated user's full profile, including accountType, role,
 * permissions, kycStatus and businessProfile (if any).
 *
 * Reads the JWT from EITHER the `gxp_token` cookie OR the
 * `Authorization: Bearer <jwt>` header. Unlike the other API routes,
 * `/api/auth/me` has NO dev/demo fallback — a real, valid JWT is required.
 *
 * 401 if no/invalid token.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((p) => typeof p === "string")) {
      return parsed as string[];
    }
  } catch {
    /* fall through */
  }
  return [];
}

function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <jwt>
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (m) return m[1].trim();
  }
  // 2. gxp_token cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const m = /(?:^|;\s*)gxp_token=([^;]+)/.exec(cookieHeader);
  if (m) return m[1];
  return null;
}

export async function GET(req: Request) {
  try {
    const token = extractToken(req);
    if (!token) return apiError("Unauthorized", 401);

    const decoded = verifyToken(token);
    if (!decoded?.userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        username: true, country: true, city: true, address: true, dob: true,
        gender: true, kycStatus: true, kycTier: true, accountType: true,
        role: true, permissions: true, status: true, currency: true,
        language: true, themePreference: true, mfaEnabled: true,
        biometricEnabled: true, twoFactorMethod: true, emailNotif: true,
        pushNotif: true, smsNotif: true, referralCode: true,
        referralEarnings: true, referralCount: true, rewardPoints: true,
        lastLoginAt: true, createdAt: true,
        businessProfile: {
          select: {
            id: true, companyName: true, kybStatus: true, kybTier: true,
            industry: true, legalCountry: true, legalCity: true, website: true,
          },
        },
      },
    });
    if (!user) return apiError("Unauthorized", 401);

    // Paranoia — never return a suspended user as "logged in" via /me.
    if (user.status !== "active") return apiError("Unauthorized", 401);

    return NextResponse.json({
      user: {
        ...user,
        permissions: parsePermissions(user.permissions),
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
