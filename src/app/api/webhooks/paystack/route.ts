import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "node:crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify signature only if we have a real key configured
    if (PAYSTACK_SECRET_KEY !== "sk_test_mock") {
      const expectedSignature = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data.reference;
      const amountInKobo = data.amount;
      const amount = amountInKobo / 100;
      const currency = data.currency;

      // Find the pending transaction
      const transaction = await db.transaction.findUnique({
        where: { reference },
      });

      if (!transaction) {
        console.error(`Paystack Webhook: Transaction ${reference} not found.`);
        return NextResponse.json({ status: "ignored" });
      }

      if (transaction.status === "completed") {
        // Already processed
        return NextResponse.json({ status: "success" });
      }

      // Update Transaction
      await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          metadata: JSON.stringify({ ...event.data, _gateway: "paystack" }),
        },
      });

      // Update Wallet
      let wallet = await db.wallet.findFirst({
        where: { userId: transaction.userId, currency, type: "primary" },
      });

      if (!wallet) {
        wallet = await db.wallet.create({
          data: { userId: transaction.userId, currency, type: "primary" },
        });
      }

      await db.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          ledgerBalance: { increment: amount },
        },
      });

      // Notify User
      await db.notification.create({
        data: {
          userId: transaction.userId,
          title: "Top-Up Successful",
          message: `Your wallet has been credited with ${currency} ${amount.toLocaleString()}`,
          type: "success",
          channel: "in_app",
        },
      });

      return NextResponse.json({ status: "success" });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error) {
    console.error("Paystack Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
