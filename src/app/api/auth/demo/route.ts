/**
 * POST /api/auth/demo
 *
 * Dev-only: issue a JWT for the seeded demo user so the SPA can be explored
 * without going through signup. Returns 403 in production.
 *
 * Returns `{ user, token }` and sets the `gxp_token` cookie — same shape as
 * /api/auth/login.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken, DEMO_USER_ID } from "@/lib/auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const isProd = process.env.NODE_ENV === "production";

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

function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set("gxp_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function POST() {
  try {
    if (isProd) {
      return apiError("Demo login is disabled in production", 403);
    }

    const user = await db.user.findUnique({
      where: { id: DEMO_USER_ID },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        status: true, role: true, accountType: true, kycStatus: true,
        kycTier: true, permissions: true, currency: true, country: true,
        referralCode: true, createdAt: true,
      },
    });
    if (!user) return apiError("Demo user not found. Run `bun run db:seed`.", 500);

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id);
    const safeUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      accountType: user.accountType,
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      kycTier: user.kycTier,
      permissions: parsePermissions(user.permissions),
      currency: user.currency,
      country: user.country,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
    };

    const res = NextResponse.json({ user: safeUser, token });
    setAuthCookie(res, token);
    return res;
  } catch (e) {
    return apiCatch(e);
  }
}
