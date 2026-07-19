import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET — list all wallets
export async function GET(req: Request) {
  const auth = await requirePermission(req, "wallets.view");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const currency = searchParams.get("currency");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (currency && currency !== "all") where.currency = currency;
  if (status && status !== "all") where.status = status;
  if (q) {
    where.user = {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ],
    };
  }

  const wallets = await db.wallet.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  return NextResponse.json({ wallets });
}

// PATCH — adjust balance or freeze/unfreeze
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "adjust";

  let perm: string;
  switch (action) {
    case "freeze":
    case "unfreeze":
      perm = "wallets.freeze";
      break;
    default:
      perm = "wallets.adjust";
  }

  const auth = await requirePermission(req, perm);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { walletId, amount, reason, direction } = body as {
    walletId?: string;
    amount?: number;
    reason?: string;
    direction?: "credit" | "debit";
  };

  if (!walletId) return NextResponse.json({ error: "walletId required" }, { status: 400 });

  const wallet = await db.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });

  if (action === "freeze") {
    await db.wallet.update({ where: { id: walletId }, data: { status: "frozen" } });
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "wallet.freeze",
        entity: "Wallet",
        entityId: walletId,
        severity: "warning",
        details: JSON.stringify({ currency: wallet.currency, by: auth.userId }),
      },
    });
    return NextResponse.json({ success: true, status: "frozen" });
  }

  if (action === "unfreeze") {
    await db.wallet.update({ where: { id: walletId }, data: { status: "active" } });
    await db.auditLog.create({
      data: {
        userId: auth.userId,
        actor: auth.user.role,
        action: "wallet.unfreeze",
        entity: "Wallet",
        entityId: walletId,
        severity: "info",
        details: JSON.stringify({ currency: wallet.currency, by: auth.userId }),
      },
    });
    return NextResponse.json({ success: true, status: "active" });
  }

  // adjust
  const amt = Number(amount);
  if (!amt || isNaN(amt)) return NextResponse.json({ error: "amount required" }, { status: 400 });
  const dir = direction === "debit" ? -1 : 1;
  const newBalance = wallet.balance + amt * dir;
  if (newBalance < 0) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  await db.wallet.update({
    where: { id: walletId },
    data: { balance: { increment: amt * dir } },
  });

  // Create an audit log entry
  await db.auditLog.create({
    data: {
      userId: auth.userId,
      actor: auth.user.role,
      action: "wallet.adjust",
      entity: "Wallet",
      entityId: walletId,
      severity: "warning",
      details: JSON.stringify({
        currency: wallet.currency,
        amount: amt * dir,
        reason,
        by: auth.userId,
        before: wallet.balance,
        after: newBalance,
      }),
    },
  });

  return NextResponse.json({ success: true, newBalance });
}
