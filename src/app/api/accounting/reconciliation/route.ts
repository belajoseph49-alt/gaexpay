import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounting/reconciliation — daily reconciliation report for the
 * authenticated user. Aggregates:
 *   - Total volume per currency
 *   - Total fees collected
 *   - Failed transactions (count + total amount)
 *   - Refunded transactions
 *   - Disputed transactions
 *   - Net settlement amount (what GaexPay owes / is owed)
 *   - Wallet balance totals by currency (sum of all user wallets)
 *   - Unreconciled transactions (completed but no audit log)
 *
 * Query params:
 *   ?date=2026-06-19   — single-day report (defaults to today UTC)
 *   ?from=&to=         — explicit range (overrides `date`)
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const today = new Date();
    const dateParam = searchParams.get("date");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    let from: Date;
    let to: Date;
    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
    } else if (dateParam) {
      from = new Date(dateParam);
      to = new Date(dateParam);
    } else {
      // Default to today's UTC day.
      from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      to = new Date(from);
    }
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return apiError("Invalid date", 400);
    }
    // Stretch `to` to end-of-day so the upper bound is inclusive.
    to.setHours(23, 59, 59, 999);

    const txs = await db.transaction.findMany({
      where: { userId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "asc" },
    });

    // Wallet balances for this user.
    const wallets = await db.wallet.findMany({
      where: { userId },
      select: { id: true, currency: true, balance: true, ledgerBalance: true, label: true, type: true },
    });

    // All audit log entity IDs for this user in range (used to compute
    // "unreconciled transactions" = completed txs with no audit trail).
    const txIds = txs.map((t) => t.id);
    const auditLogs = txIds.length
      ? await db.auditLog.findMany({
          where: { entity: "transaction", entityId: { in: txIds } },
          select: { entityId: true, action: true, createdAt: true },
        })
      : [];

    const auditedTxIds = new Set(auditLogs.map((a) => a.entityId).filter(Boolean) as string[]);

    // Disputes in range.
    const disputes = await db.dispute.findMany({
      where: { userId, createdAt: { gte: from, lte: to } },
      select: { id: true, transactionRef: true, reason: true, status: true, priority: true, createdAt: true },
    });

    // Aggregates.
    const volumeByCurrency: Record<string, number> = {};
    const feesByCurrency: Record<string, number> = {};
    const feesByType: Record<string, number> = {};
    const volumeByType: Record<string, number> = {};
    const volumeByStatus: Record<string, number> = {};
    let totalVolume = 0;
    let totalFees = 0;
    let failedCount = 0;
    let failedAmount = 0;
    let refundedCount = 0;
    let refundedAmount = 0;
    let disputedCount = disputes.length;
    let creditVolume = 0;
    let debitVolume = 0;
    let completedCount = 0;

    const unreconciled: Array<{
      reference: string;
      amount: number;
      currency: string;
      type: string;
      description: string;
      createdAt: string;
    }> = [];

    for (const t of txs) {
      const amt = t.amount;
      totalVolume += amt;
      volumeByCurrency[t.currency] = (volumeByCurrency[t.currency] ?? 0) + amt;
      feesByCurrency[t.currency] = (feesByCurrency[t.currency] ?? 0) + (t.fee || 0);
      feesByType[t.type] = (feesByType[t.type] ?? 0) + (t.fee || 0);
      volumeByType[t.type] = (volumeByType[t.type] ?? 0) + 1;
      volumeByStatus[t.status] = (volumeByStatus[t.status] ?? 0) + 1;
      totalFees += t.fee || 0;

      if (t.direction === "credit") creditVolume += amt;
      else debitVolume += amt;

      if (t.status === "completed") completedCount += 1;
      if (t.status === "failed") {
        failedCount += 1;
        failedAmount += amt;
      }
      if (t.status === "reversed") {
        refundedCount += 1;
        refundedAmount += amt;
      }
      if (t.status === "completed" && !auditedTxIds.has(t.id)) {
        unreconciled.push({
          reference: t.reference,
          amount: t.amount,
          currency: t.currency,
          type: t.type,
          description: t.description,
          createdAt: t.createdAt.toISOString(),
        });
      }
    }

    // Net settlement = credits the user received (GaexPay owes them money /
    //   custody on their behalf) minus debits they sent (already settled out).
    // A positive settlement means the platform is net long the user; negative
    // means the user is net long the platform.
    const netSettlement = creditVolume - debitVolume;

    // Wallet totals by currency.
    const walletTotalsByCurrency: Record<string, { balance: number; ledger: number; count: number }> = {};
    for (const w of wallets) {
      const c = walletTotalsByCurrency[w.currency] ?? { balance: 0, ledger: 0, count: 0 };
      c.balance += w.balance;
      c.ledger += w.ledgerBalance;
      c.count += 1;
      walletTotalsByCurrency[w.currency] = c;
    }

    // Reconciliation health score — simple heuristic:
    //   100 - (failed + unreconciled) / total * 100, floored at 0.
    const reconciliationHealth = txs.length
      ? Math.max(0, Math.round(100 - ((failedCount + unreconciled.length) / txs.length) * 100))
      : 100;

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: new Date().toISOString(),
      totals: {
        transactionCount: txs.length,
        completedCount,
        totalVolume,
        totalFees,
        failedCount,
        failedAmount,
        refundedCount,
        refundedAmount,
        disputedCount,
        creditVolume,
        debitVolume,
        netSettlement,
        unreconciledCount: unreconciled.length,
      },
      volumeByCurrency,
      volumeByType,
      volumeByStatus,
      feesByCurrency,
      feesByType,
      walletTotalsByCurrency: Object.entries(walletTotalsByCurrency).map(([currency, v]) => ({
        currency,
        balance: v.balance,
        ledgerBalance: v.ledger,
        walletCount: v.count,
      })),
      wallets: wallets.map((w) => ({
        id: w.id,
        currency: w.currency,
        balance: w.balance,
        ledgerBalance: w.ledgerBalance,
        label: w.label,
        type: w.type,
      })),
      disputes: disputes.map((d) => ({
        id: d.id,
        transactionRef: d.transactionRef,
        reason: d.reason,
        status: d.status,
        priority: d.priority,
        createdAt: d.createdAt.toISOString(),
      })),
      unreconciled,
      reconciliationHealth,
      isBalanced: unreconciled.length === 0 && failedCount === 0,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
