import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/api-auth";
import { apiError, apiCatch } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/seller/stats
 *
 * Aggregated seller stats: revenue, sales count, active products, pending
 * orders, rating, top products, and a 30-day revenue trend series.
 */
export async function GET(req: Request) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return apiError("Unauthorized", 401);

    // All seller products + their orders
    const products = await db.product.findMany({
      where: { sellerId: userId },
      include: {
        orders: {
          select: { id: true, status: true, amount: true, quantity: true, createdAt: true },
        },
      },
    });

    if (products.length === 0) {
      return NextResponse.json({
        totalRevenue: 0,
        totalSales: 0,
        activeProducts: 0,
        pendingOrders: 0,
        completedOrders: 0,
        rating: 0,
        reviewCount: 0,
        topProducts: [],
        revenueSeries: [],
        categoryBreakdown: [],
      });
    }

    const allOrders = products.flatMap((p) =>
      p.orders.map((o) => ({
        ...o,
        productId: p.id,
        productName: p.name,
        category: p.category,
      })),
    );

    const completedOrders = allOrders.filter((o) => o.status === "completed");
    const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.amount ?? 0), 0);
    const totalSales = completedOrders.reduce((s, o) => s + Number(o.quantity ?? 0), 0);
    const activeProducts = products.filter((p) => p.status === "active").length;
    const pendingOrders = allOrders.filter((o) =>
      ["pending", "accepted", "shipped"].includes(o.status),
    ).length;
    const completedOrdersCount = completedOrders.length;

    // Weighted average rating (only products with reviews count)
    const reviewedProducts = products.filter((p) => p.reviewCount > 0);
    const totalReviews = reviewedProducts.reduce((s, p) => s + p.reviewCount, 0);
    const weightedRating =
      totalReviews > 0
        ? reviewedProducts.reduce((s, p) => s + p.rating * p.reviewCount, 0) / totalReviews
        : products.reduce((s, p) => s + p.rating, 0) / Math.max(1, products.length);

    // Top products by revenue
    const productRevenueMap = new Map<
      string,
      { productId: string; productName: string; revenue: number; sales: number; image: string | null }
    >();
    for (const p of products) {
      let images: string[] = [];
      try {
        images = JSON.parse(p.images || "[]");
        if (!Array.isArray(images)) images = [];
      } catch {
        images = [];
      }
      const completed = p.orders.filter((o) => o.status === "completed");
      const revenue = completed.reduce((s, o) => s + Number(o.amount ?? 0), 0);
      const sales = completed.reduce((s, o) => s + Number(o.quantity ?? 0), 0);
      productRevenueMap.set(p.id, {
        productId: p.id,
        productName: p.name,
        revenue,
        sales,
        image: images[0] ?? null,
      });
    }
    const topProducts = Array.from(productRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 30-day revenue series
    const today = new Date();
    const days: { date: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        orders: 0,
      });
    }
    for (const o of allOrders) {
      if (o.status !== "completed") continue;
      const key = (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt))
        .toISOString()
        .slice(0, 10);
      const idx = days.findIndex((d) => d.date === key);
      if (idx < 0) continue;
      days[idx].revenue += Number(o.amount ?? 0);
      days[idx].orders += 1;
    }

    // Category breakdown (by revenue)
    const catMap = new Map<string, number>();
    for (const o of completedOrders) {
      const cat = (o as any).category || "other";
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(o.amount ?? 0));
    }
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      totalRevenue,
      totalSales,
      activeProducts,
      pendingOrders,
      completedOrders: completedOrdersCount,
      rating: Math.round(weightedRating * 10) / 10,
      reviewCount: totalReviews,
      totalProducts: products.length,
      topProducts,
      revenueSeries: days,
      categoryBreakdown,
    });
  } catch (e) {
    return apiCatch(e);
  }
}
