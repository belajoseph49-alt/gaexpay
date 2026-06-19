import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function ref() {
  return "GXP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getNextRun(frequency: string, from: Date): Date {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
}

/** GET /api/scheduled-transfers — list scheduled transfers + auto-process due ones. */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const transfers = await db.scheduledTransfer.findMany({
      where: { userId },
      orderBy: { nextRunAt: "asc" },
    });

    // Auto-process any due transfers (nextRunAt <= now)
    const now = new Date();
    const processed: { transfer: unknown; tx: unknown }[] = [];
    for (const t of transfers) {
      if (t.status === "active" && new Date(t.nextRunAt) <= now) {
        // Create a transaction for this scheduled run
        const tx = await db.transaction.create({
          data: {
            reference: ref(),
            userId,
            senderId: userId,
            type: "transfer",
            direction: "debit",
            status: "completed",
            amount: t.amount,
            fee: t.method === "bank" ? Math.min(t.amount * 0.005, 5000) : t.method === "momo" ? t.amount * 0.01 : 0,
            currency: t.currency,
            description: t.note || `Scheduled transfer to ${t.recipientName}`,
            category: "p2p",
            counterpartyName: t.recipientName,
            counterpartyAccount: t.recipientAccount,
            counterpartyBank: t.recipientBank,
            method: t.method,
            provider: t.provider,
            completedAt: now,
          },
        });

        // Create notification
        await db.notification.create({
          data: {
            userId,
            title: "Scheduled transfer executed",
            message: `${t.currency} ${t.amount.toLocaleString()} sent to ${t.recipientName} automatically.`,
            type: "transaction",
            channel: "push",
          },
        });

        // Audit-log the automated run.
        await db.auditLog.create({
          data: {
            userId,
            actor: "system",
            action: "scheduled_transfer.execute",
            entity: "transaction",
            entityId: tx.id,
            ip: clientIp(req),
            userAgent: req.headers.get("user-agent") || null,
            details: JSON.stringify({
              scheduledTransferId: t.id,
              reference: tx.reference,
              amount: t.amount,
              currency: t.currency,
              recipient: t.recipientName,
            }),
            severity: "info",
          },
        });

        // Update the scheduled transfer
        const nextRun = t.frequency === "once" ? null : getNextRun(t.frequency, now);
        const updated = await db.scheduledTransfer.update({
          where: { id: t.id },
          data: {
            lastRunAt: now,
            nextRunAt: nextRun || now,
            totalRuns: { increment: 1 },
            status: t.frequency === "once" ? "completed" : "active",
          },
        });
        processed.push({ transfer: updated, tx });
      }
    }

    const finalTransfers = processed.length > 0
      ? await db.scheduledTransfer.findMany({ where: { userId }, orderBy: { nextRunAt: "asc" } })
      : transfers;

    const totalMonthly = finalTransfers
      .filter((t) => t.status === "active" && t.frequency === "monthly")
      .reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      transfers: finalTransfers,
      totalMonthly,
      processed: processed.length,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/** POST /api/scheduled-transfers — schedule a recurring transfer (money-moving!). */
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
      recipientName?: string; recipientAccount?: string; recipientBank?: string;
      method?: string; provider?: string; amount?: number | string;
      currency?: string; note?: string; frequency?: string; nextRunAt?: string;
    };
    if (!b.recipientName || !b.recipientAccount || !b.amount || !b.frequency || !b.nextRunAt) {
      return apiError("Missing required fields", 400);
    }
    const amt = Number(b.amount);
    if (!isFinite(amt) || amt <= 0) return apiError("Amount must be positive", 400);

    const transfer = await db.scheduledTransfer.create({
      data: {
        userId,
        recipientName: b.recipientName,
        recipientAccount: b.recipientAccount,
        recipientBank: b.recipientBank,
        method: b.method || "wallet",
        provider: b.provider,
        amount: amt,
        currency: b.currency || "NGN",
        note: b.note,
        frequency: b.frequency,
        nextRunAt: new Date(b.nextRunAt),
        status: "active",
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "scheduled_transfer.create",
        entity: "scheduled_transfer",
        entityId: transfer.id,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({
          recipient: b.recipientName,
          amount: amt,
          currency: b.currency || "NGN",
          frequency: b.frequency,
          nextRunAt: b.nextRunAt,
        }),
        severity: "info",
      },
    });

    return NextResponse.json({ transfer });
  } catch (e) {
    return apiCatch(e);
  }
}

/** PATCH /api/scheduled-transfers — pause/resume/cancel a scheduled transfer. */
export async function PATCH(req: Request) {
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
    const b = (body ?? {}) as { id?: string; status?: string };
    if (!b.id) return apiError("id required", 400);

    const existing = await db.scheduledTransfer.findFirst({ where: { id: b.id, userId } });
    if (!existing) return apiError("Scheduled transfer not found", 404);

    const transfer = await db.scheduledTransfer.update({
      where: { id: b.id },
      data: { ...(b.status && { status: b.status }) },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "scheduled_transfer.update",
        entity: "scheduled_transfer",
        entityId: transfer.id,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ previousStatus: existing.status, newStatus: b.status }),
        severity: b.status === "cancelled" ? "warning" : "info",
      },
    });

    return NextResponse.json({ transfer });
  } catch (e) {
    return apiCatch(e);
  }
}

/** DELETE /api/scheduled-transfers?id=... — cancel + remove a scheduled transfer. */
export async function DELETE(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return apiError("id required", 400);

    const existing = await db.scheduledTransfer.findFirst({ where: { id, userId } });
    if (!existing) return apiError("Scheduled transfer not found", 404);

    await db.scheduledTransfer.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "scheduled_transfer.delete",
        entity: "scheduled_transfer",
        entityId: id,
        ip: clientIp(req),
        userAgent: req.headers.get("user-agent") || null,
        severity: "warning",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
