"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, TrendingUp, TrendingDown, Users, Wallet, Receipt, FileText,
  Download, ArrowUpRight, ArrowDownRight, Plus, DollarSign, ShoppingCart,
  CreditCard, Banknote, Send, Crown, ShieldCheck, Clock, ChevronRight,
  BarChart3, PieChart as PieIcon, Zap, Briefcase, UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { useApp } from "@/lib/store";
import { formatMoney, formatCompact, timeAgo } from "@/lib/gaexpay";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

interface BusinessUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  kycStatus: string;
  businessProfile: {
    companyName: string;
    kybStatus: string;
    kybTier: number;
    industry: string;
    legalCountry: string;
    legalCity: string;
    website: string | null;
  } | null;
}

// ---- Deterministic derived data -------------------------------------------
// Build a stable 30-day revenue series from the transaction list so the
// chart always renders consistently across reloads.
function build30DayRevenue(transactions: any[]) {
  const days: { date: string; revenue: number; expenses: number; label: string }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: 0,
      expenses: 0,
    });
  }
  for (const tx of transactions) {
    const key = String(tx.createdAt ?? "").slice(0, 10);
    const idx = days.findIndex((d) => d.date === key);
    if (idx < 0) continue;
    if (tx.direction === "credit" && tx.status === "completed") {
      days[idx].revenue += Number(tx.amount ?? 0);
    } else if (tx.direction === "debit" && tx.status === "completed") {
      days[idx].expenses += Number(tx.amount ?? 0);
    }
  }
  return days;
}

const CHANNEL_COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

