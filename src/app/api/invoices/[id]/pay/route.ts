// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth"; 
import { db as prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(request);
    if ("error" in auth) return auth.error;
    const userId = auth.userId;

    const { id: invoiceId } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { merchant: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    // Execute payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get user's primary NGN wallet
      const userWallet = await tx.wallet.findFirst({
        where: { userId, currency: "NGN", type: "primary" } // Assuming NGN
      });

      if (!userWallet) {
        throw new Error("No primary NGN wallet found for user");
      }

      if (Number(userWallet.balance) < Number(invoice.amount)) {
        throw new Error("Insufficient funds");
      }

      // 1. Debit User Wallet
      await tx.wallet.update({
        where: { id: userWallet.id },
        data: { balance: { decrement: invoice.amount } }
      });

      // 2. Mark Invoice as Paid
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          paidAt: new Date(),
        }
      });

      // 3. Increment Merchant Volume
      await tx.merchant.update({
        where: { id: invoice.merchantId },
        data: { volume: { increment: invoice.amount } }
      });

      // 4. Create Transaction Record
      await tx.transaction.create({
        data: {
          reference: `INV-PAY-${Date.now()}`,
          userId,
          type: "payment",
          direction: "debit",
          status: "completed",
          amount: invoice.amount,
          currency: invoice.currency,
          description: `Paid invoice to ${invoice.merchant.name}: ${invoice.description}`,
          category: "shopping",
          completedAt: new Date(),
        }
      });

      // 5. Create Notification
      await tx.notification.create({
        data: {
          userId,
          title: "Invoice Paid",
          message: `You have successfully paid ${invoice.amount} ${invoice.currency} to ${invoice.merchant.name}.`,
          type: "transaction",
        }
      });

      return updatedInvoice;
    });

    return NextResponse.json({ message: "Invoice paid successfully", invoice: result }, { status: 200 });

  } catch (error: any) {
    console.error("Pay Invoice error:", error);
    if (error.message === "Insufficient funds" || error.message === "No primary NGN wallet found for user") {
       return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
