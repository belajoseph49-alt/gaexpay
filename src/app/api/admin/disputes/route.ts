// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — list all disputes
export async function GET(req: Request) {
  const auth = await requirePermission(req, "disputes.view");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;

  const disputes = await db.dispute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      transaction: {
        select: { id: true, reference: true, amount: true, currency: true, type: true, status: true },
      },
    },
  });

  // Stats
  const all = await db.dispute.groupBy({ by: ["status"], _count: { status: true } });
  const stats: Record<string, number> = {};
  for (const a of all) stats[a.status] = a._count.status;

  return NextResponse.json({ disputes, stats });
}

// PATCH — assign / resolve / close
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "resolve";

  const perm = action === "assign" ? "disputes.assign" : "disputes.resolve";
  const auth = await requirePermission(req, perm);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { disputeId, status, resolution, assignedTo } = body as {
    disputeId?: string;
    status?: string;
    resolution?: string;
    assignedTo?: string;
  };

  if (!disputeId) return NextResponse.json({ error: "disputeId required" }, { status: 400 });

  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (resolution) updates.resolution = resolution;
  // assignedTo is not a direct field on Dispute — store in metadata via resolution note
  if (assignedTo && !resolution) updates.resolution = `Assigned to: ${assignedTo}`;
  if (status === "resolved" || status === "rejected" || status === "refunded") {
    updates.resolvedAt = new Date();
  }

  await db.dispute.update({ where: { id: disputeId }, data: updates });

  // Notify the user
  if (status) {
    const titleMap: Record<string, string> = {
      resolved: "Dispute Resolved",
      rejected: "Dispute Rejected",
      refunded: "Dispute Refunded",
      under_review: "Dispute Under Review",
    };
    if (titleMap[status]) {
      await db.notification.create({
        data: {
          userId: dispute.userId,
          title: titleMap[status],
          message: resolution || `Your dispute has been updated to ${status}.`,
          type: status === "rejected" ? "warning" : "info",
          channel: "in_app",
        },
      });
    }
  }

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: `dispute.${action}`,
      entity: "Dispute",
      entityId: disputeId,
      severity: "info",
      details: JSON.stringify({ status, resolution }),
    },
  });

  return NextResponse.json({ success: true });
}
