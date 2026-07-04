import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const links = await db.transaction.findMany({
      where: { userId, type: "cash_link", method: "cash_link" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, amount: true, currency: true, status: true,
        reference: true, description: true, createdAt: true,
        counterpartyName: true,
      },
    });

    // Map to cash link format
    const formatted = links.map(l => ({
      id: l.id,
      token: l.reference?.replace("CL-", "") || l.id,
      amount: l.amount,
      currency: l.currency,
      status: l.status === "completed" ? "claimed" : l.status === "pending" ? "active" : "expired",
      note: l.description || "",
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ links: formatted });
  } catch (e) {
    return apiCatch(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const { amount, currency, note } = body;
    if (!amount || amount <= 0) return apiError("Invalid amount", 400);

    // Find user's wallet
    const wallet = await db.wallet.findFirst({ where: { userId, currency } });
    if (!wallet) return apiError("Wallet not found for this currency", 404);
    if (wallet.balance < amount) return apiError("Insufficient balance", 400);

    const token = randomBytes(8).toString("hex");
    const reference = `CL-${token}`;

    // Deduct from wallet and create transaction
    const [updatedWallet, tx] = await Promise.all([
      db.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } }),
      db.transaction.create({
        data: {
          userId, type: "cash_link", direction: "debit",
          status: "pending", amount, fee: 0, currency,
          reference, description: note || "Cash link",
          counterpartyName: "Cash link recipient",
          method: "cash_link", walletId: wallet.id,
        },
      }),
    ]);

    // Notification
    await db.notification.create({
      data: {
        userId, title: "Cash link created 🔗",
        message: `You created a cash link for ${currency} ${amount.toLocaleString()}. Share it with anyone!`,
        type: "transaction", channel: "in_app",
      },
    });

    return NextResponse.json({
      success: true,
      link: { id: tx.id, token, amount, currency, status: "active", note },
    });
  } catch (e) {
    return apiCatch(e);
  }
}
