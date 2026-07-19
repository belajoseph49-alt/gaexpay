import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock"; // Replace with your test/live secret key

export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { amount, method, currency, phone, provider } = await req.json().catch(() => ({}));

    if (!amount || amount <= 0) return apiError("Invalid amount", 400);
    if (!currency) return apiError("Currency required", 400);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    if (!user) return apiError("User not found", 404);

    // 1. Generate unique transaction reference
    const reference = `TX-${randomBytes(8).toString("hex").toUpperCase()}`;

    // 2. Create pending transaction in DB
    await db.transaction.create({
      data: {
        userId,
        type: "deposit",
        direction: "in",
        status: "pending",
        amount,
        fee: 0,
        currency,
        reference,
        description: `Wallet Top-Up via ${method}`,
        method: method,
        counterpartyName: "Paystack",
      },
    });

    // 3. Initialize Paystack Transaction
    // Amount in Paystack is in lowest denomination (kobo for NGN)
    const amountInKobo = Math.round(amount * 100);

    // If using a real key, call Paystack API
    if (PAYSTACK_SECRET_KEY !== "sk_test_mock" && PAYSTACK_SECRET_KEY.startsWith("sk_")) {
      let endpoint = "https://api.paystack.co/transaction/initialize";
      let payload: any = {
        email: user.email,
        amount: amountInKobo,
        reference,
        currency,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?topup=success`,
        metadata: {
          custom_fields: [{ display_name: "User Name", variable_name: "user_name", value: `${user.firstName} ${user.lastName}` }],
        },
      };

      if (method === "momo" && phone && provider) {
        endpoint = "https://api.paystack.co/charge";
        payload = {
          email: user.email,
          amount: amountInKobo,
          reference,
          currency,
          mobile_money: {
            phone,
            provider
          }
        };
      } else if (method === "card") {
        payload.channels = ["card"];
      } else if (method === "bank") {
        payload.channels = ["bank", "bank_transfer"];
      }

      const paystackRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const paystackData = await paystackRes.json();

      if (!paystackData.status) {
        return apiError(paystackData.message || "Failed to initialize payment", 400);
      }

      if (method === "momo") {
        return NextResponse.json({
          success: true,
          reference,
          message: "Check your phone for the Mobile Money PIN prompt.",
        });
      }

      return NextResponse.json({
        success: true,
        reference,
        authorizationUrl: paystackData.data.authorization_url,
      });
    }

    // Fallback for demo/testing if no valid key is provided in .env
    // We instantly mark it as completed to simulate a successful payment in dev mode.
    await db.transaction.update({
      where: { reference },
      data: { status: "completed", completedAt: new Date() },
    });

    // Update Wallet Balance
    let wallet = await db.wallet.findFirst({
      where: { userId, currency, type: "primary" },
    });

    if (!wallet) {
      wallet = await db.wallet.create({
        data: { userId, currency, type: "primary" },
      });
    }

    await db.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
        ledgerBalance: { increment: amount },
      },
    });

    return NextResponse.json({
      success: true,
      reference,
      message: "Test mode: Wallet credited instantly (no Paystack key configured).",
      authorizationUrl: null, // Frontend will show toast instead of redirect
    });

  } catch (e) {
    return apiCatch(e);
  }
}
