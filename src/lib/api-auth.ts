/**
 * src/lib/api-auth.ts
 *
 * Server-side authentication helpers for GaexPay API routes.
 *
 * Authentication precedence (most-trusted first):
 *   1. `Authorization: Bearer <jwt>`      — verified via `verifyToken`
 *   2. `x-gxp-user: <userId>`             — dev-mode only, falls through
 *   3. `DEMO_USER_ID`                     — dev-mode ONLY (NODE_ENV !== "production")
 *
 * In production, if none of (1) yields a valid user, the request is rejected
 * with 401. The demo user fallback NEVER runs in production.
 */

import { NextResponse } from "next/server";
import { verifyToken, DEMO_USER_ID } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePermissions, hasPermission } from "@/lib/rbac";

const isProd = process.env.NODE_ENV === "production";

/**
 * Extract the authenticated user id from a Request.
 *
 * Returns the user id on success, or `null` if the request is unauthenticated.
 * Callers should use `requireAuth` (below) for the standard "401 on failure"
 * flow.
 */
export function getAuthUserId(req: Request): string | null {
  // 1. Bearer token — preferred path in all environments.
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader) {
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match) {
      const token = match[1].trim();
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) return decoded.userId;
      // Invalid token: in production, stop here. In dev, fall through to
      // the dev fallbacks so demo requests still work with stale tokens.
      if (isProd) return null;
    }
  }

  // 2. gxp_token cookie (set by /api/auth/login, /signup, /demo). Lets the
  //    authenticated SPA call APIs without manually attaching an
  //    Authorization header. Treated identically to the Bearer token —
  //    production rejects on invalid signature, dev falls through.
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieMatch = /(?:^|;\s*)gxp_token=([^;]+)/.exec(cookieHeader);
  if (cookieMatch) {
    const decoded = verifyToken(cookieMatch[1]);
    if (decoded?.userId) return decoded.userId;
    if (isProd) return null;
  }

  // 3. Dev-mode `x-gxp-user` header — used by the demo SPA + browser tools.
  if (!isProd) {
    const devUserHeader = req.headers.get("x-gxp-user");
    if (devUserHeader && /^[a-zA-Z0-9_-]{10,40}$/.test(devUserHeader)) {
      return devUserHeader;
    }
  }

  // 4. Demo fallback — dev-mode ONLY. Lets the seeded SPA call APIs without
  //    a login flow while we migrate to real NextAuth.
  if (!isProd) {
    return DEMO_USER_ID;
  }

  return null;
}

/**
 * Discriminated union returned by `requireAuth` — either a resolved userId
 * or a pre-built 401 NextResponse that the caller should return immediately.
 */
export type AuthResult =
  | { userId: string }
  | { error: NextResponse };

/**
 * Require authentication on an API route. Returns either `{ userId }` to
 * continue handling, or `{ error }` which the caller returns as-is.
 *
 * Usage:
 *   const auth = requireAuth(req);
 *   if ("error" in auth) return auth.error;
 *   const userId = auth.userId;
 */
export function requireAuth(req: Request): AuthResult {
  const userId = getAuthUserId(req);
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { userId };
}

/**
 * Extract a stable client identifier for rate limiting. Prefers the
 * `x-forwarded-for` chain (set by the gateway/proxy), then falls back to
 * the authenticated user id, then to a literal "anonymous". This means
 * authenticated users are always limited per-user, while anonymous
 * requests are limited per source IP.
 */
export function getClientIdentifier(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp.trim()}`;
  return "anonymous";
}

// ============================================================
// RBAC helpers — role & permission checks for API routes.
// ============================================================

export interface AuthUser {
  id: string;
  role: string;
  permissions: string[];
  accountType: string;
  status: string;
}

export type RoleAuthResult =
  | { userId: string; user: AuthUser }
  | { error: NextResponse };

/**
 * Require that the authenticated user has one of the given roles (or the
 * wildcard permission "*"). Returns `{ userId, user }` on success, or
 * `{ error }` which the caller should return immediately.
 *
 * Usage:
 *   const auth = await requireRole(req, ["admin", "super_admin"]);
 *   if ("error" in auth) return auth.error;
 *   const { userId, user } = auth;
 */
export async function requireRole(req: Request, roles: string[]): Promise<RoleAuthResult> {
  const userId = getAuthUserId(req);
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      permissions: true,
      accountType: true,
      status: true,
    },
  });

  if (!dbUser) {
    return {
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }
  if (dbUser.status !== "active") {
    return {
      error: NextResponse.json({ error: "Account suspended" }, { status: 403 }),
    };
  }

  const userPermissions = parsePermissions(dbUser.permissions);
  const hasAccess = roles.includes(dbUser.role) || userPermissions.includes("*");

  if (!hasAccess) {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions", requiredRoles: roles },
        { status: 403 },
      ),
    };
  }

  return {
    userId,
    user: {
      id: dbUser.id,
      role: dbUser.role,
      permissions: userPermissions,
      accountType: dbUser.accountType,
      status: dbUser.status,
    },
  };
}

/**
 * Require that the authenticated user has a specific permission (or the
 * wildcard permission "*"). Returns `{ userId, user }` on success, or
 * `{ error }` which the caller should return immediately.
 *
 * Usage:
 *   const auth = await requirePermission(req, "users.delete");
 *   if ("error" in auth) return auth.error;
 */
export async function requirePermission(
  req: Request,
  permission: string,
): Promise<RoleAuthResult> {
  const userId = getAuthUserId(req);
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      permissions: true,
      accountType: true,
      status: true,
    },
  });

  if (!dbUser) {
    return {
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }
  if (dbUser.status !== "active") {
    return {
      error: NextResponse.json({ error: "Account suspended" }, { status: 403 }),
    };
  }

  const userPermissions = parsePermissions(dbUser.permissions);
  if (!hasPermission(userPermissions, permission)) {
    return {
      error: NextResponse.json(
        { error: "Insufficient permissions", requiredPermission: permission },
        { status: 403 },
      ),
    };
  }

  return {
    userId,
    user: {
      id: dbUser.id,
      role: dbUser.role,
      permissions: userPermissions,
      accountType: dbUser.accountType,
      status: dbUser.status,
    },
  };
}
