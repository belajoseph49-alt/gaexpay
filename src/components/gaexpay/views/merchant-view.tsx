"use client";

import { motion } from "framer-motion";
import {
  Store, TrendingUp, TrendingDown, ShoppingBag, Users, QrCode, Star,
  Download, ArrowUpRight, Wallet, Receipt, Zap, Crown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatCompact, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { useFormatMoney } from "@/hooks/use-format-money";

const PIE_COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

export function MerchantView() {
  const { data } = useFetch<any>("/api/merchant-dashboard");
  const { setView } = useApp();
  const { fmt, symbol, currency: userCur } = useFormatMoney();

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { merchant, stats, recentPayments, series, topCustomers, methodBreakdown } = data;

  const kpis = [
    { icon: TrendingUp, label: "Today's Sales", value: fmt(stats.todayVolume), sub: `${stats.todayCount} orders`, color: "bg-violet-500/15 text-violet-500" },
    { icon: ShoppingBag, label: "This Week", value: fmt(stats.weekVolume), sub: `${stats.weekCount} orders`, color: "bg-sky-500/15 text-sky-500" },
    { icon: Wallet, label: "This Month", value: fmt(stats.monthVolume), sub: `${stats.monthCount} orders`, color: "bg-violet-500/15 text-violet-500" },
    { icon: Receipt, label: "Avg Order Value", value: fmt(stats.avgOrderValue), sub: `${stats.totalCount} total`, color: "bg-amber-500/15 text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Merchant Dashboard</h1>
          <p className="text-sm text-muted-foreground">Track sales, payments and customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" /> Export</Button>
          <Button size="sm" onClick={() => setView("merchant-qr")}><QrCode className="h-4 w-4 mr-1.5" /> My QR Code</Button>
        </div>
      </div>

      {/* Merchant profile banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-lg">
              <Store className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{merchant.name}</h2>
                <Badge className="bg-amber-500/20 text-amber-300 border-0">
                  <Crown className="h-3 w-3 mr-1" /> Verified
                </Badge>
              </div>
              <p className="text-sm text-white/70 capitalize">{merchant.category} · Merchant ID: {merchant.account}</p>
              <div className="mt-1 flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{merchant.rating.toFixed(1)}</span>
                <span className="text-white/50">· QR: {merchant.qrCode}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">Total Revenue</p>
            <p className="text-3xl font-bold tabular-nums">
              <AnimatedNumber value={stats.totalVolume} prefix={symbol} decimals={2} />
            </p>
            <p className="text-xs text-white/50">{stats.totalCount} lifetime orders</p>
          </div>
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5 card-lift">
                <div className={cn("grid h-10 w-10 place-items-center rounded-lg", k.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold tabular-nums">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sales chart + Payment methods */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Sales Trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
            </div>
            <Badge variant="outline" className="text-violet-600 border-violet-500/30">
              <TrendingUp className="h-3 w-3 mr-1" /> +18.2%
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="mVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v, "NGN")} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
              <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} fill="url(#mVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Payment Methods</h3>
          <p className="text-xs text-muted-foreground mb-3">Volume by method</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={methodBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {methodBreakdown.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatMoney(Number(v), "NGN")} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {methodBreakdown.map((m: any, i: number) => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 capitalize">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {m.name}
                </span>
                <span className="font-medium tabular-nums">{fmt(m.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent payments + Top customers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Payments</h3>
            <Badge variant="outline">{recentPayments.length}</Badge>
          </div>
          {recentPayments.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50 transition">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/15 text-violet-500">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.counterpartyName || "Walk-in Customer"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{p.method} · {timeAgo(p.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-violet-600 tabular-nums">+{formatMoney(p.amount, p.currency)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Top Customers</h3>
          <p className="text-xs text-muted-foreground mb-3">By total spend</p>
          {topCustomers.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No customers yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 transition">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {c.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {i === 0 && (
                      <div className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-black">
                        <Crown className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.count} orders</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: QrCode, label: "Generate QR", desc: "Create payment QR code", color: "from-violet-500 to-purple-600", action: () => setView("merchant-qr") },
          { icon: Receipt, label: "Send Invoice", desc: "Email invoice to customer", color: "from-amber-500 to-orange-600", action: () => {} },
          { icon: Zap, label: "Settle to Bank", desc: "Withdraw to bank account", color: "from-violet-500 to-purple-600", action: () => {} },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Card key={a.label} className="flex items-center gap-3 p-4 card-lift cursor-pointer" onClick={a.action}>
              <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow", a.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
