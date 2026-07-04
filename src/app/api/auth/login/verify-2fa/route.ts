/**
 * POST /api/auth/login/verify-2fa
 *
 * Complete a login that was paused for 2FA verification.
 *
 * Body:
 *   { challenge: <userId>, code: "123456" }                  // TOTP path
 *   { challenge: <userId>, recoveryCode: "ABCD-1234-EF56" }  // recovery path
 *
 * Verifies the TOTP code (or consumes a recovery code) against the user's
 * stored `mfaSecret` / `mfaRecoveryCodes`. On success, updates lastLoginAt,
 * issues the JWT, sets the `gxp_token` cookie, and returns `{ user, token }`.
 *
 * On failure: 400 with a generic "Invalid code" message + audit log entry.
 *
 * Rate-limited (5/min per IP+user). Failed attempts are logged so brute-force
 * attacks are detectable.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { rateLimitAuth } from "@/lib/rate-limit";
import { getClientIdentifier } from "@/lib/api-auth";
import { verifyTOTP, findRecoveryCodeIndex } from "@/lib/totp";

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
    // --- Parse + extract challenge -----------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const challenge = typeof body?.challenge === "string" ? body.challenge.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const recoveryCode =
      typeof body?.recoveryCode === "string" ? body.recoveryCode.trim() : "";

    if (!challenge) return apiError("Missing 2FA challenge", 400);
    if (!code && !recoveryCode) {
      return apiError("Please provide a TOTP code or a recovery code", 400);
    }

    // --- Rate limit (per source + target user) -----------------------------
    const rlId = `2fa-login:${getClientIdentifier(req, null)}:${challenge}`;
    const rl = rateLimitAuth(rlId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many 2FA attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // --- Lookup user --------------------------------------------------------
    const user = await db.user.findUnique({
      where: { id: challenge },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        status: true, role: true, accountType: true, kycStatus: true,
        kycTier: true, permissions: true, currency: true, country: true,
        referralCode: true, createdAt: true,
        mfaEnabled: true, mfaSecret: true, mfaRecoveryCodes: true,
      },
    });

    // Don't reveal whether the userId was valid — return the same generic
    // error so an attacker can't distinguish "bad challenge" from "bad code".
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return apiError("Invalid verification code", 400);
    }
    if (user.status !== "active") {
      return apiError(
        user.status === "suspended"
          ? "Your account has been suspended. Please contact support."
          : "Your account is not active. Please contact support.",
        403,
      );
    }

    // --- Verify the code (TOTP or recovery) --------------------------------
    let authorized = false;
    let usedRecoveryIndex = -1;

    if (code) {
      if (!/^\d{6}$/.test(code)) {
        return apiError("Invalid verification code", 400);
      }
      authorized = verifyTOTP(code, user.mfaSecret, 1);
    } else if (recoveryCode) {
      let hashes: (string | null)[] = [];
      try {
        const parsed: unknown = JSON.parse(user.mfaRecoveryCodes ?? "[]");
        if (Array.isArray(parsed)) {
          hashes = parsed.map((h) => (typeof h === "string" ? h : null));
        }
      } catch {
        hashes = [];
      }
      usedRecoveryIndex = findRecoveryCodeIndex(recoveryCode, hashes);
      authorized = usedRecoveryIndex >= 0;
    }

    if (!authorized) {
      await db.auditLog.create({
        data: {
          userId: user.id,
          actor: "user",
          action: "login.2fa_failed",
          entity: "auth",
          entityId: user.id,
          ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          severity: "warning",
        },
      });
      return apiError("Invalid verification code", 400);
    }

    // --- If a recovery code was used, consume it (replace hash with null) --
    if (usedRecoveryIndex >= 0) {
      let hashes: (string | null)[] = [];
      try {
        const parsed: unknown = JSON.parse(user.mfaRecoveryCodes ?? "[]");
        if (Array.isArray(parsed)) {
          hashes = parsed.map((h) => (typeof h === "string" ? h : null));
        }
      } catch {
        hashes = [];
      }
      hashes[usedRecoveryIndex] = null;
      const remaining = hashes.filter(Boolean).length;
      await db.user.update({
        where: { id: user.id },
        data: { mfaRecoveryCodes: JSON.stringify(hashes) },
      });
      // Notify the user that a recovery code was used. If they're running
      // low, prompt them to re-enroll to get a fresh set.
      await db.notification.create({
        data: {
          userId: user.id,
          title: "Recovery Code Used",
          message:
            remaining > 0
              ? `A recovery code was used to log in. You have ${remaining} code${remaining === 1 ? "" : "s"} remaining. Consider re-enrolling 2FA to refresh your backup codes.`
              : "A recovery code was used to log in. You have no recovery codes left. Please re-enroll 2FA to generate new ones.",
          type: "security",
          channel: "in_app",
        },
      }).catch(() => {
        /* best-effort — don't fail login if the notification write fails */
      });
    }

    // --- Update lastLoginAt + audit + issue JWT ----------------------------
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        actor: "user",
        action: "login",
        entity: "auth",
        entityId: user.id,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          mfa: true,
          method: usedRecoveryIndex >= 0 ? "recovery_code" : "totp",
        }),
        severity: "info",
      },
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
