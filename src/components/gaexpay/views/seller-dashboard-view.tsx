"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Store, TrendingUp, Package, ShoppingCart, Star, Plus, Pencil, Trash2,
  CheckCircle2, Truck, XCircle, Loader2, Boxes, BarChart3, DollarSign,
  Crown, AlertCircle, Eye, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";

// ---- Types -----------------------------------------------------------------

interface SellerProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  images: string[];
  stock: number;
  status: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  revenue: number;
  pendingOrders: number;
  ordersCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SellerOrder {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string | null;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SellerStats {
  totalRevenue: number;
  totalSales: number;
  activeProducts: number;
  pendingOrders: number;
  completedOrders: number;
  rating: number;
  reviewCount: number;
  totalProducts: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    revenue: number;
    sales: number;
    image: string | null;
  }>;
  revenueSeries: Array<{ date: string; label: string; revenue: number; orders: number }>;
  categoryBreakdown: Array<{ category: string; revenue: number }>;
}

// ---- Constants -------------------------------------------------------------

const CATEGORIES = [
  { id: "electronics", labelKey: "marketplace.catElectronics" },
  { id: "fashion", labelKey: "marketplace.catFashion" },
  { id: "home", labelKey: "marketplace.catHome" },
  { id: "food", labelKey: "marketplace.catFood" },
  { id: "services", labelKey: "marketplace.catServices" },
  { id: "digital", labelKey: "marketplace.catDigital" },
  { id: "health", labelKey: "marketplace.catHealth" },
  { id: "other", labelKey: "marketplace.catOther" },
];

const PIE_COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16", "#6366f1"];

// ---- Component -------------------------------------------------------------

