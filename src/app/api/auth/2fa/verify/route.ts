/**
 * POST /api/auth/2fa/verify
 *
 * Confirm a TOTP enrollment by submitting a 6-digit code produced by the
 * user's authenticator app. On success, the pending secret + recovery code
 * hashes are promoted to "active" — `mfaEnabled = true`, `mfaSecret` is set,
 * `mfaPendingSecret` is cleared, and an audit log entry is written.
 *
 * Body: { code: "123456" }
 *
 * Auth required. Rate-limited (sensitive) to prevent brute-force guessing of
 * the 6-digit code (1,000,000 combinations × 30s window × 10 req/min ≈
 * ~210 tries/window, far below the 1e6 space).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { verifyTOTP } from "@/lib/totp";

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
    if (!/^\d{6}$/.test(code)) {
      return apiError("Please enter a 6-digit code from your authenticator app", 400);
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaEnabled: true,
        mfaPendingSecret: true,
        mfaRecoveryCodes: true,
        status: true,
      },
    });
    if (!user) return apiError("User not found", 404);
    if (user.status !== "active") return apiError("Account suspended", 403);
    if (user.mfaEnabled) {
      return apiError("Two-factor authentication is already enabled", 409);
    }
    if (!user.mfaPendingSecret) {
      return apiError(
        "No pending 2FA setup. Call /api/auth/2fa/setup first.",
        400,
      );
    }

    // Verify the TOTP code against the pending secret.
    const ok = verifyTOTP(code, user.mfaPendingSecret, 1);
    if (!ok) {
      // Log the failed attempt for security monitoring.
      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "2fa.verify_failed",
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
        "Invalid verification code. Make sure your device's time is correct and try again.",
        400,
      );
    }

    // Promote the pending secret to active. The recovery-code hashes were
    // stashed at /setup time so they're already in mfaRecoveryCodes.
    await db.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: user.mfaPendingSecret,
        mfaPendingSecret: null,
        twoFactorMethod: "authenticator",
      },
    });

    await Promise.all([
      db.notification.create({
        data: {
          userId,
          title: "Two-Factor Authentication Enabled 🔐",
          message:
            "Your account is now protected with TOTP 2FA. You'll be asked for a code from your authenticator app on every login.",
          type: "security",
          channel: "in_app",
        },
      }),
      db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "2fa.enable",
          entity: "user",
          entityId: userId,
          ip:
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          severity: "info",
        },
      }),
    ]);

    return NextResponse.json({
      enabled: true,
      method: "authenticator",
    });
  } catch (e) {
    return apiCatch(e);
  }
}
