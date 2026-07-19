// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Thrown inside the transaction to abort with a specific HTTP status. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function ref() {
  return (
    "GXP" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

interface PurchaseReceipt {
  transactionId: string;
  reference: string;
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  fee: number;
  currency: string;
  orderId: string;
  orderStatus: string;
  newStock: number;
  newBalance: number;
  date: string;
}

/**
 * POST /api/marketplace/purchase
 *
 * Buy a product from the marketplace. This is the real atomic payment flow:
 *   1. Auth + rate limit.
 *   2. Validate body (productId, quantity).
 *   3. db.$transaction:
 *        - Re-fetch the product (with seller) inside the tx
 *        - Validate stock + status
 *        - Re-fetch the buyer's wallet in the same currency
 *        - Balance check (amount + fee)
 *        - Debit the wallet
 *        - Create the Transaction record (type "payment", category "shopping")
 *        - Create the Order row (status "pending" — seller confirms)
 *        - Decrement product.stock + increment product.salesCount
 *        - Create an AuditLog
 *   4. Outside the tx: create a Notification for the buyer AND for the seller.
 *   5. Return a full receipt payload.
 */
export async function POST(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = await rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many purchase requests. Please slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      productId?: string;
      quantity?: number;
    };

    const productId = (b.productId || "").trim();
    if (!productId) return apiError("productId is required", 400);

    const quantity = Math.max(1, Math.floor(Number(b.quantity ?? 1)));
    if (!Number.isFinite(quantity) || quantity < 1) {
      return apiError("Invalid quantity", 400);
    }
    if (quantity > 1000) return apiError("Quantity too large", 400);

    const txRef = ref();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const result = await db.$transaction(async (tx) => {
      // ---------- Fetch product + seller ----------
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
        },
      });
      if (!product) throw new HttpError(404, "Product not found");
      if (product.status !== "active") {
        throw new HttpError(400, `Product is not available (status: ${product.status})`);
      }
      if (product.sellerId === userId) {
        throw new HttpError(400, "You cannot buy your own product");
      }
      if (product.stock < quantity) {
        throw new HttpError(
          400,
          `Insufficient stock (available: ${product.stock}, requested: ${quantity})`,
        );
      }

      const unitPrice = product.price;
      const amount = unitPrice * quantity;
      // 2% marketplace fee, capped at 1000 currency units, floor 0.
      const fee = Math.min(amount * 0.02, 1000);
      const currency = product.currency;

      // ---------- Fetch buyer wallet ----------
      let wallet = await tx.wallet.findFirst({
        where: { userId, currency, isDefault: true },
      });
      if (!wallet) {
        wallet = await tx.wallet.findFirst({ where: { userId, currency } });
      }
      if (!wallet) {
        throw new HttpError(404, `Wallet not found for currency ${currency}`);
      }

      if (wallet.balance < amount + fee) {
        throw new HttpError(
          400,
          `Insufficient balance (available: ${wallet.balance}, required: ${amount + fee})`,
        );
      }

      // ---------- Debit wallet ----------
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount + fee } },
      });

      // ---------- Create Transaction ----------
      const sellerName =
        `${product.seller?.firstName || ""} ${product.seller?.lastName || ""}`.trim() ||
        product.seller?.username ||
        "Seller";

      const txRecord = await tx.transaction.create({
        data: {
          reference: txRef,
          userId,
          senderId: userId,
          type: "payment",
          direction: "debit",
          status: "completed",
          amount,
          fee,
          currency,
          description: `Marketplace purchase — ${product.name} × ${quantity}`,
          category: "shopping",
          counterpartyName: sellerName,
          counterpartyAccount: product.seller?.id,
          counterpartyBank: null,
          method: "wallet",
          provider: "marketplace",
          walletId: wallet.id,
          riskScore: 0.1,
          fraudFlag: false,
          metadata: JSON.stringify({
            kind: "marketplace_purchase",
            productId: product.id,
            productName: product.name,
            sellerId: product.sellerId,
            quantity,
            unitPrice,
            amount,
            fee,
            currency,
            walletBalanceAfter: updatedWallet.balance,
          }),
          completedAt: new Date(),
        },
      });

      // ---------- Create Order ----------
      const order = await tx.order.create({
        data: {
          productId: product.id,
          buyerId: userId,
          quantity,
          amount,
          currency,
          status: "pending",
        },
      });

      // ---------- Decrement stock + bump salesCount ----------
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { decrement: quantity },
          salesCount: { increment: quantity },
          status: product.stock - quantity === 0 ? "out_of_stock" : product.status,
        },
      });

      // ---------- Audit log ----------
      await tx.auditLog.create({
        data: {
          userId,
          actor: "user",
          action: "marketplace.purchase",
          entity: "transaction",
          entityId: txRecord.id,
          ip,
          userAgent,
          details: JSON.stringify({
            reference: txRef,
            productId: product.id,
            productName: product.name,
            sellerId: product.sellerId,
            quantity,
            amount,
            fee,
            currency,
            orderId: order.id,
            walletBalanceAfter: updatedWallet.balance,
            newStock: updatedProduct.stock,
          }),
          severity: "info",
        },
      });

      return {
        txRecord,
        order,
        product,
        sellerId: product.sellerId,
        sellerName,
        newStock: updatedProduct.stock,
        walletBalanceAfter: updatedWallet.balance,
      };
    });

    // ---------- Notifications (outside the financial transaction) ----------
    await db.notification.create({
      data: {
        userId,
        title: "Purchase successful",
        message: `You bought ${result.product.name} × ${quantity} for ${result.txRecord.currency} ${result.txRecord.amount.toLocaleString("en-US")}.`,
        type: "transaction",
        channel: "push",
        actionUrl: "marketplace",
        metadata: JSON.stringify({
          kind: "marketplace_purchase",
          productId: result.product.id,
          orderId: result.order.id,
          reference: result.txRecord.reference,
        }),
      },
    });

    // Seller notification
    await db.notification.create({
      data: {
        userId: result.sellerId,
        title: "New order received",
        message: `You received an order for ${result.product.name} × ${quantity}.`,
        type: "transaction",
        channel: "push",
        actionUrl: "seller-dashboard",
        metadata: JSON.stringify({
          kind: "marketplace_order",
          orderId: result.order.id,
          productId: result.product.id,
          buyerId: userId,
        }),
      },
    });

    const receipt: PurchaseReceipt = {
      transactionId: result.txRecord.id,
      reference: result.txRecord.reference,
      productId: result.product.id,
      productName: result.product.name,
      sellerId: result.sellerId,
      sellerName: result.sellerName,
      quantity,
      unitPrice: result.product.price,
      amount: result.txRecord.amount,
      fee: result.txRecord.fee,
      currency: result.txRecord.currency,
      orderId: result.order.id,
      orderStatus: result.order.status,
      newStock: result.newStock,
      newBalance: result.walletBalanceAfter,
      date: result.txRecord.completedAt
        ? result.txRecord.completedAt instanceof Date
          ? result.txRecord.completedAt.toISOString()
          : String(result.txRecord.completedAt)
        : new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      transaction: result.txRecord,
      order: result.order,
      receipt,
    });
  } catch (e) {
    if (e instanceof HttpError) return apiError(e.message, e.status);
    return apiCatch(e);
  }
}
