import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId, getClientIdentifier } from "@/lib/api-auth";
import { rateLimitSensitive } from "@/lib/rate-limit";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "electronics", "fashion", "home", "food", "services", "digital", "health", "other",
];

function serialize(p: any) {
  let images: string[] = [];
  try {
    images = JSON.parse(p.images || "[]");
    if (!Array.isArray(images)) images = [];
  } catch {
    images = [];
  }
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    category: p.category,
    price: p.price,
    currency: p.currency,
    images,
    stock: p.stock,
    status: p.status,
    rating: p.rating,
    reviewCount: p.reviewCount,
    salesCount: p.salesCount,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    sellerId: p.sellerId,
    sellerName: p.seller
      ? `${p.seller.firstName || ""} ${p.seller.lastName || ""}`.trim() || p.seller.username || "Seller"
      : "Seller",
    sellerAvatar: p.seller?.avatar ?? null,
  };
}

/**
 * GET /api/marketplace/products/[id]
 *
 * Public single-product detail.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: { firstName: true, lastName: true, username: true, avatar: true },
        },
      },
    });
    if (!product) return apiError("Product not found", 404);

    return NextResponse.json({ product: serialize(product) });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * PATCH /api/marketplace/products/[id]
 *
 * Update product (seller only — must own the product). Body fields are
 * optional; only provided fields are updated.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return apiError("Product not found", 404);
    if (existing.sellerId !== userId) {
      return apiError("You can only edit your own products", 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const b = (body ?? {}) as {
      name?: string;
      description?: string;
      category?: string;
      price?: number;
      currency?: string;
      images?: string[];
      stock?: number;
      status?: string;
    };

    const data: any = {};

    if (b.name !== undefined) {
      const name = String(b.name).trim();
      if (!name) return apiError("Product name cannot be empty", 400);
      if (name.length > 120) return apiError("Product name too long", 400);
      data.name = name;
    }
    if (b.description !== undefined) {
      data.description = b.description === null || b.description === ""
        ? null
        : String(b.description).slice(0, 4000);
    }
    if (b.category !== undefined) {
      const category = String(b.category).toLowerCase().trim();
      if (!CATEGORIES.includes(category)) {
        return apiError(`Invalid category. Supported: ${CATEGORIES.join(", ")}`, 400);
      }
      data.category = category;
    }
    if (b.price !== undefined) {
      const price = Number(b.price);
      if (!Number.isFinite(price) || price <= 0) return apiError("Price must be > 0", 400);
      if (price > 1e9) return apiError("Price too large", 400);
      data.price = price;
    }
    if (b.currency !== undefined) {
      const currency = String(b.currency).toUpperCase().trim();
      if (currency.length !== 3) return apiError("Invalid currency", 400);
      data.currency = currency;
    }
    if (b.images !== undefined) {
      let images: string[] = [];
      if (Array.isArray(b.images)) {
        images = b.images
          .map((s) => String(s).trim())
          .filter((s) => s.length > 0 && s.length < 2048)
          .slice(0, 8);
      }
      data.images = JSON.stringify(images);
    }
    if (b.stock !== undefined) {
      const stock = Math.max(0, Math.floor(Number(b.stock)));
      if (!Number.isFinite(stock)) return apiError("Invalid stock value", 400);
      data.stock = stock;
      // Auto-sync status — out-of-stock when stock hits 0
      if (stock === 0) data.status = "out_of_stock";
      else if (existing.status === "out_of_stock") data.status = "active";
    }
    if (b.status !== undefined) {
      const status = String(b.status).toLowerCase().trim();
      if (!["active", "paused", "out_of_stock"].includes(status)) {
        return apiError("Invalid status", 400);
      }
      data.status = status;
    }

    const product = await db.product.update({
      where: { id },
      data,
      include: {
        seller: {
          select: { firstName: true, lastName: true, username: true, avatar: true },
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "marketplace.product.update",
        entity: "product",
        entityId: id,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ updated: Object.keys(data) }),
        severity: "info",
      },
    });

    return NextResponse.json({ product: serialize(product) });
  } catch (e) {
    return apiCatch(e);
  }
}

/**
 * DELETE /api/marketplace/products/[id]
 *
 * Hard-delete the product (seller only — must own it).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return apiError("Product not found", 404);
    if (existing.sellerId !== userId) {
      return apiError("You can only delete your own products", 403);
    }

    // Soft-block: refuse to delete if there are pending / accepted / shipped
    // orders (only completed / cancelled orders can remain).
    const openOrders = await db.order.count({
      where: {
        productId: id,
        status: { in: ["pending", "accepted", "shipped"] },
      },
    });
    if (openOrders > 0) {
      return apiError(
        `Cannot delete product with ${openOrders} open order(s). Complete or cancel them first.`,
        400,
      );
    }

    await db.product.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId,
        actor: "user",
        action: "marketplace.product.delete",
        entity: "product",
        entityId: id,
        ip:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null,
        userAgent: req.headers.get("user-agent") || null,
        details: JSON.stringify({ name: existing.name }),
        severity: "warning",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return apiCatch(e);
  }
}
