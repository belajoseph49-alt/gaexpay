import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { createNotification, type NotificationType } from "@/lib/notifications-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/security/event — record a security-relevant event for the
 * authenticated user (new device login, suspicious login attempt, password
 * change, etc.) and emit a `security` notification so it shows up in the
 * bell popover + full notifications view.
 *
 * Body: {
 *   event: "new_device_login" | "suspicious_login" | "password_change" | "mfa_enabled" | "mfa_disabled" | "pin_change" | "logout_all",
 *   device?: string,         // e.g. "iPhone 15 Pro · Lagos, NG"
 *   ip?: string,             // e.g. "102.89.23.10"
 *   location?: string,       // e.g. "Lagos, Nigeria"
 *   notes?: string,
 * }
 *
 * This endpoint is also called internally by `/api/me` PATCH when the user
 * toggles MFA / changes their password — but it's exposed as a standalone
 * route so a future real login flow can POST `new_device_login` events.
 */
const ALLOWED_EVENTS = new Set([
  "new_device_login",
  "suspicious_login",
  "password_change",
  "mfa_enabled",
  "mfa_disabled",
  "pin_change",
  "logout_all",
  "biometric_enabled",
  "biometric_disabled",
]);

const EVENT_COPY: Record<
  string,
  { title: string; message: (ctx: { device?: string; ip?: string; location?: string }) => string }
> = {
  new_device_login: {
    title: "New device signed in",
    message: (c) =>
      `A new sign-in to your account was detected${c.device ? ` from ${c.device}` : ""}${c.location ? ` in ${c.location}` : ""}${c.ip ? ` (IP ${c.ip})` : ""}. If this was you, no action is needed. If not, please secure your account immediately.`,
  },
  suspicious_login: {
    title: "Suspicious login blocked",
    message: (c) =>
      `We blocked a suspicious sign-in attempt to your account${c.location ? ` from ${c.location}` : ""}${c.ip ? ` (IP ${c.ip})` : ""}. If this was you, you can ignore this alert.`,
  },
  password_change: {
    title: "Password changed",
    message: () =>
      `Your account password was changed successfully. If you did not make this change, please contact support immediately.`,
  },
  mfa_enabled: {
    title: "Two-factor authentication enabled",
    message: () =>
      `2FA is now active on your account. You'll be asked for a verification code on every future sign-in.`,
  },
  mfa_disabled: {
    title: "Two-factor authentication disabled",
    message: () =>
      `2FA has been turned off. Your account is now protected by password only. We recommend re-enabling 2FA for stronger security.`,
  },
  pin_change: {
    title: "Transaction PIN changed",
    message: () =>
      `Your GaexPay transaction PIN was updated. Use the new PIN for all future money transfers and card transactions.`,
  },
  logout_all: {
    title: "Signed out of all devices",
    message: () =>
      `You've been signed out of every device connected to your account. Please sign in again to continue using GaexPay.`,
  },
  biometric_enabled: {
    title: "Biometric login enabled",
    message: () =>
      `Face ID / Touch ID is now active. You can sign in with biometrics on your trusted devices.`,
  },
  biometric_disabled: {
    title: "Biometric login disabled",
    message: () =>
      `Biometric sign-in has been turned off. You'll use your password + 2FA going forward.`,
  },
};

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
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      event?: string;
      device?: string;
      ip?: string;
      location?: string;
      notes?: string;
    };
    if (!b.event || !ALLOWED_EVENTS.has(b.event)) {
      return apiError(
        `event must be one of: ${Array.from(ALLOWED_EVENTS).join(", ")}`,
        400,
      );
    }

    const copy = EVENT_COPY[b.event];
    if (!copy) return apiError("Unknown event", 400);

    // Audit log the security event — always severity "warning" so it shows up
    // in the admin audit console.
    await db.auditLog.create({
      data: {
        userId,
        actor: "system",
        action: `security.${b.event}`,
        entity: "user",
        entityId: userId,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || b.ip || null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          event: b.event,
          device: b.device,
          ip: b.ip,
          location: b.location,
          notes: b.notes,
        }),
        severity: b.event === "suspicious_login" ? "critical" : "warning",
      },
    });

    const notif = await createNotification({
      userId,
      type: "security" as NotificationType,
      title: copy.title,
      message: copy.message({ device: b.device, ip: b.ip, location: b.location }),
      actionUrl: "/security",
      metadata: {
        kind: `security-${b.event}`,
        event: b.event,
        device: b.device,
        ip: b.ip,
        location: b.location,
        notes: b.notes,
      },
    });

    return NextResponse.json({ success: true, notification: notif });
  } catch (e) {
    return apiCatch(e);
  }
}
