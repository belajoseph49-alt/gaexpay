"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, TrendingUp, TrendingDown, ShoppingCart, Users, Receipt,
  Download, ArrowUpRight, ArrowDownRight, Sparkles, Crown, Star,
  FileText, Clock, CheckCircle2, AlertTriangle, Lightbulb, Zap,
  Plus, Wallet, CreditCard, Bitcoin, QrCode, Landmark, Smartphone,
  Award, Target, UserPlus, Send, Building2, ChevronRight, Activity,
  Package, Flame, RefreshCw, BadgeCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { AnimatedNumber } from "../animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

const fmtNGN = (n: number, compact = false) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `₦${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(1)}K`;
    return `₦${n.toFixed(0)}`;
  }
  return `₦${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};
const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n);
const timeAgoShort = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

interface BusinessProData {
  merchant: {
    id: string;
    name: string;
    category: string;
    qrCode: string;
    account: string;
    rating: number;
  };
  kpis: {
    todayRevenue: number; todayOrders: number;
    weekRevenue: number; weekOrders: number;
    monthRevenue: number; monthOrders: number;
    yearRevenue: number; yearOrders: number;
    totalRevenue: number; totalOrders: number;
    avgOrderValue: number;
    refundRate: number;
    customerCount: number;
    repeatCustomerRate: number;
    newCustomers30d: number;
  };
  revenueTrend: { date: string; label: string; revenue: number; orders: number }[];
  salesByCategory: { name: string; value: number; color: string }[];
  salesByMethod: { name: string; value: number; color: string }[];
  topProducts: {
    rank: number; name: string; category: string; color: string;
    sold: number; revenue: number; growth: number; share: number;
  }[];
  topCustomers: {
    rank: number; name: string; account: string;
    orderCount: number; totalSpend: number; lastOrderDate: string;
  }[];
  heatmap: { day: string; hour: number; value: number; revenue: number }[];
  staff: {
    id: string; name: string; role: string; avatar: string; color: string;
    salesCount: number; revenue: number; rating: number;
    target: number; attainment: number; avgTicket: number;
  }[];
  invoices: {
    summary: {
      outstanding: number; overdue: number; paidThisMonth: number;
      totalCount: number; pendingCount: number; overdueCount: number;
    };
    list: {
      id: string; customer: string; amount: number;
      dueDate: string; createdAt: string; status: string;
      items: number; tax: number;
    }[];
  };
  settlements: {
    summary: {
      availableBalance: number; pendingSettlements: number;
      settledThisMonth: number; nextSettlementDate: string;
    };
    history: {
      id: string; reference: string; date: string;
      amount: number; fee: number; net: number;
      bank: string; accountNumber: string; accountName: string; status: string;
    }[];
    bankAccounts: {
      id: string; bank: string; accountName: string;
      accountNumber: string; currency: string; primary: boolean;
    }[];
  };
  insights: {
    type: "positive" | "warning" | "info";
    icon: string; title: string; message: string; metric: string;
  }[];
  retention: {
    newCustomers30d: number; returningCustomers30d: number;
    churnRate: number; retentionRate: number;
    avgLifetimeValue: number; avgOrdersPerCustomer: number;
  };
  recommendations: {
    priority: "high" | "medium" | "low";
    title: string; impact: string; effort: string;
    timeline: string; icon: string;
  }[];
  generatedAt: string;
}

const METHOD_ICON: Record<string, any> = {
  QR: QrCode, Card: CreditCard, Bank: Landmark, MoMo: Smartphone, Crypto: Bitcoin,
};

export function BusinessProView() {
  const { data, loading } = useFetch<BusinessProData>("/api/business-pro");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Business Pro Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Invoicing · settlements · staff · analytics · insights
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline" className="border-amber-500/30 text-amber-600">
            <Crown className="h-3 w-3 mr-1" /> Pro
          </Badge>
          <Button size="sm" variant="outline" onClick={() => toast.success("Business report exported (CSV, 30d window)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </motion.div>

      {loading || !data ? (
        <BusinessProSkeleton />
      ) : (
        <Tabs defaultValue="dashboard">
          <TabsList className="flex-wrap h-auto bg-muted/50">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <Activity className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5">
              <FileText className="h-4 w-4" /> Invoices
              {data.invoices.summary.overdueCount > 0 && (
                <Badge className="h-4 px-1 text-[9px] bg-rose-500 text-white border-0">
                  {data.invoices.summary.overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-1.5">
              <Users className="h-4 w-4" /> Staff
            </TabsTrigger>
            <TabsTrigger value="settlements" className="gap-1.5">
              <Wallet className="h-4 w-4" /> Settlements
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              <Sparkles className="h-4 w-4" /> Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-5">
            <DashboardTab data={data} />
          </TabsContent>
          <TabsContent value="invoices" className="mt-5">
            <InvoicesTab data={data} />
          </TabsContent>
          <TabsContent value="staff" className="mt-5">
            <StaffTab data={data} />
          </TabsContent>
          <TabsContent value="settlements" className="mt-5">
            <SettlementsTab data={data} />
          </TabsContent>
          <TabsContent value="insights" className="mt-5">
            <InsightsTab data={data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ===========================================================
 *  Dashboard Tab — Hero + charts + top products + heatmap
 * =========================================================== */
function DashboardTab({ data }: { data: BusinessProData }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const k = data.kpis;
  const maxHeat = Math.max(...data.heatmap.map((h) => h.value), 1);

  return (
    <div className="space-y-5">
      {/* Revenue hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                Revenue · Month to date
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">{data.merchant.name}</h2>
            </div>
            <Badge className="border-0 bg-white/10 text-white backdrop-blur">
              <Sparkles className="h-3 w-3 mr-1" /> Pro Merchant
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat
              icon={<TrendingUp className="h-4 w-4" />}
              label="MTD Revenue"
              value={k.monthRevenue}
              prefix={symbol}
              format="compact"
              accent="emerald"
              sub={`${k.monthOrders} orders this month`}
            />
            <HeroStat
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Orders"
              value={k.totalOrders}
              accent="teal"
              sub={`${k.todayOrders} today`}
            />
            <HeroStat
              icon={<Receipt className="h-4 w-4" />}
              label="Avg Order Value"
              value={k.avgOrderValue}
              prefix={symbol}
              format="compact"
              accent="cyan"
              sub="Across all orders"
            />
            <HeroStat
              icon={<RefreshCw className="h-4 w-4" />}
              label="Refund Rate"
              value={k.refundRate}
              suffix="%"
              decimals={2}
              accent={k.refundRate < 2 ? "lime" : "amber"}
              sub={k.refundRate < 2 ? "Within healthy range" : "Above benchmark"}
            />
          </div>
        </div>
      </motion.div>

      {/* Secondary KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          icon={TrendingUp} label="Today's Revenue"
          value={fmtNGN(k.todayRevenue, true)} sub={`${k.todayOrders} orders today`}
          trend="+5.2%" up color="bg-emerald-500/15 text-emerald-500"
        />
        <MiniStat
          icon={Activity} label="This Week"
          value={fmtNGN(k.weekRevenue, true)} sub={`${k.weekOrders} orders`}
          trend="+12.4%" up color="bg-sky-500/15 text-sky-500"
        />
        <MiniStat
          icon={Wallet} label="This Year"
          value={fmtNGN(k.yearRevenue, true)} sub={`${k.yearOrders} orders`}
          trend="+28.7%" up color="bg-violet-500/15 text-violet-500"
        />
        <MiniStat
          icon={Users} label="Customers"
          value={fmtNum(k.customerCount)} sub={`${k.repeatCustomerRate.toFixed(1)}% repeat rate`}
          trend="+8.1%" up color="bg-amber-500/15 text-amber-500"
        />
      </div>

      {/* 14-day revenue trend */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Revenue Trend (14 days)
            </h3>
            <p className="text-xs text-muted-foreground">Daily revenue from completed orders</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
            {fmtNGN(k.monthRevenue, true)} MTD
          </Badge>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.revenueTrend}>
            <defs>
              <linearGradient id="bpRevArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtNGN(Number(v), true)}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
              formatter={(v: any) => [fmtNGN(Number(v)), "Revenue"]}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#bpRevArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Sales by category + method */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold">Sales by Category</h3>
            <p className="text-xs text-muted-foreground">Revenue distribution across product categories</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.salesByCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                stroke="none"
              >
                {data.salesByCategory.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, name: any) => [fmtNGN(Number(v)), name]}
                labelStyle={{ color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.salesByCategory.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="truncate font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold">Sales by Payment Method</h3>
            <p className="text-xs text-muted-foreground">Channel mix this month</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.salesByMethod} layout="vertical" margin={{ left: 10 }}>
              <defs>
                <linearGradient id="bpMethod" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtNGN(Number(v), true)} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, name: any) => [fmtNGN(Number(v)), name]}
                labelStyle={{ color: "#94a3b8" }}
                cursor={{ fill: "rgba(20,184,166,0.08)" }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.salesByMethod.map((m) => (
                  <Cell key={m.name} fill={m.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {data.salesByMethod.map((m) => {
              const total = data.salesByMethod.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? (m.value / total) * 100 : 0;
              const Icon = METHOD_ICON[m.name] || QrCode;
              return (
                <div key={m.name} className="rounded-lg border p-2 text-center">
                  <Icon className="mx-auto h-3.5 w-3.5 mb-1" style={{ color: m.color }} />
                  <p className="text-[10px] text-muted-foreground">{m.name}</p>
                  <p className="text-[11px] font-semibold tabular-nums">{pct.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top 5 products table */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" /> Top Products / Services
            </h3>
            <p className="text-xs text-muted-foreground">Best-selling items by revenue</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Product report exported")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">Product</th>
                <th className="pb-2 pr-2 font-medium">Category</th>
                <th className="pb-2 pr-2 font-medium text-right">Units Sold</th>
                <th className="pb-2 pr-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">Growth</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.slice(0, 5).map((p) => (
                <tr key={p.rank} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 pr-2">
                    <div className={cn(
                      "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                      p.rank === 1 ? "bg-amber-500/20 text-amber-600"
                      : p.rank === 2 ? "bg-slate-400/20 text-slate-500"
                      : p.rank === 3 ? "bg-orange-700/20 text-orange-700"
                      : "bg-muted text-muted-foreground",
                    )}>
                      {p.rank}
                    </div>
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-xs font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-2 text-xs text-muted-foreground">{p.category}</td>
                  <td className="py-3 pr-2 text-right tabular-nums text-xs">{fmtNum(p.sold)}</td>
                  <td className="py-3 pr-2 text-right font-semibold tabular-nums text-xs">{fmtNGN(p.revenue, true)}</td>
                  <td className="py-3 text-right">
                    <Badge variant="outline" className={cn("text-[10px]", p.growth >= 0 ? "text-emerald-600 border-emerald-500/30" : "text-rose-600 border-rose-500/30")}>
                      {p.growth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      {Math.abs(p.growth)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Hourly sales heatmap */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-500" /> Hourly Sales Heatmap
            </h3>
            <p className="text-xs text-muted-foreground">Revenue intensity by day of week × hour</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            Low
            <div className="flex h-3 w-24 overflow-hidden rounded">
              {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1].map((o) => (
                <div key={o} className="flex-1" style={{ backgroundColor: `rgba(16,185,129,${o})` }} />
              ))}
            </div>
            High
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="flex">
              <div className="w-10 shrink-0" />
              <div className="flex-1 grid grid-cols-24 gap-px text-[9px] text-muted-foreground" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="text-center pb-1">
                    {h % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>
            </div>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="flex items-center mb-px">
                <div className="w-10 shrink-0 text-[10px] font-medium text-muted-foreground">{day}</div>
                <div className="flex-1 grid gap-px" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const cell = data.heatmap.find((c) => c.day === day && c.hour === h);
                    const intensity = cell ? cell.value / maxHeat : 0;
                    return (
                      <div
                        key={h}
                        className="group relative aspect-square rounded-sm transition-all hover:ring-1 hover:ring-emerald-400"
                        style={{ backgroundColor: `rgba(16,185,129,${0.05 + intensity * 0.95})` }}
                      >
                        <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] shadow-md group-hover:block">
                          {day} {h}:00 · {fmtNGN(cell?.value || 0, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Top customers */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" /> Top Customers
            </h3>
            <p className="text-xs text-muted-foreground">Highest-spending customers by total revenue</p>
          </div>
        </div>
        <div className="max-h-[320px] space-y-2 overflow-y-auto no-scrollbar">
          {data.topCustomers.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No customer data yet</p>
          )}
          {data.topCustomers.map((c, i) => (
            <motion.div
              key={`${c.name}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                  {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.orderCount} orders · Last: {timeAgoShort(c.lastOrderDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{fmtNGN(c.totalSpend, true)}</p>
                <p className="text-[10px] text-muted-foreground">Lifetime spend</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  Invoices Tab — Summary cards + Create + List
 * =========================================================== */
function InvoicesTab({ data }: { data: BusinessProData }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [form, setForm] = useState({
    customer: "", amount: "", dueDate: "", items: "", notes: "",
  });

  const summary = data.invoices.summary;
  const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
    paid: { color: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30", icon: CheckCircle2 },
    pending: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", icon: Clock },
    overdue: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", icon: AlertTriangle },
  };

  const handleCreate = () => {
    if (!form.customer.trim()) return toast.error("Customer name is required");
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid invoice amount");
    toast.success(`Invoice created for ${form.customer} · ${fmtNGN(amt)}`);
    setForm({ customer: "", amount: "", dueDate: "", items: "", notes: "" });
    setCreateOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Invoice summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 card-lift ring-1 ring-amber-500/20">
            <div className="mb-2 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                {summary.pendingCount} pending
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              <AnimatedNumber value={summary.outstanding} prefix={symbol} decimals={0} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Awaiting payment</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 card-lift ring-1 ring-rose-500/20">
            <div className="mb-2 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">
                {summary.overdueCount} overdue
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
              <AnimatedNumber value={summary.overdue} prefix={symbol} decimals={0} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Past due date</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 card-lift ring-1 ring-emerald-500/20">
            <div className="mb-2 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                This month
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
              <AnimatedNumber value={summary.paidThisMonth} prefix={symbol} decimals={0} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Collected this month</p>
          </Card>
        </motion.div>
      </div>

      {/* Invoices list */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-500" /> Invoice List
            </h3>
            <p className="text-xs text-muted-foreground">{data.invoices.list.length} invoices on file</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create new invoice</DialogTitle>
                <DialogDescription>Send an invoice to a customer. They'll receive a payment link via email or SMS.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="cust">Customer name</Label>
                  <Input id="cust" placeholder="Acme Corp" value={form.customer}
                    onChange={(e) => setForm({ ...form, customer: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amt">Amount (₦)</Label>
                    <Input id="amt" type="number" placeholder="50000" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="due">Due date</Label>
                    <Input id="due" type="date" value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="items">Line items</Label>
                  <Textarea id="items" rows={3} placeholder={"Premium Subscription x2 — ₦30,000\nOnboarding — ₦20,000"} value={form.items}
                    onChange={(e) => setForm({ ...form, items: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input id="notes" placeholder="Net 14 days · 7.5% VAT included" value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>
                  <Send className="h-4 w-4 mr-1.5" /> Send Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto no-scrollbar">
          {data.invoices.list.map((inv, i) => {
            const cfg = statusConfig[inv.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-wrap items-center gap-3 rounded-xl border p-3 hover:bg-muted/30"
              >
                <div className={cn("grid h-10 w-10 place-items-center rounded-lg border", cfg.bg)}>
                  <StatusIcon className={cn("h-5 w-5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{inv.customer}</p>
                    <Badge variant="outline" className={cn("text-[10px] capitalize", cfg.color, cfg.bg)}>
                      {inv.status}
                    </Badge>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {inv.id} · {inv.items} items · Due {new Date(inv.dueDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{fmtNGN(inv.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">VAT {fmtNGN(inv.tax, true)}</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => toast.info(`Opening invoice ${inv.id}`)}>
                  View
                </Button>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  Staff Tab — Staff list + Add + Performance chart
 * =========================================================== */
function StaffTab({ data }: { data: BusinessProData }) {
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Sales Associate", email: "" });

  const handleAdd = () => {
    if (!form.name.trim()) return toast.error("Staff name is required");
    toast.success(`${form.name} added as ${form.role}`);
    setForm({ name: "", role: "Sales Associate", email: "" });
    setAddOpen(false);
  };

  const totalStaffRevenue = data.staff.reduce((s, x) => s + x.revenue, 0);

  return (
    <div className="space-y-5">
      {/* Staff performance bar chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" /> Staff Performance
            </h3>
            <p className="text-xs text-muted-foreground">Revenue generated per team member this month</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
            {fmtNGN(totalStaffRevenue, true)} total
          </Badge>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.staff}>
            <defs>
              <linearGradient id="bpStaff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => String(v).split(" ").map((w) => w[0]).join("")} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => fmtNGN(Number(v), true)} />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
              formatter={(v: any) => [fmtNGN(Number(v)), "Revenue"]}
              labelStyle={{ color: "#94a3b8" }}
              cursor={{ fill: "rgba(20,184,166,0.08)" }}
            />
            <Bar dataKey="revenue" fill="url(#bpStaff)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Staff list */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" /> Team Roster
            </h3>
            <p className="text-xs text-muted-foreground">{data.staff.length} active staff members</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1.5" /> Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add new staff member</DialogTitle>
                <DialogDescription>Invite a team member to your Business Pro workspace.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="sname">Full name</Label>
                  <Input id="sname" placeholder="Ada Lovelace" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="srole">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger id="srole"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Store Manager">Store Manager</SelectItem>
                      <SelectItem value="Senior Cashier">Senior Cashier</SelectItem>
                      <SelectItem value="Sales Associate">Sales Associate</SelectItem>
                      <SelectItem value="Inventory Lead">Inventory Lead</SelectItem>
                      <SelectItem value="Customer Support">Customer Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="semail">Email (optional)</Label>
                  <Input id="semail" type="email" placeholder="ada@gaexpay.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd}>
                  <UserPlus className="h-4 w-4 mr-1.5" /> Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {data.staff.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border p-4 hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className={cn("grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white font-bold shadow-md", s.color)}>
                  {s.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <Badge variant="outline" className="text-[10px]">{s.role}</Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">{s.rating.toFixed(1)}</span>
                    <span>· {fmtNum(s.salesCount)} sales · Avg ticket {fmtNGN(s.avgTicket, true)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{fmtNGN(s.revenue, true)}</p>
                  <p className="text-[10px] text-muted-foreground">Revenue generated</p>
                </div>
              </div>
              {/* Target attainment bar */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> Target attainment
                  </span>
                  <span className={cn("font-semibold tabular-nums", s.attainment >= 100 ? "text-emerald-600" : s.attainment >= 85 ? "text-amber-600" : "text-rose-600")}>
                    {s.attainment}% of {fmtNGN(s.target, true)}
                  </span>
                </div>
                <Progress value={Math.min(s.attainment, 100)} className="h-1.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  Settlements Tab — Available balance + Settle + History
 * =========================================================== */
function SettlementsTab({ data }: { data: BusinessProData }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [settleOpen, setSettleOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState(data.settlements.bankAccounts.find((b) => b.primary)?.id || data.settlements.bankAccounts[0]?.id || "");

  const s = data.settlements.summary;
  const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
    completed: { color: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-500" },
    pending: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500" },
    processing: { color: "text-sky-600", bg: "bg-sky-500/15 border-sky-500/30", dot: "bg-sky-500" },
    failed: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", dot: "bg-rose-500" },
  };

  const handleSettle = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > s.availableBalance) return toast.error("Amount exceeds available balance");
    const bank = data.settlements.bankAccounts.find((b) => b.id === bankId);
    toast.success(`Settlement of ${fmtNGN(amt)} queued to ${bank?.bank}`);
    setAmount("");
    setSettleOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="sm:col-span-1"
        >
          <Card className="relative overflow-hidden p-6 border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">Available Balance</span>
              </div>
              <p className="text-3xl font-bold tabular-nums">
                <AnimatedNumber value={s.availableBalance} prefix={symbol} decimals={0} />
              </p>
              <p className="mt-1 text-xs opacity-80">Ready to settle to your bank</p>
              <Button
                size="sm"
                className="mt-4 w-full bg-white text-emerald-700 hover:bg-white/90"
                onClick={() => setSettleOpen(true)}
              >
                <Send className="h-4 w-4 mr-1.5" /> Settle Now
              </Button>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 card-lift ring-1 ring-amber-500/20 h-full">
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Pending Settlements</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600">
              <AnimatedNumber value={s.pendingSettlements} prefix={symbol} decimals={0} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Next: {new Date(s.nextSettlementDate).toLocaleDateString("en", { month: "short", day: "numeric" })}
            </p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 card-lift ring-1 ring-emerald-500/20 h-full">
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Settled This Month</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">
              <AnimatedNumber value={s.settledThisMonth} prefix={symbol} decimals={0} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Across {data.settlements.history.filter((h) => h.status === "completed").length} settlements</p>
          </Card>
        </motion.div>
      </div>

      {/* Settlement history */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-500" /> Settlement History
            </h3>
            <p className="text-xs text-muted-foreground">Recent bank settlements from your merchant account</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Settlement statement exported")}>
            <Download className="h-4 w-4 mr-1.5" /> Statement
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Reference</th>
                <th className="pb-2 pr-3 font-medium">Bank</th>
                <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                <th className="pb-2 pr-3 font-medium text-right">Fee</th>
                <th className="pb-2 pr-3 font-medium text-right">Net</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.settlements.history.map((h, i) => {
                const cfg = statusConfig[h.status] || statusConfig.pending;
                return (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 pr-3 text-xs">
                      <p className="font-medium">{new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" })}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-[11px] font-mono">{h.reference}</p>
                      <p className="text-[10px] text-muted-foreground">{h.id}</p>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      <p className="font-medium">{h.bank}</p>
                      <p className="text-[10px] text-muted-foreground">••••{h.accountNumber.slice(-4)}</p>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold tabular-nums text-xs">{fmtNGN(h.amount, true)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-xs text-muted-foreground">{fmtNGN(h.fee, true)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-xs font-semibold text-emerald-600">{fmtNGN(h.net, true)}</td>
                    <td className="py-3">
                      <Badge variant="outline" className={cn("text-[10px] capitalize", cfg.color, cfg.bg)}>
                        <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", cfg.dot)} />
                        {h.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Settle Now dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settle to bank account</DialogTitle>
            <DialogDescription>
              Funds typically arrive within 1 business day. A 0.5% settlement fee applies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-emerald-500/5 p-3 ring-1 ring-emerald-500/20">
              <p className="text-[11px] text-muted-foreground">Available to settle</p>
              <p className="text-xl font-bold tabular-nums text-emerald-600">{fmtNGN(s.availableBalance)}</p>
            </div>
            <div>
              <Label htmlFor="amt">Amount (₦)</Label>
              <Input id="amt" type="number" placeholder="100000" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
              <div className="mt-1 flex gap-1.5">
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                  onClick={() => setAmount(String(s.availableBalance))}>Max</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                  onClick={() => setAmount(String(Math.round(s.availableBalance * 0.5)))}>50%</Button>
                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                  onClick={() => setAmount(String(Math.round(s.availableBalance * 0.25)))}>25%</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="bank">Bank account</Label>
              <Select value={bankId} onValueChange={setBankId}>
                <SelectTrigger id="bank"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {data.settlements.bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.bank} · ••••{b.accountNumber.slice(-4)}{b.primary ? " (Primary)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>Cancel</Button>
            <Button onClick={handleSettle}>
              <Send className="h-4 w-4 mr-1.5" /> Confirm Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===========================================================
 *  Insights Tab — AI insights + retention + recommendations
 * =========================================================== */
function InsightsTab({ data }: { data: BusinessProData }) {
  const insightConfig: Record<string, { color: string; bg: string; ring: string; icon: any }> = {
    positive: {
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/20",
      icon: TrendingUp,
    },
    warning: {
      color: "text-amber-600",
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/20",
      icon: AlertTriangle,
    },
    info: {
      color: "text-sky-600",
      bg: "bg-sky-500/10",
      ring: "ring-sky-500/20",
      icon: Lightbulb,
    },
  };

  const priorityConfig: Record<string, { color: string; bg: string }> = {
    high: { color: "text-rose-600", bg: "bg-rose-500/10 border-rose-500/30" },
    medium: { color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
    low: { color: "text-sky-600", bg: "bg-sky-500/10 border-sky-500/30" },
  };

  const recIcon: Record<string, any> = {
    zap: Zap, crown: Crown, clock: Clock, bitcoin: Bitcoin, package: Package,
  };

  return (
    <div className="space-y-5">
      {/* AI Insights hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <Sparkles className="h-6 w-6 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Business Insights</h2>
            <p className="text-xs text-emerald-300/80">
              Generated from your last 30 days of business activity · {data.insights.length} insights
            </p>
          </div>
        </div>
      </motion.div>

      {/* Insight cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.insights.map((ins, i) => {
          const cfg = insightConfig[ins.type] || insightConfig.info;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn("h-full p-5 ring-1 card-lift", cfg.ring)}>
                <div className="mb-3 flex items-start justify-between">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-lg", cfg.bg, cfg.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", cfg.color)}>
                    {ins.type}
                  </Badge>
                </div>
                <p className="text-sm font-semibold">{ins.title}</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{ins.message}</p>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Key metric</span>
                  <span className={cn("text-xs font-semibold tabular-nums", cfg.color)}>{ins.metric}</span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Customer retention metrics */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" /> Customer Retention Metrics
            </h3>
            <p className="text-xs text-muted-foreground">Loyalty and lifetime value indicators</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RetentionCard
            icon={UserPlus} label="New Customers (30d)"
            value={fmtNum(data.retention.newCustomers30d)}
            color="text-sky-600 bg-sky-500/15"
            sub="First-time buyers this month"
          />
          <RetentionCard
            icon={RefreshCw} label="Returning Customers"
            value={fmtNum(data.retention.returningCustomers30d)}
            color="text-emerald-600 bg-emerald-500/15"
            sub="2+ orders lifetime"
          />
          <RetentionCard
            icon={BadgeCheck} label="Retention Rate"
            value={`${data.retention.retentionRate}%`}
            color="text-violet-600 bg-violet-500/15"
            sub="Customers retained this period"
          />
          <RetentionCard
            icon={TrendingDown} label="Churn Rate"
            value={`${data.retention.churnRate}%`}
            color="text-rose-600 bg-rose-500/15"
            sub="Customers lost this period"
          />
          <RetentionCard
            icon={Crown} label="Avg Lifetime Value"
            value={fmtNGN(data.retention.avgLifetimeValue, true)}
            color="text-amber-600 bg-amber-500/15"
            sub="Per active customer"
          />
          <RetentionCard
            icon={ShoppingCart} label="Avg Orders / Customer"
            value={data.retention.avgOrdersPerCustomer.toFixed(1)}
            color="text-teal-600 bg-teal-500/15"
            sub="Lifetime order frequency"
          />
        </div>
      </Card>

      {/* Growth recommendations */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" /> Growth Recommendations
            </h3>
            <p className="text-xs text-muted-foreground">Prioritized actions to grow your business</p>
          </div>
          <Badge variant="outline" className="text-xs">{data.recommendations.length} actions</Badge>
        </div>
        <div className="space-y-2.5">
          {data.recommendations.map((r, i) => {
            const cfg = priorityConfig[r.priority] || priorityConfig.low;
            const Icon = recIcon[r.icon] || Zap;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/30"
              >
                <div className={cn("grid h-10 w-10 place-items-center rounded-lg", cfg.bg)}>
                  <Icon className={cn("h-5 w-5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.title}</p>
                    <Badge variant="outline" className={cn("text-[10px] capitalize", cfg.color, cfg.bg)}>
                      {r.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.impact} · Effort: {r.effort} · Timeline: {r.timeline}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => toast.info(`Opening action plan: ${r.title}`)}>
                  Plan
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  Reusable sub-components
 * =========================================================== */
function HeroStat({
  icon, label, value, prefix, suffix, decimals, format, accent, sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  format?: "compact";
  accent: "emerald" | "teal" | "cyan" | "lime" | "amber";
  sub: string;
}) {
  const accentColors: Record<string, string> = {
    emerald: "text-emerald-300",
    teal: "text-teal-300",
    cyan: "text-cyan-300",
    lime: "text-lime-300",
    amber: "text-amber-300",
  };
  const formatted = format === "compact" ? fmtNGN(value, true) : fmtNum(value);
  return (
    <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-emerald-300/80">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", accentColors[accent])}>
        {prefix}
        <AnimatedNumber value={value} decimals={decimals ?? (format === "compact" ? 2 : 0)} duration={1400} suffix={suffix} />
      </p>
      <p className="mt-1 text-[11px] text-slate-400">{format === "compact" ? formatted : sub}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, sub, trend, up, color,
}: {
  icon: any; label: string; value: string; sub: string;
  trend: string; up: boolean; color: string;
}) {
  return (
    <Card className="p-5 card-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={up ? "text-emerald-600 border-emerald-500/30" : "text-rose-600 border-rose-500/30"}>
          {up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
          {trend}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function RetentionCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: any; label: string; value: string; color: string; sub: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function BusinessProSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
