// @ts-nocheck
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function serialize(p: any) {
  let images: string[] = [];
  try {
    images = JSON.parse(p.images || "[]");
    if (!Array.isArray(images)) images = [];
  } catch {
    images = [];
  }
  // Compute per-product revenue from completed orders
  const orders = (p.orders ?? []) as any[];
  const completedRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + Number(o.amount ?? 0), 0);
  const pendingOrders = orders.filter((o) =>
    ["pending", "accepted", "shipped"].includes(o.status),
  ).length;

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
    revenue: completedRevenue,
    pendingOrders,
    ordersCount: orders.length,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
  };
}

/**
 * GET /api/marketplace/seller/products
 *
 * List the authenticated user's products with derived revenue + pending
 * order counts.
 *
 * Query params:
 *   - status  : filter by product status (active | paused | out_of_stock | all)
 *   - q       : name search substring
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const where: any = { sellerId: userId };
    if (status && status !== "all") where.status = status;
    if (q) where.name = { contains: q };

    const products = await db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            amount: true,
            quantity: true,
          },
        },
      },
    });

    return NextResponse.json({
      products: products.map(serialize),
      total: products.length,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