export function SellerDashboardView() {
  const { t } = useTranslation();
  const { fmt, symbol, currency: userCurrency } = useFormatMoney();
  const { setView } = useApp();

  const [activeTab, setActiveTab] = useState("overview");

  const productsApi = useFetch<{ products: SellerProduct[] }>("/api/marketplace/seller/products");
  const ordersApi = useFetch<{ orders: SellerOrder[] }>("/api/marketplace/seller/orders");
  const statsApi = useFetch<SellerStats>("/api/marketplace/seller/stats");

  const reloadAll = () => {
    productsApi.reload();
    ordersApi.reload();
    statsApi.reload();
  };

  const products = productsApi.data?.products ?? [];
  const orders = ordersApi.data?.orders ?? [];
  const stats = statsApi.data;

  // ---- Action handlers ----
  const [editing, setEditing] = useState<SellerProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SellerProduct | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<{ orderId: string; status: string } | null>(null);

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrder({ orderId, status });
    try {
      const res = await fetch("/api/marketplace/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("seller.orderUpdateFailed"));
        return;
      }
      toast.success(t(`seller.orderStatus_${status}`));
      ordersApi.reload();
      statsApi.reload();
    } catch {
      toast.error(t("seller.orderUpdateFailed"));
    } finally {
      setUpdatingOrder(null);
    }
  };

  const deleteProduct = async (p: SellerProduct) => {
    try {
      const res = await fetch(`/api/marketplace/products/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("seller.deleteFailed"));
        return;
      }
      toast.success(t("seller.productDeleted"));
      setDeleting(null);
      reloadAll();
    } catch {
      toast.error(t("seller.deleteFailed"));
    }
  };

  const isLoading = productsApi.loading || ordersApi.loading || statsApi.loading;

  // ---- Render ----
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Store className="h-6 w-6 text-primary" />
            {t("seller.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("seller.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("marketplace")}>
            <Eye className="h-4 w-4 mr-1.5" /> {t("seller.viewMarketplace")}
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> {t("seller.addProduct")}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {isLoading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={DollarSign}
              label={t("seller.totalRevenue")}
              value={
                <AnimatedNumber value={stats.totalRevenue} prefix={symbol} decimals={2} />
              }
              sub={`${stats.completedOrders} orders`}
              color="bg-emerald-500/15 text-emerald-500"
            />
            <StatCard
              icon={ShoppingCart}
              label={t("seller.totalSales")}
              value={<span className="tabular-nums">{stats.totalSales.toLocaleString()}</span>}
              sub={`${stats.completedOrders} completed`}
              color="bg-sky-500/15 text-sky-500"
            />
            <StatCard
              icon={Package}
              label={t("seller.activeProducts")}
              value={<span className="tabular-nums">{stats.activeProducts}</span>}
              sub={`${stats.totalProducts} total`}
              color="bg-violet-500/15 text-violet-500"
            />
            <StatCard
              icon={Truck}
              label={t("seller.pendingOrders")}
              value={<span className="tabular-nums">{stats.pendingOrders}</span>}
              sub={t("seller.needsAction")}
              color="bg-amber-500/15 text-amber-500"
            />
            <StatCard
              icon={Star}
              label={t("seller.rating")}
              value={
                <span className="tabular-nums">
                  {stats.rating.toFixed(1)}
                </span>
              }
              sub={`${stats.reviewCount} reviews`}
              color="bg-rose-500/15 text-rose-500"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{t("seller.tabOverview")}</span>
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{t("seller.tabProducts")}</span>
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{t("seller.tabOrders")}</span>
            {stats && stats.pendingOrders > 0 && (
              <Badge className="ml-1 bg-amber-500 text-white">{stats.pendingOrders}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">{t("seller.tabAnalytics")}</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {!stats ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : stats.totalProducts === 0 ? (
            <EmptyState
              icon={Store}
              title={t("seller.noProductsTitle")}
              desc={t("seller.noProductsDesc")}
              cta={
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> {t("seller.addFirstProduct")}
                </Button>
              }
            />
          ) : (
            <>
              {/* Revenue chart */}
              <Card className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{t("seller.revenueTrend")}</h3>
                    <p className="text-xs text-muted-foreground">{t("seller.last30Days")}</p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {fmt(stats.totalRevenue)}
                  </Badge>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={stats.revenueSeries}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [fmt(Number(v)), t("seller.revenue")]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#revGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* Two-col: top products + category breakdown */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-3 font-semibold">{t("seller.topProducts")}</h3>
                  {stats.topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("seller.noTopProducts")}</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {stats.topProducts.map((p, i) => (
                        <div key={p.productId} className="flex items-center gap-3 rounded-lg border p-2">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            #{i + 1}
                          </div>
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {p.image && (
                               
                              <img src={p.image} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="line-clamp-1 text-sm font-medium">{p.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.sales} {t("seller.sold")}
                            </p>
                          </div>
                          <span className="text-sm font-bold tabular-nums">{fmt(p.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 font-semibold">{t("seller.categoryBreakdown")}</h3>
                  {stats.categoryBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("seller.noCategoryData")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={stats.categoryBreakdown}
                          dataKey="revenue"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ category, percent }: any) =>
                            `${category} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                          fontSize={10}
                        >
                          {stats.categoryBreakdown.map((entry, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v: any) => [fmt(Number(v)), t("seller.revenue")]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* PRODUCTS */}
        <TabsContent value="products" className="mt-4">
          <Card className="overflow-hidden">
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {t("seller.myProducts")}
                  <span className="ml-2 text-sm text-muted-foreground">({products.length})</span>
                </h3>
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> {t("seller.addProduct")}
                </Button>
              </div>
            </div>
            {productsApi.loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t("seller.noProductsTitle")}
                desc={t("seller.noProductsDesc")}
                cta={
                  <Button size="sm" onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4 mr-1.5" /> {t("seller.addFirstProduct")}
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("seller.productName")}</TableHead>
                      <TableHead className="text-right">{t("seller.price")}</TableHead>
                      <TableHead className="text-center">{t("seller.stock")}</TableHead>
                      <TableHead className="text-center">{t("seller.sales")}</TableHead>
                      <TableHead className="text-center">{t("seller.status")}</TableHead>
                      <TableHead className="text-right">{t("seller.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const imgs = p.images ?? [];
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                                {imgs[0] && (
                                   
                                  <img src={imgs[0]} alt="" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{p.category}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {fmt(p.price, p.currency)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{p.stock}</TableCell>
                          <TableCell className="text-center tabular-nums">{p.salesCount}</TableCell>
                          <TableCell className="text-center">
                            <ProductStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditing(p)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-rose-500 hover:text-rose-600"
                                onClick={() => setDeleting(p)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ORDERS */}
        <TabsContent value="orders" className="mt-4">
          <Card className="overflow-hidden">
            <div className="border-b p-4">
              <h3 className="font-semibold">
                {t("seller.incomingOrders")}
                <span className="ml-2 text-sm text-muted-foreground">({orders.length})</span>
              </h3>
            </div>
            {ordersApi.loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title={t("seller.noOrdersTitle")}
                desc={t("seller.noOrdersDesc")}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("seller.buyer")}</TableHead>
                      <TableHead>{t("seller.product")}</TableHead>
                      <TableHead className="text-center">{t("seller.qty")}</TableHead>
                      <TableHead className="text-right">{t("seller.amount")}</TableHead>
                      <TableHead className="text-center">{t("seller.status")}</TableHead>
                      <TableHead className="text-right">{t("seller.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-[10px]">
                                {o.buyerName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-sm font-medium">{o.buyerName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(o.createdAt).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-1 text-sm font-medium">{o.productName}</p>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{o.quantity}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {fmt(o.amount, o.currency)}
                        </TableCell>
                        <TableCell className="text-center">
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <OrderActions
                            order={o}
                            onUpdate={updateOrderStatus}
                            updating={
                              updatingOrder?.orderId === o.id ? updatingOrder.status : null
                            }
                            t={t}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4 space-y-4">
          {!stats ? (
            <Skeleton className="h-72 rounded-2xl" />
          ) : stats.totalProducts === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={t("seller.noAnalyticsTitle")}
              desc={t("seller.noAnalyticsDesc")}
            />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <h3 className="mb-3 font-semibold">{t("seller.revenueTrend")}</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={stats.revenueSeries}>
                      <defs>
                        <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: any, n: any) =>
                          n === "revenue"
                            ? [fmt(Number(v)), t("seller.revenue")]
                            : [v, t("seller.orders")]
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#revGrad2)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-5">
                  <h3 className="mb-3 font-semibold">{t("seller.ordersPerDay")}</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.revenueSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [v, t("seller.orders")]}
                      />
                      <Bar dataKey="orders" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card className="p-5">
                <h3 className="mb-3 font-semibold">{t("seller.topProducts")}</h3>
                {stats.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("seller.noTopProducts")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={stats.topProducts}
                      layout="vertical"
                      margin={{ left: 80, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                      <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        type="category"
                        dataKey="productName"
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        width={140}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [fmt(Number(v)), t("seller.revenue")]}
                      />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                        {stats.topProducts.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit product modal */}
      <ProductFormModal
        open={creating || !!editing}
        product={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreating(false);
          setEditing(null);
          reloadAll();
        }}
        t={t}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              {t("seller.deleteProduct")}
            </DialogTitle>
          </DialogHeader>
          {deleting && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("seller.deleteConfirm", { name: deleting.name })}
              </p>
              {deleting.pendingOrders > 0 && (
                <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
                  {t("seller.hasPendingOrders", { n: deleting.pendingOrders })}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="flex-1">{t("common.cancel")}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleting && deleteProduct(deleting)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Sub-components --------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  sub: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
          </div>
          <div className={cn("grid h-9 w-9 place-items-center rounded-lg", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ProductStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-500/15 text-emerald-600 border-0" },
    paused: { label: "Paused", className: "bg-amber-500/15 text-amber-600 border-0" },
    out_of_stock: { label: "Out of Stock", className: "bg-rose-500/15 text-rose-600 border-0" },
  };
  const meta = map[status] ?? map.active;
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-500/15 text-amber-600 border-0" },
    accepted: { label: "Accepted", className: "bg-sky-500/15 text-sky-600 border-0" },
    shipped: { label: "Shipped", className: "bg-violet-500/15 text-violet-600 border-0" },
    completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-600 border-0" },
    cancelled: { label: "Cancelled", className: "bg-rose-500/15 text-rose-600 border-0" },
  };
  const meta = map[status] ?? map.pending;
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

function OrderActions({
  order,
  onUpdate,
  updating,
  t,
}: {
  order: SellerOrder;
  onUpdate: (orderId: string, status: string) => void;
  updating: string | null;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const next: Record<string, { label: string; status: string; icon: any; variant?: string } | null> = {
    pending: { label: t("seller.accept"), status: "accepted", icon: CheckCircle2 },
    accepted: { label: t("seller.ship"), status: "shipped", icon: Truck },
    shipped: { label: t("seller.complete"), status: "completed", icon: CheckCircle2 },
    completed: null,
    cancelled: null,
  };
  const action = next[order.status];

  return (
    <div className="flex justify-end gap-1">
      {action && (
        <Button
          size="sm"
          variant="default"
          className="h-7 px-2 text-xs"
          disabled={!!updating}
          onClick={() => onUpdate(order.id, action.status)}
        >
          {updating === action.status ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <action.icon className="h-3 w-3 mr-1" />
          )}
          {action.label}
        </Button>
      )}
      {order.status !== "completed" && order.status !== "cancelled" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600"
          disabled={!!updating}
          onClick={() => onUpdate(order.id, "cancelled")}
        >
          <XCircle className="h-3 w-3 mr-1" />
          {t("seller.cancel")}
        </Button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  cta,
}: {
  icon: any;
  title: string;
  desc: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground/60">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {cta}
    </div>
  );
}

// ---- Add/Edit product modal -----------------------------------------------

function ProductFormModal({
  open,
  product,
  onClose,
  onSaved,
  t,
}: {
  open: boolean;
  product: SellerProduct | null;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const isEdit = !!product;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("electronics");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [stock, setStock] = useState("");
  const [images, setImages] = useState<string>("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens / product changes
  useState(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setCategory(product.category);
      setPrice(String(product.price));
      setCurrency(product.currency);
      setStock(String(product.stock));
      setImages(product.images.join("\n"));
      setStatus(product.status);
    }
  });

  // Use useEffect-like reset on each open
  if (typeof window !== "undefined") {
    // Reset when opening with a new product (no-op safety for stale closures)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !stock) {
      toast.error(t("seller.fillAllFields"));
      return;
    }
    setSaving(true);
    try {
      const imageList = images
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const body = {
        name: name.trim(),
        description: description.trim() || null,
        category,
        price: Number(price),
        currency,
        stock: Number(stock),
        images: imageList,
        status,
      };

      const url = isEdit
        ? `/api/marketplace/products/${product!.id}`
        : "/api/marketplace/products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || t("seller.saveFailed"));
        return;
      }
      toast.success(isEdit ? t("seller.productUpdated") : t("seller.productCreated"));
      // Reset form
      setName(""); setDescription(""); setPrice(""); setStock(""); setImages("");
      setCategory("electronics"); setCurrency("NGN"); setStatus("active");
      onSaved();
    } catch {
      toast.error(t("seller.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // Sync form when product changes — done via key prop on the form to force remount
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {isEdit ? t("seller.editProduct") : t("seller.addProductTitle")}
          </DialogTitle>
        </DialogHeader>
        <form key={product?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
          {/* Pre-fill via defaultValue when editing */}
          <FormFields
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            category={category} setCategory={setCategory}
            price={price} setPrice={setPrice}
            currency={currency} setCurrency={setCurrency}
            stock={stock} setStock={setStock}
            images={images} setImages={setImages}
            status={status} setStatus={setStatus}
            initialProduct={product}
            t={t}
          />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              {isEdit ? t("common.save") : t("seller.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormFields({
  name, setName,
  description, setDescription,
  category, setCategory,
  price, setPrice,
  currency, setCurrency,
  stock, setStock,
  images, setImages,
  status, setStatus,
  initialProduct,
  t,
}: {
  name: string; setName: (s: string) => void;
  description: string; setDescription: (s: string) => void;
  category: string; setCategory: (s: string) => void;
  price: string; setPrice: (s: string) => void;
  currency: string; setCurrency: (s: string) => void;
  stock: string; setStock: (s: string) => void;
  images: string; setImages: (s: string) => void;
  status: string; setStatus: (s: string) => void;
  initialProduct: SellerProduct | null;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  // When initialProduct is provided, seed fields once.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && initialProduct) {
    setName(initialProduct.name);
    setDescription(initialProduct.description ?? "");
    setCategory(initialProduct.category);
    setPrice(String(initialProduct.price));
    setCurrency(initialProduct.currency);
    setStock(String(initialProduct.stock));
    setImages(initialProduct.images.join("\n"));
    setStatus(initialProduct.status);
    setSeeded(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">{t("seller.productNameLabel")}</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("seller.productNamePlaceholder")}
          className="mt-1"
          required
          maxLength={120}
        />
      </div>

      <div>
        <Label className="text-xs">{t("seller.descriptionLabel")}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("seller.descriptionPlaceholder")}
          className="mt-1 min-h-24"
          maxLength={4000}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t("seller.categoryLabel")}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{t(c.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{t("seller.currencyLabel")}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["NGN", "USD", "EUR", "GBP", "GHS", "KES"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{t("seller.priceLabel")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="mt-1"
            required
          />
        </div>
        <div>
          <Label className="text-xs">{t("seller.stockLabel")}</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="0"
            className="mt-1"
            required
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">{t("seller.imagesLabel")}</Label>
        <Textarea
          value={images}
          onChange={(e) => setImages(e.target.value)}
          placeholder={t("seller.imagesPlaceholder")}
          className="mt-1 min-h-16 text-xs"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("seller.imagesHint")}
        </p>
      </div>

      <div>
        <Label className="text-xs">{t("seller.statusLabel")}</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("seller.statusActive")}</SelectItem>
            <SelectItem value="paused">{t("seller.statusPaused")}</SelectItem>
            <SelectItem value="out_of_stock">{t("seller.statusOutOfStock")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
