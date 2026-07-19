import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/me — current authenticated user's profile. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, phone: true, firstName: true, lastName: true,
        username: true, avatar: true, country: true, city: true, address: true, dob: true,
        gender: true, kycStatus: true, kycTier: true, mfaEnabled: true,
        biometricEnabled: true, twoFactorMethod: true, language: true,
        currency: true, themePreference: true, emailNotif: true, pushNotif: true,
        smsNotif: true, status: true, role: true, accountType: true,
        permissions: true, referralCode: true,
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
    if (!user) return apiError("User not found", 404);

    // Parse permissions JSON string → string[]
    let parsedPermissions: string[] = [];
    try {
      const parsed = JSON.parse(user.permissions || "[]");
      if (Array.isArray(parsed)) parsedPermissions = parsed.filter((p): p is string => typeof p === "string");
    } catch {
      parsedPermissions = [];
    }

    return NextResponse.json({
      user: {
        ...user,
        permissions: parsedPermissions,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/me — update current user's profile. */
export async function PATCH(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return apiError("Invalid payload", 400);
    }

    // Allowed fields
    const allowedFields = ["firstName", "lastName", "phone", "username", "dob", "country", "city", "address", "avatar"];
    const data: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return apiError("No valid fields to update", 400);
    }

    const updated = await db.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (e) {
    return apiCatch(e);
  }
}
