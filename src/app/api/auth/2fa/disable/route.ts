/**
 * POST /api/auth/2fa/disable
 *
 * Disable TOTP 2FA on the current user's account. Requires a valid TOTP code
 * from the user's authenticator app OR a recovery code (so a user who has
 * lost their authenticator can still recover by using a recovery code).
 *
 * Body:
 *   { code: "123456" }            // TOTP code (preferred)
 *   { recoveryCode: "ABCD-1234-EF56" }  // recovery code (fallback)
 *
 * On success:
 *  - mfaEnabled → false
 *  - mfaSecret → null
 *  - mfaRecoveryCodes → null
 *  - mfaPendingSecret → null
 *  - Audit log written (severity=warning)
 *  - Notification sent warning the user their account is now less secure
 *
 * Auth required. Rate-limited (sensitive) — failed attempts are logged so
 * brute-force attempts on recovery codes are detectable.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { verifyTOTP, findRecoveryCodeIndex } from "@/lib/totp";

export const dynamic = "force-dynamic";

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
    const code = typeof b.code === "string" ? b.code.trim() : "";
    const recoveryCode =
      typeof b.recoveryCode === "string" ? b.recoveryCode.trim() : "";

    if (!code && !recoveryCode) {
      return apiError(
        "Please provide your TOTP code or a recovery code to disable 2FA",
        400,
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaSecret: true,
        mfaRecoveryCodes: true,
        status: true,
      },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (!user.mfaEnabled || !user.mfaSecret) {
      return apiError("Two-factor authentication is not enabled", 400);
    }

    let authorized = false;
    let usedRecoveryIndex = -1;

    if (code) {
      if (!/^\d{6}$/.test(code)) {
        return apiError("Invalid TOTP code format", 400);
      }
      authorized = verifyTOTP(code, user.mfaSecret, 1);
    } else if (recoveryCode) {
      // Parse the stashed recovery hashes and look for a match.
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
          userId,
          actor: "user",
          action: "2fa.disable_failed",
          entity: "user",
          entityId: userId,
          ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          severity: "warning",
        },
      });
      return apiError(
        "Invalid code. Please verify your authenticator time and try again.",
        400,
      );
    }

    // Authorised — disable 2FA entirely.
    await db.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
        mfaPendingSecret: null,
        twoFactorMethod: null,
      },
    });

    await Promise.all([
      db.notification.create({
        data: {
          userId,
          title: "Two-Factor Authentication Disabled",
          message:
            "2FA has been turned off on your account. We strongly recommend re-enabling it to keep your funds safe.",
          type: "warning",
          channel: "in_app",
        },
      }),
      db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "2fa.disable",
          entity: "user",
          entityId: userId,
          ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          details: JSON.stringify({
            method: usedRecoveryIndex >= 0 ? "recovery_code" : "totp",
          }),
          severity: "warning",
        },
      }),
    ]);

    return NextResponse.json({
      disabled: true,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
