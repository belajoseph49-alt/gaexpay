import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — security dashboard: login history, blocked IPs, suspicious activity
export async function GET(req: Request) {
  const auth = await requirePermission(req, "security.view");
  if ("error" in auth) return auth.error;

  // Login history — recent devices & audit logs with "login"
  const recentDevices = await db.device.findMany({
    orderBy: { lastActive: "desc" },
    take: 50,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  // Suspicious activity — recent critical audit logs + flagged transactions
  const suspiciousAudit = await db.auditLog.findMany({
    where: { severity: { in: ["warning", "critical"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  const suspiciousTx = await db.transaction.findMany({
    where: { OR: [{ fraudFlag: true }, { riskScore: { gte: 0.6 } }] },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  // Active sessions — recent devices trusted
  const activeSessions = await db.device.findMany({
    where: { trusted: true, lastActive: { gte: new Date(Date.now() - 7 * 86400000) } },
    orderBy: { lastActive: "desc" },
    take: 30,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  // Blocked accounts
  const blockedAccounts = await db.user.findMany({
    where: { status: { in: ["suspended", "frozen", "closed"] } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true, firstName: true, lastName: true, email: true, status: true, role: true,
      lastLoginAt: true, updatedAt: true,
    },
  });

  // Stats
  const totalLogins = await db.device.count();
  const totalSuspicious = suspiciousAudit.length + suspiciousTx.length;
  const totalBlocked = blockedAccounts.length;
  const twoFAUsers = await db.user.count({ where: { mfaEnabled: true } });
  const totalUsers = await db.user.count();

  // Audit logins (action contains 'login')
  const loginAudit = await db.auditLog.findMany({
    where: { action: { contains: "login" } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  return NextResponse.json({
    loginHistory: loginAudit,
    recentDevices,
    suspiciousAudit,
    suspiciousTx,
    activeSessions,
    blockedAccounts,
    stats: {
      totalLogins,
      totalSuspicious,
      totalBlocked,
      twoFAUsers,
      totalUsers,
      twoFAPercent: totalUsers ? Math.round((twoFAUsers / totalUsers) * 100) : 0,
    },
    fraudRules: [
      { id: 1, name: "Velocity Check", description: "More than 10 transactions in 5 minutes", enabled: true, severity: "high" },
      { id: 2, name: "Geo-Velocity", description: "Login from new country within 1 hour", enabled: true, severity: "high" },
      { id: 3, name: "Large Amount", description: "Transaction > ₦1,000,000", enabled: true, severity: "medium" },
      { id: 4, name: "Late Night", description: "Transactions between 1 AM - 5 AM", enabled: false, severity: "low" },
      { id: 5, name: "Multiple Failed Logins", description: "More than 5 failed login attempts in 10 minutes", enabled: true, severity: "high" },
      { id: 6, name: "New Device", description: "First transaction from a new device", enabled: true, severity: "medium" },
    ],
  });
}

// PATCH — toggle fraud rule (best-effort via AdminMetric) or terminate session
export async function PATCH(req: Request) {
  const auth = await requirePermission(req, "security.audit");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { action, sessionId, ruleId, enabled } = body as {
    action?: "terminate_session" | "toggle_rule";
    sessionId?: string;
    ruleId?: number;
    enabled?: boolean;
  };

  if (action === "terminate_session" && sessionId) {
    // Revoke device trust + set last active to old date
    await db.device.update({
      where: { id: sessionId },
      data: { trusted: false, lastActive: new Date(Date.now() - 365 * 86400000) },
    });
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "session.terminate",
        entity: "Device",
        entityId: sessionId,
        severity: "warning",
        details: JSON.stringify({ by: auth.userId }),
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "toggle_rule" && ruleId !== undefined) {
    await db.adminMetric.upsert({
      where: { key: `fraud_rule_${ruleId}` },
      update: { value: enabled ? 1 : 0, category: "fraud_rule", label: `Fraud Rule ${ruleId}` },
      create: { key: `fraud_rule_${ruleId}`, value: enabled ? 1 : 0, category: "fraud_rule", label: `Fraud Rule ${ruleId}` },
    });
    return NextResponse.json({ success: true, ruleId, enabled });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
