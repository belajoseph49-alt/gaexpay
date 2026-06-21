/**
 * POST /api/auth/signup
 *
 * Create a new GaexPay account (personal or business) and issue a session JWT.
 *
 * Body:
 *   { firstName, lastName, email, phone, password, country?, accountType, companyName? }
 *
 * On success returns `{ user, token }` and sets the `gxp_token` httpOnly cookie.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { getClientIdentifier } from "@/lib/api-auth";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_RE = /^\+?[0-9]{7,15}$/;
const NAME_RE = /^[\p{L}\p{M}''\- ]{2,50}$/u;

function passwordStrength(p: string): { ok: boolean; reason?: string } {
  if (p.length < 8) return { ok: false, reason: "Password must be at least 8 characters" };
  if (!/[A-Za-z]/.test(p)) return { ok: false, reason: "Password must contain a letter" };
  if (!/[0-9]/.test(p)) return { ok: false, reason: "Password must contain a number" };
  return { ok: true };
}

function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set("gxp_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days — matches token TTL
  });
}

export async function POST(req: Request) {
  try {
    // --- Rate limit ---------------------------------------------------------
    const rlId = `signup:${getClientIdentifier(req, null)}`;
    const rl = rateLimitSensitive(rlId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // --- Parse + validate ---------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object") return apiError("Invalid request body", 400);

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const country = body.country ? String(body.country).trim() : "Nigeria";
    const accountType = String(body.accountType ?? "personal").toLowerCase();
    const companyName = body.companyName ? String(body.companyName).trim() : "";

    if (!NAME_RE.test(firstName)) return apiError("First name must be 2–50 letters", 400);
    if (!NAME_RE.test(lastName)) return apiError("Last name must be 2–50 letters", 400);
    if (!EMAIL_RE.test(email)) return apiError("Invalid email address", 400);
    if (!PHONE_RE.test(phone)) return apiError("Invalid phone number", 400);
    const pwCheck = passwordStrength(password);
    if (!pwCheck.ok) return apiError(pwCheck.reason ?? "Invalid password", 400);
    if (accountType !== "personal" && accountType !== "business") {
      return apiError("accountType must be 'personal' or 'business'", 400);
    }
    if (accountType === "business" && companyName.length < 2) {
      return apiError("Company name is required for business accounts", 400);
    }

    // --- Uniqueness ---------------------------------------------------------
    const existing = await db.user.findFirst({
      where: { OR: [{ email }, { phone }] },
      select: { id: true },
    });
    if (existing) {
      // No enumeration — same message for both email/phone collisions.
      return apiError("An account with this email or phone already exists", 409);
    }

    // --- Hash + create ------------------------------------------------------
    const passwordHash = await hashPassword(password);
    const referralCode = "GXP" + randomBytes(4).toString("hex").toUpperCase();

    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        country,
        accountType,
        role: "user",
        status: "active",
        currency: "NGN",
        language: "en",
        permissions: "[]",
        referralCode,
      },
    });

    // Business: also create an empty BusinessProfile (KYB to be filled later)
    if (accountType === "business") {
      await db.businessProfile.create({
        data: {
          userId: user.id,
          companyName,
          kybStatus: "unverified",
        },
      });
    }

    // Default NGN wallet
    await db.wallet.create({
      data: {
        userId: user.id,
        currency: "NGN",
        balance: 0,
        ledgerBalance: 0,
        type: accountType === "business" ? "business" : "primary",
        label: accountType === "business" ? "Business Wallet" : "Main Wallet",
        isDefault: true,
        status: "active",
      },
    });

    // Welcome notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to GaexPay! 🎉",
        message: `Hi ${firstName}, your ${accountType === "business" ? "business" : "personal"} account is ready. Complete verification to unlock higher limits.`,
        type: "success",
        channel: "in_app",
      },
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
      permissions: [] as string[],
      currency: user.currency,
      country: user.country,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
    };

    const res = NextResponse.json({ user: safeUser, token }, { status: 201 });
    setAuthCookie(res, token);
    return res;
  } catch (e) {
    return apiCatch(e);
  }
}