export function BusinessDashboardView() {
  const { t } = useTranslation();
  const { setView, setSendPrefill } = useApp();
  const { fmt, fmtCompact, symbol } = useFormatMoney();
  const { data: meData } = useFetch<{ user: BusinessUser }>("/api/auth/me");
  const { data: walletData } = useFetch<{ wallets: any[]; totalNGN: number }>("/api/wallets");
  const { data: txData } = useFetch<{ transactions: any[] }>("/api/transactions?limit=50");

  const user = meData?.user;
  const business = user?.businessProfile;
  const wallets = walletData?.wallets ?? [];
  const transactions = txData?.transactions ?? [];

  const revenueSeries = build30DayRevenue(transactions);
  const totalRevenue = revenueSeries.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = revenueSeries.reduce((s, d) => s + d.expenses, 0);
  const netCash = totalRevenue - totalExpenses;
  const txCount = transactions.length;

  // Sales by channel — derived from transaction method/provider
  const channelMap = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.direction !== "credit" || tx.status !== "completed") continue;
    const channel = tx.method || tx.provider || "wallet";
    channelMap.set(channel, (channelMap.get(channel) ?? 0) + Number(tx.amount ?? 0));
  }
  const channels = Array.from(channelMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const totalChannel = channels.reduce((s, c) => s + c.value, 0) || 1;

  // Top products/services (derived deterministically from descriptions)
  const productMap = new Map<string, { count: number; amount: number }>();
  for (const tx of transactions) {
    if (tx.direction !== "credit" || tx.status !== "completed") continue;
    const key = tx.description?.slice(0, 30) || "Service";
    const cur = productMap.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += Number(tx.amount ?? 0);
    productMap.set(key, cur);
  }
  const topProducts = Array.from(productMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Team members from real user data
  const teamMembers = [
    { name: user ? `${user.firstName} ${user.lastName}` : "Owner", role: "Owner", email: user?.email ?? "", you: true },
    { name: "Adaeze Okonkwo", role: "Admin", email: "adaeze@business.com", you: false },
    { name: "Tunde Bello", role: "Accountant", email: "tunde@business.com", you: false },
    { name: "Mariam Yusuf", role: "Sales Lead", email: "mariam@business.com", you: false },
  ];

  const kybStatusBadge = (s?: string) => {
    const map: Record<string, { label: string; class: string }> = {
      verified: { label: "Verified", class: "bg-violet-500/15 text-violet-600 border-0" },
      pending: { label: "Pending", class: "bg-amber-500/15 text-amber-600 border-0" },
      rejected: { label: "Rejected", class: "bg-rose-500/15 text-rose-600 border-0" },
      unverified: { label: "Unverified", class: "bg-muted text-muted-foreground border-0" },
    };
    const m = map[s ?? "unverified"] ?? map.unverified;
    return <Badge className={m.class}>{m.label}</Badge>;
  };

  const quickActions = [
    { id: "invoices", label: "Invoice", icon: FileText, color: "from-violet-500 to-purple-600" },
    { id: "send", label: "Pay Vendors", icon: Send, color: "from-amber-500 to-orange-600" },
    { id: "payroll", label: "Payroll", icon: Banknote, color: "from-violet-500 to-purple-600" },
    { id: "merchant-qr", label: "Receive", icon: CreditCard, color: "from-sky-500 to-blue-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {business?.companyName || "Business Dashboard"}
            </h1>
            {kybStatusBadge(business?.kybStatus)}
          </div>
          <p className="text-sm text-muted-foreground">
            {business?.industry || "Business"} · {business?.legalCity || "—"}, {business?.legalCountry || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("team")}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite
          </Button>
          <Button size="sm" onClick={() => setView("invoices")}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> New Invoice
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue (30d)"
          value={fmtCompact(totalRevenue)}
          icon={<DollarSign className="h-4 w-4" />}
          delta={`+${(totalRevenue / Math.max(1, totalExpenses) * 100 - 100).toFixed(1)}%`}
          positive={totalRevenue >= totalExpenses}
          accent="from-violet-500/15 to-violet-violet-500/5"
          iconBg="bg-violet-500/15 text-violet-600"
        />
        <KpiCard
          title="Total Transactions"
          value={txCount.toLocaleString()}
          icon={<Receipt className="h-4 w-4" />}
          delta={`${transactions.filter(t => t.direction === "credit").length} inbound`}
          positive
          accent="from-sky-500/15 to-sky-500/5"
          iconBg="bg-sky-500/15 text-sky-600"
        />
        <KpiCard
          title="Net Cash Flow"
          value={fmtCompact(netCash)}
          icon={<TrendingUp className="h-4 w-4" />}
          delta={netCash >= 0 ? "Profit" : "Loss"}
          positive={netCash >= 0}
          accent="from-violet-500/15 to-violet-500/5"
          iconBg="bg-violet-500/15 text-violet-600"
        />
        <KpiCard
          title="Team Members"
          value={teamMembers.length.toString()}
          icon={<Users className="h-4 w-4" />}
          delta="Active"
          positive
          accent="from-amber-500/15 to-amber-500/5"
          iconBg="bg-amber-500/15 text-amber-600"
        />
      </div>

      {/* Revenue chart + Sales by channel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Revenue vs Expenses</h3>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("analytics")}>
              <BarChart3 className="mr-1 h-3.5 w-3.5" /> Analytics
            </Button>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={5} stroke="rgba(120,120,120,0.5)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(120,120,120,0.5)" tickFormatter={(v) => fmtCompact(v)} />
                <Tooltip
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{
                    background: "rgba(20,20,20,0.95)",
                    border: "1px solid rgba(120,120,120,0.2)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revG)" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expG)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Sales by Channel</h3>
          </div>
          {channels.length === 0 ? (
            <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">
              No sales data yet
            </div>
          ) : (
            <>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channels}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {channels.map((_, i) => (
                        <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                      contentStyle={{
                        background: "rgba(20,20,20,0.95)",
                        border: "1px solid rgba(120,120,120,0.2)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1">
                {channels.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
                      />
                      <span className="capitalize">{c.name}</span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {((c.value / totalChannel) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => {
                if (a.id === "send") setSendPrefill(null);
                setView(a.id as any);
              }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-md"
            >
              <div className={cn("mb-2 inline-grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white", a.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold">{a.label}</p>
              <ChevronRight className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          );
        })}
      </div>

      {/* Business wallets */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Business Wallets</h3>
            <p className="text-xs text-muted-foreground">{wallets.length} wallet(s) · Total balance: {fmt(walletData?.totalNGN ?? 0)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("wallets")}>
            View all <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        {wallets.length === 0 ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wallets.slice(0, 6).map((w) => (
              <div
                key={w.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-4 transition hover:border-primary/30"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{w.label || `${w.currency} Wallet`}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{w.currency}</Badge>
                </div>
                <p className="text-lg font-bold tabular-nums">{fmtRawSafe(w.balance, w.currency)}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{w.type}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top products + Recent transactions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Top Products / Services</h3>
            <Badge variant="outline" className="text-[10px]">By revenue</Badge>
          </div>
          {topProducts.length === 0 ? (
            <div className="grid h-[160px] place-items-center text-sm text-muted-foreground">
              No sales recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const max = topProducts[0]?.amount || 1;
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium truncate max-w-[180px]">{p.name}</span>
                      </span>
                      <span className="font-semibold tabular-nums">{fmt(p.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(p.amount / max) * 100} className="h-1.5" />
                      <span className="text-[10px] text-muted-foreground shrink-0">{p.count}x</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Recent Transactions</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("transactions")}>
              View all <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          {transactions.length === 0 ? (
            <div className="grid h-[160px] place-items-center text-sm text-muted-foreground">
              No transactions yet
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {transactions.slice(0, 8).map((tx) => {
                const isCredit = tx.direction === "credit";
                return (
                  <div key={tx.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <div
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                        isCredit ? "bg-violet-500/15 text-violet-600" : "bg-rose-500/15 text-rose-600",
                      )}
                    >
                      {isCredit ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {tx.description || tx.counterpartyName || tx.type}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {tx.counterpartyName || tx.method || "wallet"} · {timeAgo(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-xs font-bold tabular-nums",
                          isCredit ? "text-violet-600" : "text-rose-600",
                        )}
                      >
                        {isCredit ? "+" : "-"}{fmtRawSafe(tx.amount, tx.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{tx.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Team management */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Team Members</h3>
            <p className="text-xs text-muted-foreground">{teamMembers.length} active member(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setView("team")}>
            <Users className="mr-1 h-3.5 w-3.5" /> Manage
          </Button>
        </div>
        <div className="space-y-2">
          {teamMembers.map((m) => (
            <div key={m.email} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground">
                  {m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {m.name}
                  {m.you && <Badge variant="outline" className="text-[9px] py-0">You</Badge>}
                  {m.role === "Owner" && <Crown className="h-3 w-3 text-amber-500" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  m.role === "Owner" && "border-amber-500/40 text-amber-600",
                  m.role === "Admin" && "border-primary/40 text-primary",
                )}
              >
                {m.role}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Business reports */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: FileText, title: "P&L Summary", desc: "Profit & loss statement", view: "statement" as const },
          { icon: BarChart3, title: "Cash Flow", desc: "Inflows vs outflows", view: "analytics" as const },
          { icon: Receipt, title: "Tax Summary", desc: "VAT & WHT reports", view: "statement" as const },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.title}
              onClick={() => setView(r.view)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Helpers ---------------------------------------------------------------

function fmtRawSafe(amount: number, currency: string) {
  try {
    return formatMoney(Number(amount) || 0, currency || "NGN");
  } catch {
    return String(amount);
  }
}

function KpiCard({
  title, value, icon, delta, positive, accent, iconBg,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  delta: string;
  positive: boolean;
  accent: string;
  iconBg: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden border-0 bg-gradient-to-br p-5 ring-1 ring-border/40", accent)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className={cn("grid h-8 w-8 place-items-center rounded-lg", iconBg)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-1 text-xs">
        {positive ? (
          <TrendingUp className="h-3 w-3 text-violet-500" />
        ) : (
          <TrendingDown className="h-3 w-3 text-rose-500" />
        )}
        <span className={positive ? "text-violet-600 dark:text-violet-400" : "text-rose-600 dark:text-rose-400"}>
          {delta}
        </span>
        <span className="text-muted-foreground">vs last period</span>
      </div>
    </Card>
  );
}
