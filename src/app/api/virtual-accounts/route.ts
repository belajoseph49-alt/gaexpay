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

    const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    if (!user) return apiError("User not found", 404);

    // Return virtual accounts (stored as metadata in transactions)
    const txs = await db.transaction.findMany({
      where: { userId, type: "deposit", method: "virtual_account" },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts: txs });
  } catch (e) {
    return apiCatch(e);
  }
}

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { currency } = await req.json().catch(() => ({}));
    if (!currency) return apiError("Currency required", 400);

    const user = await db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    if (!user) return apiError("User not found", 404);

    const holderName = `${user.firstName} ${user.lastName}`.toUpperCase();
    
    let account: any;
    if (currency === "USD") {
      account = {
        id: randomBytes(8).toString("hex"),
        currency: "USD",
        accountNumber: Math.floor(100000000 + Math.random() * 900000000).toString(),
        routingNumber: "021000021",
        holderName,
      };
    } else {
      account = {
        id: randomBytes(8).toString("hex"),
        currency: "EUR",
        iban: `DE89 3704 0044 ${Math.floor(10000000000 + Math.random() * 90000000000)}`,
        holderName,
      };
    }

    // Store as a transaction record
    await db.transaction.create({
      data: {
        userId, type: "deposit", direction: "in",
        status: "completed", amount: 0, fee: 0, currency,
        reference: `VA-${account.id}`,
        description: `Virtual ${currency} account created`,
        counterpartyName: "GaexPay Banking",
        method: "virtual_account",
        metadata: JSON.stringify(account),
      },
    });

    await db.notification.create({
      data: {
        userId, title: `Virtual ${currency} account created 🏦`,
        message: `Your virtual ${currency} account is ready. Use it for freelancer payouts, client payments, and more.`,
        type: "success", channel: "in_app",
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (e) {
    return apiCatch(e);
  }
}
