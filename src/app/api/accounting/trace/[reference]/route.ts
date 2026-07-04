import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function safeParse(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toISO(d: Date | string | null): string | null {
  if (!d) return null;
  return typeof d === "string" ? d : d.toISOString();
}

type TimelineEvent = {
  id: string;
  action: string;
  actor: string;
  severity: "info" | "warning" | "critical" | "success" | "neutral";
  source: "audit" | "notification" | "dispute" | "scheduled" | "system";
  timestamp: string;
  details: unknown;
};

function notificationSeverity(type: string): TimelineEvent["severity"] {
  switch (type) {
    case "success":
    case "transaction":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "critical";
    case "security":
      return "warning";
    default:
      return "neutral";
  }
}

/**
 * GET /api/accounting/trace/[reference] — full traceability report for a
 * single transaction, including:
 *   - Transaction details (amount, fee, counterparty, method, risk, metadata)
 *   - Related audit logs (every action that touched this tx)
 *   - Related notifications (matched by reference in metadata/message)
 *   - Related support tickets (matched by subject line)
 *   - Related scheduled transfer (matched by amount + counterparty + currency)
 *   - Wallet balances before/after (computed from tx history of the user's
 *     wallet in the same currency)
 *   - Risk assessment (riskScore + fraudFlag + severity classification)
 */
export async function GET(req: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { reference } = await params;
    if (!reference) return apiError("Reference required", 400);

    const tx = await db.transaction.findFirst({
      where: { reference },
    });
    if (!tx) return apiError("Transaction not found", 404);

    // Run all related queries in parallel for speed.
    const [auditLogs, notifications, supportTickets, scheduled, walletTxs, userWallets] = await Promise.all([
      db.auditLog.findMany({
        where: {
          OR: [
            { entityId: tx.id, entity: "transaction" },
            // Catch audit logs whose details mention this reference (older rows).
            { details: { contains: tx.reference } },
          ],
        },
        orderBy: { createdAt: "asc" },
      }),
      db.notification.findMany({
        where: {
          OR: [
            { message: { contains: tx.reference } },
            { metadata: { contains: tx.reference } },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      db.supportTicket.findMany({
        where: {
          OR: [
            { subject: { contains: tx.reference } },
            { subject: { contains: tx.reference.slice(0, 12) } },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      // Find a scheduled transfer that may have spawned this transaction:
      // match by amount + currency + counterparty name.
      db.scheduledTransfer.findFirst({
        where: {
          userId: tx.userId,
          amount: tx.amount,
          currency: tx.currency,
          recipientName: tx.counterpartyName ?? undefined,
        },
        orderBy: { createdAt: "desc" },
      }),
      // Wallet ledger: all transactions in the same currency for that user,
      // ordered by time so we can compute before/after balances.
      db.transaction.findMany({
        where: { userId: tx.userId, currency: tx.currency },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          reference: true,
          amount: true,
          fee: true,
          direction: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      db.wallet.findMany({
        where: { userId: tx.userId, currency: tx.currency },
        select: { id: true, balance: true, ledgerBalance: true, label: true, type: true },
      }),
    ]);

    // Compute wallet balance before/after the traced transaction.
    // "Before" = running sum of all completed credits minus debits up to (but
    // not including) this tx. "After" = before + (this tx signed delta).
    const txTime = tx.createdAt.getTime();
    let balanceBefore = 0;
    let found = false;
    for (const t of walletTxs) {
      const tTime = t.createdAt.getTime();
      const signed =
        t.direction === "credit" ? t.amount : -t.amount - (t.fee || 0);
      if (t.id === tx.id) {
        found = true;
        continue;
      }
      if (tTime < txTime && t.status === "completed") {
        balanceBefore += signed;
      } else if (tTime === txTime && t.status === "completed" && !found) {
        // Same-timestamp txs that aren't this one but came before in ordering.
        balanceBefore += signed;
      }
    }
    const ownSignedDelta =
      tx.direction === "credit" ? tx.amount : -tx.amount - (tx.fee || 0);
    const balanceAfter =
      tx.status === "completed" ? balanceBefore + ownSignedDelta : balanceBefore;

    // Find any disputes linked to this tx (by transactionId or transactionRef).
    const disputes = await db.dispute.findMany({
      where: {
        OR: [{ transactionId: tx.id }, { transactionRef: tx.reference }],
      },
      orderBy: { createdAt: "asc" },
    });

    // Build a unified timeline: audit logs + notifications + disputes +
    // scheduled-transfer execution events, sorted chronologically.
    const timeline: TimelineEvent[] = [];

    for (const a of auditLogs) {
      timeline.push({
        id: a.id,
        action: a.action,
        actor: a.actor,
        severity: (a.severity as TimelineEvent["severity"]) ?? "info",
        source: "audit",
        timestamp: a.createdAt.toISOString(),
        details: safeParse(a.details),
      });
    }
    for (const n of notifications) {
      timeline.push({
        id: n.id,
        action: `notification.${n.type}`,
        actor: "system",
        severity: notificationSeverity(n.type),
        source: "notification",
        timestamp: n.createdAt.toISOString(),
        details: { title: n.title, message: n.message, channel: n.channel },
      });
    }
    for (const d of disputes) {
      timeline.push({
        id: d.id,
        action: `dispute.${d.status}`,
        actor: "user",
        severity: d.priority === "high" ? "warning" : "info",
        source: "dispute",
        timestamp: d.createdAt.toISOString(),
        details: { reason: d.reason, description: d.description, status: d.status, resolution: d.resolution },
      });
    }
    if (scheduled) {
      timeline.push({
        id: `sched-${scheduled.id}`,
        action: "scheduled_transfer.linked",
        actor: "system",
        severity: "info",
        source: "scheduled",
        timestamp: scheduled.createdAt.toISOString(),
        details: {
          scheduledId: scheduled.id,
          frequency: scheduled.frequency,
          nextRunAt: scheduled.nextRunAt.toISOString(),
          lastRunAt: toISO(scheduled.lastRunAt),
          totalRuns: scheduled.totalRuns,
          status: scheduled.status,
        },
      });
    }
    // Always emit two synthetic events so the timeline has at least the
    // initiation + completion steps even when audit logs are missing.
    if (!timeline.some((e) => e.action.includes("initiated") || e.action.includes("transfer.create") || e.action.includes("merchant_pay") || e.action.includes("payment_initiated"))) {
      timeline.push({
        id: `init-${tx.id}`,
        action: "transaction_initiated",
        actor: tx.direction === "credit" ? "system" : "user",
        severity: "info",
        source: "system",
        timestamp: tx.createdAt.toISOString(),
        details: { reference: tx.reference, amount: tx.amount, currency: tx.currency, type: tx.type },
      });
    }
    if (tx.status === "completed" && !timeline.some((e) => e.action.includes("completed"))) {
      timeline.push({
        id: `done-${tx.id}`,
        action: "transaction_completed",
        actor: "system",
        severity: "success",
        source: "system",
        timestamp: (tx.completedAt ?? tx.createdAt).toISOString(),
        details: { reference: tx.reference, status: tx.status },
      });
    }
    if (tx.status === "failed" && !timeline.some((e) => e.action.includes("failed"))) {
      timeline.push({
        id: `fail-${tx.id}`,
        action: "transaction_failed",
        actor: "system",
        severity: "critical",
        source: "system",
        timestamp: (tx.completedAt ?? tx.createdAt).toISOString(),
        details: { reference: tx.reference, status: tx.status },
      });
    }
    timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Risk assessment — translate the numeric riskScore into a tier.
    const riskTier =
      tx.fraudFlag ? "critical"
      : tx.riskScore >= 70 ? "high"
      : tx.riskScore >= 40 ? "medium"
      : "low";

    return NextResponse.json({
      transaction: {
        id: tx.id,
        reference: tx.reference,
        userId: tx.userId,
        senderId: tx.senderId,
        type: tx.type,
        direction: tx.direction,
        status: tx.status,
        amount: tx.amount,
        fee: tx.fee,
        currency: tx.currency,
        description: tx.description,
        category: tx.category,
        counterpartyName: tx.counterpartyName,
        counterpartyAccount: tx.counterpartyAccount,
        counterpartyBank: tx.counterpartyBank,
        method: tx.method,
        provider: tx.provider,
        walletId: tx.walletId,
        riskScore: tx.riskScore,
        fraudFlag: tx.fraudFlag,
        metadata: safeParse(tx.metadata),
        createdAt: tx.createdAt.toISOString(),
        completedAt: toISO(tx.completedAt),
      },
      timeline,
      auditTrail: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actor: a.actor,
        severity: a.severity,
        ip: a.ip,
        userAgent: a.userAgent,
        details: safeParse(a.details),
        timestamp: a.createdAt.toISOString(),
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        channel: n.channel,
        isRead: n.isRead,
        timestamp: n.createdAt.toISOString(),
      })),
      supportTickets: supportTickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      disputes: disputes.map((d) => ({
        id: d.id,
        reason: d.reason,
        description: d.description,
        status: d.status,
        priority: d.priority,
        resolution: d.resolution,
        createdAt: d.createdAt.toISOString(),
        resolvedAt: toISO(d.resolvedAt),
      })),
      scheduledTransfer: scheduled
        ? {
            id: scheduled.id,
            frequency: scheduled.frequency,
            nextRunAt: scheduled.nextRunAt.toISOString(),
            lastRunAt: toISO(scheduled.lastRunAt),
            totalRuns: scheduled.totalRuns,
            status: scheduled.status,
          }
        : null,
      walletImpact: {
        currency: tx.currency,
        before: balanceBefore,
        after: balanceAfter,
        delta: ownSignedDelta,
        feeApplied: tx.fee,
        direction: tx.direction,
        wallets: userWallets.map((w) => ({
          id: w.id,
          label: w.label,
          type: w.type,
          currentBalance: w.balance,
          ledgerBalance: w.ledgerBalance,
        })),
      },
      riskAssessment: {
        riskScore: tx.riskScore,
        fraudFlag: tx.fraudFlag,
        tier: riskTier,
        recommendation:
          riskTier === "critical"
            ? "Block + escalate to compliance team"
            : riskTier === "high"
              ? "Manual review required before settlement"
              : riskTier === "medium"
                ? "Monitor; require enhanced due diligence if recurring"
                : "Within normal risk parameters",
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
