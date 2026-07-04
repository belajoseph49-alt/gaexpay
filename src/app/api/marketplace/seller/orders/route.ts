import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "accepted", "shipped", "completed", "cancelled"];

function serializeOrder(o: any) {
  return {
    id: o.id,
    productId: o.productId,
    productName: o.product?.name ?? "Product",
    productImage: (() => {
      try {
        const arr = JSON.parse(o.product?.images || "[]");
        return Array.isArray(arr) ? arr[0] ?? null : null;
      } catch {
        return null;
      }
    })(),
    buyerId: o.buyerId,
    buyerName: o.buyer
      ? `${o.buyer.firstName || ""} ${o.buyer.lastName || ""}`.trim() || o.buyer.username || "Buyer"
      : "Buyer",
    buyerAvatar: o.buyer?.avatar ?? null,
    quantity: o.quantity,
    amount: o.amount,
    currency: o.currency,
    status: o.status,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : String(o.updatedAt),
  };
}

/**
 * GET /api/marketplace/seller/orders
 *
 * List incoming orders for all products owned by the authenticated seller.
 *
 * Query params:
 *   - status : filter by order status
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";

    // Find seller's product ids first
    const sellerProducts = await db.product.findMany({
      where: { sellerId: userId },
      select: { id: true },
    });
    const productIds = sellerProducts.map((p) => p.id);

    if (productIds.length === 0) {
      return NextResponse.json({ orders: [], total: 0 });
    }

    const where: any = { productId: { in: productIds } };
    if (status && status !== "all" && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        product: { select: { name: true, images: true } },
        buyer: {
          select: { firstName: true, lastName: true, username: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map(serializeOrder),
      total: orders.length,
    });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/marketplace/seller/orders
 *
 * Update an order's status (Accept / Ship / Complete / Cancel). Only the
 * seller of the product may update it.
 *
 * Body: { orderId: string, status: "accepted" | "shipped" | "completed" | "cancelled" }
 */
export async function PATCH(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const identifier = getClientIdentifier(req, userId);
    const rl = rateLimitSensitive(identifier);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
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
    const b = (body ?? {}) as { orderId?: string; status?: string };

    const orderId = (b.orderId || "").trim();
    if (!orderId) return apiError("orderId is required", 400);

    const status = String(b.status || "").toLowerCase().trim();
    if (!VALID_STATUSES.includes(status)) {
      return apiError(`Invalid status. Supported: ${VALID_STATUSES.join(", ")}`, 400);
    }

    // Verify the order belongs to one of the seller's products
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { product: { select: { sellerId: true, name: true } } },
    });
    if (!order) return apiError("Order not found", 404);
    if (order.product?.sellerId !== userId) {
      return apiError("You can only update orders for your own products", 403);
    }

    // Enforce a sane status flow — pending → accepted → shipped → completed.
    // Cancel is allowed from any non-terminal status.
    const flow: Record<string, number> = {
      pending: 0, accepted: 1, shipped: 2, completed: 3, cancelled: 99,
    };
    const currentLevel = flow[order.status] ?? 0;
    const targetLevel = flow[status] ?? 0;
    if (status === "cancelled") {
      if (order.status === "completed" || order.status === "cancelled") {
        return apiError(`Cannot cancel an already-${order.status} order`, 400);
      }
    } else if (targetLevel <= currentLevel) {
      return apiError(
        `Invalid status transition: ${order.status} → ${status}`,
        400,
      );
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        product: { select: { name: true, images: true } },
        buyer: {
          select: { firstName: true, lastName: true, username: true, avatar: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "marketplace.order.update",
        entity: "order",
        entityId: orderId,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ from: order.status, to: status, productId: order.productId }),
        severity: status === "cancelled" ? "warning" : "info",
      },
    });

    // Notify the buyer about the status change
    await db.notification.create({
      data: {
        userId: order.buyerId,
        title: `Order ${status}`,
        message: `Your order for ${order.product?.name ?? "product"} is now "${status}".`,
        type: "transaction",
        channel: "push",
        actionUrl: "marketplace",
        metadata: JSON.stringify({
          kind: "marketplace_order_update",
          orderId,
          status,
          productId: order.productId,
        }),
      },
    });

    return NextResponse.json({ order: serializeOrder(updated) });
  } catch (e) {
    return apiCatch(e);
  }
}
