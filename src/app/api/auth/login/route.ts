/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 *
 * Verifies credentials, checks the account is active, updates lastLoginAt,
 * issues a fresh JWT, and sets the `gxp_token` cookie. Returns `{ user, token }`.
 *
 * Errors are deliberately generic ("Invalid email or password") to prevent
 * email enumeration.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, generateToken } from "@/lib/auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getClientIdentifier } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set("gxp_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

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

export async function POST(req: Request) {
  try {
    // --- Rate limit ---------------------------------------------------------
    const rlId = `login:${getClientIdentifier(req, null)}`;
    const rl = await rateLimitAuth(rlId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // --- Parse --------------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!email || !password) return apiError("Invalid email or password", 401);

    // --- Lookup + verify ----------------------------------------------------
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        passwordHash: true, status: true, role: true, accountType: true,
        kycStatus: true, kycTier: true, permissions: true, currency: true,
        country: true, referralCode: true, createdAt: true,
      },
    });

    // Same generic error for "no such email" and "wrong password".
    if (!user) return apiError("Invalid email or password", 401);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return apiError("Invalid email or password", 401);

    // --- Account status -----------------------------------------------------
    if (user.status !== "active") {
      return apiError(
        user.status === "suspended"
          ? "Your account has been suspended. Please contact support."
          : "Your account is not active. Please contact support.",
        403,
      );
    }

    // --- Update lastLoginAt -------------------------------------------------
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // --- Issue JWT ----------------------------------------------------------
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
