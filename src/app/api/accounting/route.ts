import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/accounting — double-entry bookkeeping ledger for the authenticated
 * user. Each Transaction is mapped to a debit/credit pair, with related audit
 * logs attached as an audit trail per entry. Summary aggregates cover the
 * requested date range (or last 30 days by default).
 *
 * Query params:
 *   ?from=2026-01-01&to=2026-06-30   — date range (ISO date or YYYY-MM-DD)
 *   ?type=transfer                   — filter by transaction.type
 *   ?currency=NGN                    — filter by transaction.currency
 *   ?status=completed                — filter by transaction.status
 *   ?limit=200                       — max entries (default 500, capped 2000)
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const type = searchParams.get("type");
    const currency = searchParams.get("currency");
    const status = searchParams.get("status");
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 500), 1), 2000);

    // Default range: last 30 days. `to` is end-of-day inclusive.
    const now = new Date();
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - 30 * 86400000);
    const to = toParam ? new Date(toParam) : new Date();
    // Stretch `to` to end-of-day so the upper bound is inclusive.
    to.setHours(23, 59, 59, 999);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return apiError("Invalid date range", 400);
    }

    const where: {
      userId: string;
      createdAt: { gte: Date; lte: Date };
      type?: string;
      currency?: string;
      status?: string;
    } = {
      userId,
      createdAt: { gte: from, lte: to },
    };
    if (type && type !== "all") where.type = type;
    if (currency && currency !== "all") where.currency = currency;
    if (status && status !== "all") where.status = status;

    const [txs, auditLogs] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.auditLog.findMany({
        where: {
          userId,
          entity: "transaction",
          createdAt: { gte: from, lte: to },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          actor: true,
          action: true,
          entityId: true,
          severity: true,
          details: true,
          createdAt: true,
        },
      }),
    ]);

    // Index audit logs by transaction id for O(1) lookup.
    const auditsByEntity = new Map<string, typeof auditLogs>();
    for (const a of auditLogs) {
      if (!a.entityId) continue;
      const arr = auditsByEntity.get(a.entityId) ?? [];
      arr.push(a);
      auditsByEntity.set(a.entityId, arr);
    }

    // Build double-entry ledger entries.
    const entries = txs.map((tx) => {
      const isDebit = tx.direction === "debit";
      const userAccount = `User Wallet ${tx.currency}`;
      const counterpartyLabel = tx.counterpartyName
        ? `${tx.counterpartyName}${tx.counterpartyAccount ? ` (${tx.counterpartyAccount})` : ""}`
        : (tx.provider || tx.method || "External Account");

      return {
        reference: tx.reference,
        date: tx.createdAt.toISOString(),
        type: tx.type,
        description: tx.description,
        // Double-entry: debits increase assets (user wallet outflow),
        // credits reduce them. We mirror that here.
        debitAccount: isDebit ? userAccount : counterpartyLabel,
        creditAccount: isDebit ? counterpartyLabel : userAccount,
        amount: tx.amount,
        fee: tx.fee,
        currency: tx.currency,
        status: tx.status,
        direction: tx.direction,
        counterparty: tx.counterpartyName ?? null,
        counterpartyAccount: tx.counterpartyAccount ?? null,
        counterpartyBank: tx.counterpartyBank ?? null,
        method: tx.method ?? null,
        provider: tx.provider ?? null,
        category: tx.category,
        riskScore: tx.riskScore,
        fraudFlag: tx.fraudFlag,
        completedAt: tx.completedAt?.toISOString() ?? null,
        metadata: tx.metadata ? safeParse(tx.metadata) : null,
        auditTrail: (auditsByEntity.get(tx.id) ?? []).map((a) => ({
          id: a.id,
          action: a.action,
          actor: a.actor,
          severity: a.severity,
          timestamp: a.createdAt.toISOString(),
          details: a.details ? safeParse(a.details) : null,
        })),
      };
    });

    // Summary aggregates.
    let totalDebit = 0;
    let totalCredit = 0;
    let totalFees = 0;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};

    for (const tx of txs) {
      const amt = tx.amount;
      if (tx.direction === "debit") totalDebit += amt;
      else totalCredit += amt;
      totalFees += tx.fee || 0;
      byType[tx.type] = (byType[tx.type] ?? 0) + 1;
      byStatus[tx.status] = (byStatus[tx.status] ?? 0) + 1;
      byCurrency[tx.currency] = (byCurrency[tx.currency] ?? 0) + 1;
    }

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      entries,
      summary: {
        totalDebit,
        totalCredit,
        totalFees,
        netFlow: totalCredit - totalDebit,
        transactionCount: txs.length,
        byType,
        byStatus,
        byCurrency,
      },
    });
  } catch (e) {
    return apiCatch(e);
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
