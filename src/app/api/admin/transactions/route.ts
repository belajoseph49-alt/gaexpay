import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — list all transactions (admin)
export async function GET(req: Request) {
  const auth = await requirePermission(req, "transactions.view");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 200);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = searchParams.get("q") || "";

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (type && type !== "all") where.type = type;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const td = new Date(to);
      td.setHours(23, 59, 59, 999);
      range.lte = td;
    }
    where.createdAt = range;
  }
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { description: { contains: q } },
      { counterpartyName: { contains: q } },
    ];
  }

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 1000),
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ transactions });
}

// PATCH — reverse or flag a transaction
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "flag";

  const perm = action === "reverse" ? "transactions.reverse" : "transactions.flag";
  const auth = await requirePermission(req, perm);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { transactionId, reason } = body as { transactionId?: string; reason?: string };
  if (!transactionId) return NextResponse.json({ error: "transactionId required" }, { status: 400 });

  const tx = await db.transaction.findUnique({ where: { id: transactionId } });
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  if (action === "reverse") {
    if (tx.status !== "completed") {
      return NextResponse.json({ error: "Only completed transactions can be reversed" }, { status: 400 });
    }
    await db.transaction.update({
      where: { id: transactionId },
      data: { status: "reversed" },
    });
    // Refund the user's wallet
    if (tx.walletId) {
      const wallet = await db.wallet.findUnique({ where: { id: tx.walletId } });
      if (wallet) {
        const delta = tx.direction === "debit" ? tx.amount + tx.fee : -(tx.amount + tx.fee);
        await db.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: delta } },
        });
      }
    }
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "transaction.reverse",
        entity: "Transaction",
        entityId: transactionId,
        severity: "warning",
        details: JSON.stringify({ reference: tx.reference, reason }),
      },
    });
    return NextResponse.json({ success: true, status: "reversed" });
  }

  // flag
  await db.transaction.update({
    where: { id: transactionId },
    data: { fraudFlag: true, riskScore: Math.max(tx.riskScore, 0.85) },
  });
  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "transaction.flag",
      entity: "Transaction",
      entityId: transactionId,
      severity: "warning",
      details: JSON.stringify({ reference: tx.reference, reason }),
    },
  });
  return NextResponse.json({ success: true });
}
