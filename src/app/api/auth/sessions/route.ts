// @ts-nocheck
/**
 * /api/auth/sessions
 *
 * Session management for the authenticated user.
 *
 *  GET    — list active sessions (devices). Each device is one "session" in
 *           our stateless-JWT world: the JWT itself can't be revoked without
 *           a server-side blocklist, but the Device row records what's logged
 *           in from where, and revoking a device signals "force this client
 *           to re-authenticate" by deleting its trusted-device record.
 *
 *  DELETE — revoke one session by id (?id=...) OR all OTHER sessions
 *           (?allOthers=true). The current request's device is identified by
 *           matching the user-agent + IP, and never revoked when "allOthers"
 *           is true (so the user doesn't lock themselves out).
 *
 * Auth required. Rate-limited (sensitive).
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";
import { timeAgo, formatDateTime } from "@/lib/gaexpay";

export const dynamic = "force-dynamic";

interface DeviceRow {
  id: string;
  userId: string;
  name: string;
  type: string;
  os: string | null;
  browser: string | null;
  location: string | null;
  ip: string | null;
  trusted: boolean;
  lastActive: Date;
  createdAt: Date;
}

function shapeDevice(d: DeviceRow, isCurrent: boolean) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    os: d.os,
    browser: d.browser,
    location: d.location,
    ip: d.ip,
    trusted: d.trusted,
    lastActive: d.lastActive,
    lastActiveAgo: timeAgo(d.lastActive),
    lastActiveFormatted: formatDateTime(d.lastActive),
    createdAt: d.createdAt,
    isCurrent,
  };
}

function getCurrentDeviceFingerprint(req: Request): {
  ua: string;
  ip: string;
} {
  const ua = req.headers.get("user-agent") || "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  return { ua, ip };
}

/** GET /api/auth/sessions — list the user's devices (sessions). */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const devices = (await db.device.findMany({
      where: { userId },
      orderBy: { lastActive: "desc" },
    })) as DeviceRow[];

    const { ua, ip } = getCurrentDeviceFingerprint(req);

    // Mark the device whose user-agent + IP match the current request as
    // "current" — that's the session the user is using right now.
    const sessions = devices.map((d) => {
      const sameUA = !!ua && d.browser === ua;
      const sameIP = !!ip && d.ip === ip;
      return shapeDevice(d, sameUA && sameIP);
    });

    const active = sessions.filter(
      (s) => Date.now() - new Date(s.lastActive).getTime() < 30 * 24 * 60 * 60 * 1000,
    ).length;
    const trusted = sessions.filter((s) => s.trusted).length;

    return NextResponse.json({
      sessions,
      total: sessions.length,
      active,
      trusted,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** DELETE /api/auth/sessions?id=... or /api/auth/sessions?allOthers=true */
export async function DELETE(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const allOthers = searchParams.get("allOthers") === "true";

    if (!id && !allOthers) {
      return apiError("Provide ?id=<sessionId> or ?allOthers=true", 400);
    }
    if (id && allOthers) {
      return apiError("Cannot combine ?id= with ?allOthers=true", 400);
    }

    const { ua, ip } = getCurrentDeviceFingerprint(req);

    if (allOthers) {
      // Revoke every device EXCEPT the one matching the current request.
      const all = (await db.device.findMany({
        where: { userId },
      })) as DeviceRow[];
      const toRevoke = all.filter((d) => {
        const sameUA = !!ua && d.browser === ua;
        const sameIP = !!ip && d.ip === ip;
        return !(sameUA && sameIP);
      });

      if (toRevoke.length === 0) {
        return NextResponse.json({ revoked: 0 });
      }

      await db.device.deleteMany({
        where: { id: { in: toRevoke.map((d) => d.id) } },
      });

      await db.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "sessions.revoke_all_others",
          entity: "device",
          ip: ip || null,
          userAgent: ua || null,
          details: JSON.stringify({ revokedCount: toRevoke.length }),
          severity: "warning",
        },
      });

      return NextResponse.json({
        revoked: toRevoke.length,
        remainingCount: all.length - toRevoke.length,
      });
    }

    // Single-session revoke.
    const target = (await db.device.findFirst({
      where: { id, userId },
    })) as DeviceRow | null;
    if (!target) return apiError("Session not found", 404);

    // Don't allow the user to revoke their current session this way (use
    // logout instead) — it's confusing UX.
    const sameUA = !!ua && target.browser === ua;
    const sameIP = !!ip && target.ip === ip;
    if (sameUA && sameIP) {
      return apiError(
        "Cannot revoke your current session — use logout instead.",
        400,
      );
    }

    await db.device.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "sessions.revoke",
        entity: "device",
        entityId: id,
        ip: ip || null,
        userAgent: ua || null,
        details: JSON.stringify({
          deviceName: target.name,
          deviceType: target.type,
        }),
        severity: "warning",
      },
    });

    return NextResponse.json({ revoked: 1 });
  } catch (e) {
    return apiCatch(e);
  }
}
