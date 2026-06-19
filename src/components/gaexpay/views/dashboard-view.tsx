"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  SendHorizontal, Download, QrCode, ArrowDownToLine, ArrowUpRight, ArrowDownRight,
  Wallet, TrendingUp, TrendingDown, Eye, EyeOff, Plus, ChevronRight, Smartphone,
  Zap, Receipt, Gift, ShieldCheck, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, timeAgo, CURRENCY_SYMBOL } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS = [
  { id: "send", label: "Send", icon: SendHorizontal, color: "from-emerald-500 to-teal-600" },
  { id: "pay", label: "Pay QR", icon: QrCode, color: "from-fuchsia-500 to-pink-600" },
  { id: "pay", label: "Top Up", icon: ArrowDownToLine, color: "from-amber-500 to-orange-600", prefill: "topup" },
  { id: "pay", label: "Bills", icon: Receipt, color: "from-sky-500 to-blue-600" },
  { id: "pay", label: "Airtime", icon: Smartphone, color: "from-violet-500 to-purple-600" },
  { id: "referral", label: "Rewards", icon: Gift, color: "from-rose-500 to-red-600" },
];

export function DashboardView() {
  const { setView, setSendPrefill, userCurrency } = useApp();
  const { data: walletData } = useFetch<{ wallets: any[]; totalNGN: number }>("/api/wallets");
  const { data: txData } = useFetch<{ transactions: any[] }>("/api/transactions?limit=8");
  const { data: userData } = useFetch<{ user: any }>("/api/me");
  const [hidden, setHidden] = useState(false);

  const user = userData?.user;
  const wallets = walletData?.wallets ?? [];
  const totalNGN = walletData?.totalNGN ?? 0;
  const transactions = txData?.transactions ?? [];

  // Convert total to user's preferred currency
  const RATES_TO_NGN: Record<string, number> = {
    NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12,
    XAF: 2.55, XOF: 2.55, ZAR: 82, UGX: 0.42, TZS: 0.61, RWF: 1.28,
    ETB: 27.5, EGP: 32, MAD: 154, CNY: 213, AED: 419, INR: 18.5,
  };
  const userTotal = totalNGN / (RATES_TO_NGN[userCurrency] || 1);

  // build 30-day series from transactions
  const series = build30DaySeries(transactions);
  const spendingByCat = buildCategoryBreakdown(transactions);

  // monthly income/expense
  const now = new Date();
  const monthTx = transactions.filter((t) => new Date(t.createdAt).getMonth() === now.getMonth());
  const income = monthTx.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {greeting()}, welcome back
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {user?.firstName ? `${user.firstName} ${user.lastName}` : "Adaeze Okonkwo"} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {user?.kycStatus === "verified" ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-0">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Tier {user.kycTier} Verified
            </Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setView("kyc")}>
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Verify Identity
            </Button>
          )}
        </div>
      </div>

      {/* Top grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Balance hero card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 text-white shadow-xl shadow-emerald-900/20">
            <div className="absolute inset-0 opacity-30 mesh-bg" />
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-6 top-10 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/80">Total Balance ({userCurrency})</p>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-3xl font-bold tracking-tight tabular-nums">
                      {hidden ? `${CURRENCY_SYMBOL[userCurrency] || ""} • • • • • •` : <AnimatedNumber value={userTotal} prefix={CURRENCY_SYMBOL[userCurrency] || ""} decimals={2} />}
                    </h2>
                    <button onClick={() => setHidden(!hidden)} className="text-white/70 hover:text-white">
                      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-white/70">
                    Across {wallets.length} wallets · {wallets.map((w) => w.currency).join(", ")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur">
                    <Zap className="h-3 w-3 mr-1" /> Instant
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-white/80">
                    <TrendingUp className="h-3 w-3" /> +12.4% this month
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30"
                  onClick={() => setView("send")}
                >
                  <SendHorizontal className="h-4 w-4 mr-1.5" /> Send
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30"
                  onClick={() => setView("send")}
                >
                  <ArrowDownToLine className="h-4 w-4 mr-1.5" /> Request
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30"
                  onClick={() => setView("pay")}
                >
                  <QrCode className="h-4 w-4 mr-1.5" /> Scan & Pay
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30"
                  onClick={() => setView("wallets")}
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add Wallet
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Income/Expense mini */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="p-4 card-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <ArrowDownRight className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Income (MTD)</p>
                  <p className="text-lg font-bold tabular-nums">{formatMoney(income, "NGN")}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">+8.2%</Badge>
            </div>
          </Card>
          <Card className="p-4 card-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spending (MTD)</p>
                  <p className="text-lg font-bold tabular-nums">{formatMoney(expense, "NGN")}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-rose-600 border-rose-500/30">-3.1%</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => {
                setSendPrefill(a.prefill ? { recipient: a.prefill } : null);
                setView(a.id as any);
              }}
              className="group flex flex-col items-center gap-2"
            >
              <div className={cn("grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition group-hover:scale-105", a.color)}>
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Wallets strip + spending chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Wallets */}
        <Card className="p-5 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">My Wallets</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView("wallets")}>
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-2.5">
            {wallets.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            {wallets.slice(0, 4).map((w) => (
              <button
                key={w.id}
                onClick={() => setView("wallets")}
                className="flex w-full items-center justify-between rounded-xl border bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 font-bold text-primary">
                    {w.currency}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{w.label}</p>
                    <p className="text-xs text-muted-foreground">{w.type === "primary" ? "Main" : w.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{formatMoney(w.balance, w.currency)}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Spending chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Cash Flow</h3>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Inflow</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Outflow</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v: any) => formatMoney(Number(v), "NGN")}
              />
              <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} fill="url(#gIn)" />
              <Area type="monotone" dataKey="out" stroke="#f43f5e" strokeWidth={2} fill="url(#gOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent transactions + spending by category */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Activity</h3>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView("transactions")}>
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            {transactions.length === 0 && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            {transactions.slice(0, 6).map((t) => (
              <TxRow key={t.id} tx={t} onClick={() => setView("transactions")} />
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Spending by Category</h3>
          <p className="text-xs text-muted-foreground mb-3">This month</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={spendingByCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3}>
                {spendingByCat.map((_, i) => (
                  <Cell key={i} fill={["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"][i % 6]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatMoney(Number(v), "NGN")} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {spendingByCat.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e"][i % 6] }} />
                  <span className="capitalize">{c.name}</span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(c.value, "NGN")}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Savings goals preview + Budget progress */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Savings goals */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Savings Goals</h3>
              <p className="text-xs text-muted-foreground">Your progress</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView("savings")}>
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <DashboardSavingsPreview onClick={() => setView("savings")} />
        </Card>

        {/* Budget progress */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Monthly Budgets</h3>
              <p className="text-xs text-muted-foreground">Spending vs limit</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView("budgets")}>
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <DashboardBudgetsPreview onClick={() => setView("budgets")} />
        </Card>
      </div>

      {/* Financial Health Score */}
      <FinancialHealthWidget onClick={() => setView("analytics")} />

      {/* Cards promo */}
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-16 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-black">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Get a GaexPay Virtual Card</h3>
              <p className="text-sm text-white/70">Spend online globally. Instant issuance, zero monthly fees.</p>
            </div>
          </div>
          <Button variant="secondary" className="bg-white text-slate-900 hover:bg-white/90" onClick={() => setView("cards")}>
            Order Card <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function TxRow({ tx, onClick }: { tx: any; onClick?: () => void }) {
  const isCredit = tx.direction === "credit";
  const icon = isCredit ? ArrowDownRight : ArrowUpRight;
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-muted/50"
    >
      <div className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full",
        isCredit ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.counterpartyName || tx.description}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {tx.type} · {timeAgo(tx.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-semibold tabular-nums", isCredit ? "text-emerald-600" : "text-foreground")}>
          {isCredit ? "+" : "-"}{formatMoney(tx.amount, tx.currency)}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase">{tx.status}</p>
      </div>
    </button>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function build30DaySeries(transactions: any[]) {
  const days: { day: string; in: number; out: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayTx = transactions.filter((t) => new Date(t.createdAt) >= dayStart && new Date(t.createdAt) < dayEnd);
    days.push({
      day: dayStart.toLocaleDateString("en", { month: "short", day: "numeric" }),
      in: dayTx.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
      out: dayTx.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
    });
  }
  return days;
}

function buildCategoryBreakdown(transactions: any[]) {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (t.direction === "debit" && t.status === "completed") {
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function DashboardSavingsPreview({ onClick }: { onClick: () => void }) {
  const { data } = useFetch<{ goals: any[]; totalSaved: number }>("/api/savings-goals");
  const goals = (data?.goals ?? []).filter((g) => g.status !== "completed").slice(0, 3);
  if (!data) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (goals.length === 0) {
    return (
      <div className="grid place-items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">No active savings goals</p>
        <Button size="sm" variant="outline" onClick={onClick}>Create a goal</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {goals.map((g) => {
        const pct = (g.currentAmount / g.targetAmount) * 100;
        return (
          <button key={g.id} onClick={onClick} className="w-full text-left group">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} className="h-1.5 mt-1" />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatMoney(g.currentAmount, "NGN")} of {formatMoney(g.targetAmount, "NGN")}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DashboardBudgetsPreview({ onClick }: { onClick: () => void }) {
  const { data } = useFetch<{ budgets: any[]; totalLimit: number; totalSpent: number }>("/api/budgets");
  const budgets = (data?.budgets ?? []).slice(0, 4);
  if (!data) return <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (budgets.length === 0) {
    return (
      <div className="grid place-items-center py-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">No budgets set</p>
        <Button size="sm" variant="outline" onClick={onClick}>Create a budget</Button>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {budgets.map((b) => {
        const pct = (b.spent / b.limit) * 100;
        const over = pct > 100;
        const warn = pct >= 80 && pct <= 100;
        return (
          <button key={b.id} onClick={onClick} className="w-full text-left group">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">{b.category}</span>
              <span className={cn("tabular-nums", over ? "text-rose-600" : warn ? "text-amber-600" : "text-muted-foreground")}>
                {formatMoney(b.spent, "NGN")} / {formatMoney(b.limit, "NGN")}
              </span>
            </div>
            <Progress
              value={Math.min(pct, 100)}
              className={cn("h-1.5", over && "[&>div]:bg-rose-500", warn && "[&>div]:bg-amber-500")}
            />
          </button>
        );
      })}
    </div>
  );
}

function FinancialHealthWidget({ onClick }: { onClick: () => void }) {
  const { data } = useFetch<any>("/api/insights");
  if (!data) return <Card className="p-5"><Skeleton className="h-32" /></Card>;

  const { score, grade, insights, savingsRate, expenseRatio } = data;
  const gradeColors: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-600",
    teal: "from-teal-500 to-cyan-600",
    amber: "from-amber-500 to-orange-600",
    orange: "from-orange-500 to-rose-600",
    rose: "from-rose-500 to-red-600",
  };
  const gradient = gradeColors[grade.color] || gradeColors.emerald;

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        {/* Score gauge */}
        <div className="flex items-center gap-5">
          <div className={cn("relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br shadow-lg", gradient)}>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-900">
              <div className="text-center">
                <p className="text-3xl font-bold tabular-nums">{score}</p>
                <p className="text-[10px] text-white/60">/ 100</p>
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-900 shadow">
              {grade.letter}
            </div>
          </div>
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider">Financial Health</p>
            <h3 className="text-xl font-bold">{grade.label}</h3>
            <div className="mt-1 flex gap-3 text-xs text-white/70">
              <span>Savings: <span className="font-semibold text-white">{savingsRate.toFixed(1)}%</span></span>
              <span>Expense ratio: <span className="font-semibold text-white">{expenseRatio.toFixed(0)}%</span></span>
            </div>
          </div>
        </div>

        {/* Top insights */}
        <div className="flex-1 min-w-[250px] space-y-2">
          {insights.slice(0, 2).map((ins: any, i: number) => (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-white/10 px-3 py-2 backdrop-blur">
              <span className="text-lg">{ins.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{ins.title}</p>
                <p className="text-[11px] text-white/70 line-clamp-1">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30" onClick={onClick}>
          View Details <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
