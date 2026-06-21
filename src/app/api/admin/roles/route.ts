import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { ROLES, PERMISSIONS, getRolePermissions, type Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// GET — list all roles with their default permission sets + users count
export async function GET(req: Request) {
  const auth = await requirePermission(req, "roles.view");
  if ("error" in auth) return auth.error;

  // Get user counts per role
  const roleCountsRaw = await db.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });
  const counts: Record<string, number> = {};
  for (const r of roleCountsRaw) counts[r.role] = r._count.role;

  const roles = ROLES.map((r) => ({
    ...r,
    permissions: getRolePermissions(r.value as Role),
    userCount: counts[r.value] ?? 0,
  }));

  // Build permission matrix
  const matrix = PERMISSIONS.map((p) => ({
    permission: p,
    roles: ROLES.reduce<Record<string, boolean>>((acc, r) => {
      acc[r.value] = r.value === "super_admin" ? true : getRolePermissions(r.value as Role).includes(p);
      return acc;
    }, {}),
  }));

  // All permissions grouped
  const grouped: Record<string, string[]> = {};
  for (const p of PERMISSIONS) {
    const domain = p.split(".")[0];
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(p);
  }

  return NextResponse.json({ roles, permissions: PERMISSIONS, matrix, grouped });
}

// PATCH — assign a role to a user (optionally with custom permissions)
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "roles.assign");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { userId, role, permissions } = body as {
    userId?: string;
    role?: Role;
    permissions?: string[];
  };

  if (!userId || !role) return NextResponse.json({ error: "userId and role required" }, { status: 400 });

  const validRoles = ["super_admin", "admin", "moderator", "support", "financial_manager", "kyc_manager", "marketplace_manager", "content_manager", "user"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only super_admin can assign super_admin
  if (role === "super_admin" && auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can grant super_admin" }, { status: 403 });
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Block demoting super_admins unless caller is super_admin
  if (target.role === "super_admin" && auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Cannot modify a super admin" }, { status: 403 });
  }

  const perms = permissions && Array.isArray(permissions)
    ? JSON.stringify(permissions)
    : (role === "user" ? "[]" : JSON.stringify(getRolePermissions(role)));

  await db.user.update({
    where: { id: userId },
    data: { role, permissions: perms },
  });

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "role.assign",
      entity: "User",
      entityId: userId,
      severity: "warning",
      details: JSON.stringify({ from: target.role, to: role }),
    },
  });

  return NextResponse.json({ success: true, role, permissions: JSON.parse(perms) });
}
