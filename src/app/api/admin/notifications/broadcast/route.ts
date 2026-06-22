import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// POST — broadcast a notification platform-wide or to a segment
export async function POST(req: Request) {
  const auth = await requirePermission(req, "notifications.send");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const {
    title,
    message,
    type = "info",
    channel = "in_app",
    segment = "all",
    actionUrl,
  } = body as {
    title?: string;
    message?: string;
    type?: string;
    channel?: string;
    segment?: string;
    actionUrl?: string;
  };

  if (!title || !message) {
    return NextResponse.json({ error: "title and message are required" }, { status: 400 });
  }

  // Build user filter based on segment
  const where: Record<string, unknown> = { status: "active" };
  if (segment === "personal") where.accountType = "personal";
  else if (segment === "business") where.accountType = "business";
  else if (segment === "unverified") where.kycStatus = "unverified";
  else if (segment === "pending_kyc") where.kycStatus = "pending";
  else if (segment === "verified") where.kycStatus = "verified";

  const users = await db.user.findMany({ where, select: { id: true } });

  // Create a notification per user (for reasonable batch sizes)
  const data = users.map((u) => ({
    userId: u.id,
    title,
    message,
    type,
    channel,
    actionUrl: actionUrl ?? null,
  }));

  // Split into chunks to avoid huge inserts
  const CHUNK = 500;
  let created = 0;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    await db.notification.createMany({ data: chunk });
    created += chunk.length;
  }

  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "notification.broadcast",
      entity: "Notification",
      severity: "info",
      details: JSON.stringify({ title, segment, channel, count: created }),
    },
  });

  return NextResponse.json({ success: true, recipients: created });
}
