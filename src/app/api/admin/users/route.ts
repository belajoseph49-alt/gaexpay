import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { getRolePermissions, type Role } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET — list users with filters (admin only)
export async function GET(req: Request) {
  const auth = await requirePermission(req, "users.view");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status");
  const role = searchParams.get("role");
  const accountType = searchParams.get("accountType");
  const kycStatus = searchParams.get("kycStatus");
  const limit = Number(searchParams.get("limit") ?? 200);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q } }, { lastName: { contains: q } },
      { email: { contains: q } }, { phone: { contains: q } }, { username: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;
  if (role && role !== "all") where.role = role;
  if (accountType && accountType !== "all") where.accountType = accountType;
  if (kycStatus && kycStatus !== "all") where.kycStatus = kycStatus;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      country: true, kycStatus: true, kycTier: true, status: true, role: true,
      accountType: true, permissions: true,
      createdAt: true, lastLoginAt: true, referralCount: true, rewardPoints: true,
    },
  });
  return NextResponse.json({ users });
}

// PATCH — edit user (status, role, accountType, reset password)
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "edit";

  let perm: string;
  switch (action) {
    case "suspend":
    case "activate":
      perm = "users.suspend";
      break;
    case "role":
      perm = "roles.assign";
      break;
    case "password":
      perm = "users.edit";
      break;
    default:
      perm = "users.edit";
  }
  const auth = await requirePermission(req, perm);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { userId } = body as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Block demoting / suspending other super_admins unless caller is super_admin
  if (target.role === "super_admin" && auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "Cannot modify a super admin" }, { status: 403 });
  }

  const audit = (action_name: string, details: Record<string, unknown>) =>
    db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: `${auth.user.role}`,
        action: action_name,
        entity: "User",
        entityId: userId,
        severity: action_name.startsWith("suspend") || action_name.startsWith("delete") ? "warning" : "info",
        details: JSON.stringify(details),
      },
    });

  if (action === "suspend") {
    await db.user.update({ where: { id: userId }, data: { status: "suspended" } });
    await audit("user.suspend", { by: auth.userId });
    return NextResponse.json({ success: true, status: "suspended" });
  }

  if (action === "activate") {
    await db.user.update({ where: { id: userId }, data: { status: "active" } });
    await audit("user.activate", { by: auth.userId });
    return NextResponse.json({ success: true, status: "active" });
  }

  if (action === "role") {
    const { role } = body as { role?: Role };
    const validRoles = ["super_admin", "admin", "moderator", "support", "financial_manager", "kyc_manager", "marketplace_manager", "content_manager", "user"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // Don't allow non-super admins to escalate to super_admin
    if (role === "super_admin" && auth.user.role !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can grant super_admin" }, { status: 403 });
    }
    const perms = role === "user" ? "[]" : JSON.stringify(getRolePermissions(role));
    await db.user.update({ where: { id: userId }, data: { role, permissions: perms } });
    await audit("user.role_change", { from: target.role, to: role });
    return NextResponse.json({ success: true, role, permissions: JSON.parse(perms) });
  }

  if (action === "password") {
    const { newPassword } = body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const passwordHash = await hashPassword(newPassword);
    await db.user.update({ where: { id: userId }, data: { passwordHash, resetToken: null, resetTokenExpiry: null } });
    await audit("user.password_reset", { by: auth.userId });
    return NextResponse.json({ success: true });
  }

  // Default edit — update basic fields
  const { firstName, lastName, email, phone, country, accountType, kycStatus, kycTier } = body;
  const updates: Record<string, unknown> = {};
  if (typeof firstName === "string") updates.firstName = firstName;
  if (typeof lastName === "string") updates.lastName = lastName;
  if (typeof email === "string") updates.email = email;
  if (typeof phone === "string") updates.phone = phone;
  if (typeof country === "string") updates.country = country;
  if (typeof accountType === "string") updates.accountType = accountType;
  if (typeof kycStatus === "string") updates.kycStatus = kycStatus;
  if (typeof kycTier === "number") updates.kycTier = kycTier;

  await db.user.update({ where: { id: userId }, data: updates });
  await audit("user.edit", { fields: Object.keys(updates) });
  return NextResponse.json({ success: true });
}

// DELETE — soft delete (set status=closed)
export async function DELETE(req: Request) {
  const auth = await requirePermission(req, "users.delete");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role === "super_admin") {
    return NextResponse.json({ error: "Cannot delete a super admin" }, { status: 403 });
  }

  await db.user.update({ where: { id: userId }, data: { status: "closed" } });
  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "user.delete",
      entity: "User",
      entityId: userId,
      severity: "critical",
      details: JSON.stringify({ by: auth.userId }),
    },
  });
  return NextResponse.json({ success: true });
}
