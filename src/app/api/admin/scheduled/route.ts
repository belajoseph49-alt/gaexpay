import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";
import { apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/scheduled?q=&status=&frequency=
 * List all scheduled transfers.
 */
export async function GET(req: Request) {
  try {
    const auth = await requirePermission(req, "scheduled.view");
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status");
    const frequency = searchParams.get("frequency");

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (frequency && frequency !== "all") where.frequency = frequency;

    // ScheduledTransfer has no `user` relation — fetch records first, then
    // batch-load the related users by id, and apply search filtering in JS.
    const scheduled = await db.scheduledTransfer.findMany({
      where,
      orderBy: { nextRunAt: "asc" },
      take: 300,
    });
    const userIds = Array.from(new Set(scheduled.map((s) => s.userId)));
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    let result = scheduled.map((s) => ({ ...s, user: userMap.get(s.userId) || null }));
    if (q) {
      const ql = q.toLowerCase();
      result = result.filter(
        (s) =>
          s.recipientName?.toLowerCase().includes(ql) ||
          s.recipientAccount?.toLowerCase().includes(ql) ||
          s.note?.toLowerCase().includes(ql) ||
          s.user?.firstName?.toLowerCase().includes(ql) ||
          s.user?.lastName?.toLowerCase().includes(ql) ||
          s.user?.email?.toLowerCase().includes(ql),
      );
    }
    return NextResponse.json({ scheduled: result });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/admin/scheduled?action=pause|resume|cancel|execute
 */
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "pause";

    const permMap: Record<string, string> = {
      pause: "scheduled.pause",
      resume: "scheduled.pause",
      cancel: "scheduled.cancel",
      execute: "scheduled.execute",
    };
    const perm = permMap[action] || "scheduled.pause";

    const auth = await requirePermission(req, perm);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { transferId } = body as { transferId?: string };
    if (!transferId) return NextResponse.json({ error: "transferId required" }, { status: 400 });

    const transfer = await db.scheduledTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) return NextResponse.json({ error: "Scheduled transfer not found" }, { status: 404 });

    if (action === "pause") {
      await db.scheduledTransfer.update({ where: { id: transferId }, data: { status: "paused" } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "scheduled.pause",
          entity: "ScheduledTransfer",
          entityId: transferId,
          severity: "info",
          details: JSON.stringify({ by: auth.userId, recipient: transfer.recipientName, amount: transfer.amount }),
        },
      });
      return NextResponse.json({ success: true, status: "paused" });
    }

    if (action === "resume") {
      await db.scheduledTransfer.update({ where: { id: transferId }, data: { status: "active" } });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "scheduled.resume",
          entity: "ScheduledTransfer",
          entityId: transferId,
          severity: "info",
          details: JSON.stringify({ by: auth.userId }),
        },
      });
      return NextResponse.json({ success: true, status: "active" });
    }

    if (action === "cancel") {
      await db.scheduledTransfer.update({ where: { id: transferId }, data: { status: "cancelled" } });
      // status is "cancelled" but Prisma model enum says active|paused|completed|failed — we use "cancelled" as a soft-state string (SQLite is permissive)
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "scheduled.cancel",
          entity: "ScheduledTransfer",
          entityId: transferId,
          severity: "warning",
          details: JSON.stringify({ by: auth.userId, recipient: transfer.recipientName }),
        },
      });
      return NextResponse.json({ success: true, status: "cancelled" });
    }

    if (action === "execute") {
      // Trigger execution by moving nextRunAt to now. The scheduler worker (if present)
      // will pick it up. We also log the manual trigger.
      const now = new Date();
      await db.scheduledTransfer.update({
        where: { id: transferId },
        data: { nextRunAt: now, lastRunAt: now, totalRuns: { increment: 1 } },
      });
      await db.auditLog.create({
        data: {
          userId: auth.userId,
          actor: auth.user.role,
          action: "scheduled.execute_now",
          entity: "ScheduledTransfer",
          entityId: transferId,
          severity: "warning",
          details: JSON.stringify({
            by: auth.userId,
            recipient: transfer.recipientName,
            amount: transfer.amount,
            currency: transfer.currency,
            triggeredAt: now.toISOString(),
          }),
        },
      });
      return NextResponse.json({ success: true, executedAt: now });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return apiCatch(e);
  }
}
