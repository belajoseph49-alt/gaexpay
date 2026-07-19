"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES } from "@/lib/gaexpay";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

export function AnalyticsView() {
  const { t } = useTranslation();
  const { data } = useFetch<{ transactions: any[] }>("/api/transactions?limit=200&days=90");
  const [range, setRange] = useState("30");
  const { fmt, fmtCompact, symbol, currency: userCur } = useFormatMoney();
  const txs = data?.transactions ?? [];

  const days = range === "7" ? 7 : range === "90" ? 90 : 30;
  const filtered = txs.filter((t) => new Date(t.createdAt) >= new Date(Date.now() - days * 86400000));

  const series = buildSeries(filtered, days);
  const cats = buildCats(filtered);
  const methods = buildMethods(filtered);
  const hourly = buildHourly(filtered);

  const totalIn = filtered.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const avgTx = filtered.length ? (totalIn + totalOut) / filtered.length : 0;
  const successRate = filtered.length ? (filtered.filter((t) => t.status === "completed").length / filtered.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">Insights into your spending & income</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ArrowDownToLine} label="Total Inflow" value={fmt(totalIn)} trend="+12.4%" up color="violet" />
        <KpiCard icon={ArrowUpFromLine} label="Total Outflow" value={fmt(totalOut)} trend="-3.1%" up={false} color="rose" />
        <KpiCard icon={ArrowLeftRight} label="Avg. Transaction" value={fmt(avgTx)} trend="+5.2%" up color="amber" />
        <KpiCard icon={Wallet} label="Success Rate" value={`${successRate.toFixed(1)}%`} trend="+1.2%" up color="violet" />
      </div>

      {/* Inflow vs Outflow */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Inflow vs Outflow</h3>
            <p className="text-xs text-muted-foreground">Daily breakdown</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> In</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Out</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="aIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="aOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.floor(series.length / 8)} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v)} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => fmt(Number(v))} />
            <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} fill="url(#aIn)" name="Inflow" />
            <Area type="monotone" dataKey="out" stroke="#f43f5e" strokeWidth={2} fill="url(#aOut)" name="Outflow" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category breakdown */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Spending by Category</h3>
          <p className="text-xs text-muted-foreground mb-3">Where your money goes</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={cats} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                {cats.map((_, i) => (
                  <Cell key={i} fill={["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#84cc16"][i % 7]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {cats.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#84cc16"][i % 7] }} />
                  <span className="capitalize">{c.name}</span>
                </span>
                <span className="font-medium tabular-nums">{fmt(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment methods */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Payment Methods</h3>
          <p className="text-xs text-muted-foreground mb-3">Volume by method</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={methods} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => fmt(Number(v))} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Hourly activity */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1">Activity by Hour of Day</h3>
        <p className="text-xs text-muted-foreground mb-3">When you transact most</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Financial Health Score */}
      <FinancialHealthSection />

      {/* Currency converter */}
      <CurrencyConverter />
    </div>
  );
}

function FinancialHealthSection() {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { data } = useFetch<any>("/api/insights");
  if (!data) return <Card className="p-5"><Skeleton className="h-64" /></Card>;

  const { score, grade, insights, savingsRate, expenseRatio, scoreBreakdown, income, expenses, incomeChange, expenseChange, activeDays, topCategory, categoryCount } = data;
  const gradeColors: Record<string, string> = {
    emerald: "from-violet-500 to-purple-600",
    teal: "from-purple-500 to-purple-600",
    amber: "from-amber-500 to-orange-600",
    orange: "from-orange-500 to-rose-600",
    rose: "from-rose-500 to-red-600",
  };
  const gradient = gradeColors[grade.color] || gradeColors.emerald;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-lg">Financial Health Score</h3>
              <p className="text-sm text-white/60">AI-powered analysis of your financial habits</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={cn("relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br shadow-lg", gradient)}>
                <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-900">
                  <div className="text-center">
                    <p className="text-4xl font-bold tabular-nums">{score}</p>
                    <p className="text-[10px] text-white/60">/ 100</p>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-sm font-bold text-slate-900 shadow">
                  Grade {grade.letter}
                </div>
              </div>
              <div>
                <p className={cn("text-2xl font-bold")}>{grade.label}</p>
                <p className="text-sm text-white/60">{activeDays} active days · {categoryCount} categories</p>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid gap-3 sm:grid-cols-5">
            {scoreBreakdown.map((s: any) => (
              <div key={s.label} className="rounded-lg bg-white/10 p-3 backdrop-blur">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{s.icon}</span>
                  <span className="text-xs text-white/70">{s.label}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold tabular-nums">{Math.round(s.value)}</span>
                  <span className="text-xs text-white/50">/ {s.max}</span>
                </div>
                <Progress value={(s.value / s.max) * 100} className="h-1 mt-1.5 bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Monthly Income</p>
          <p className="text-lg font-bold tabular-nums">{fmt(income)}</p>
          {incomeChange !== 0 && (
            <p className={cn("text-xs mt-0.5", incomeChange > 0 ? "text-violet-600" : "text-rose-600")}>
              {incomeChange > 0 ? "↑" : "↓"} {Math.abs(incomeChange).toFixed(1)}% vs last month
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Monthly Expenses</p>
          <p className="text-lg font-bold tabular-nums">{fmt(expenses)}</p>
          {expenseChange !== 0 && (
            <p className={cn("text-xs mt-0.5", expenseChange > 0 ? "text-rose-600" : "text-violet-600")}>
              {expenseChange > 0 ? "↑" : "↓"} {Math.abs(expenseChange).toFixed(1)}% vs last month
            </p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Savings Rate</p>
          <p className={cn("text-lg font-bold tabular-nums", savingsRate >= 20 ? "text-violet-600" : savingsRate > 0 ? "text-amber-600" : "text-rose-600")}>
            {savingsRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Target: 20%+</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Expense Ratio</p>
          <p className={cn("text-lg font-bold tabular-nums", expenseRatio < 70 ? "text-violet-600" : expenseRatio < 100 ? "text-amber-600" : "text-rose-600")}>
            {expenseRatio.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">of income</p>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Smart Insights</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {insights.map((ins: any, i: number) => (
            <div key={i} className={cn(
              "flex items-start gap-2 rounded-lg border p-3",
              ins.type === "positive" ? "border-violet-500/30 bg-violet-500/5" :
              ins.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
              ins.type === "critical" ? "border-rose-500/30 bg-rose-500/5" :
              "border-sky-500/30 bg-sky-500/5"
            )}>
              <span className="text-xl shrink-0">{ins.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{ins.title}</p>
                <p className="text-xs text-muted-foreground">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Health Score History */}
      <FinancialHealthHistory />
    </div>
  );
}

function FinancialHealthHistory() {
  const { data } = useFetch<any>("/api/insights/history");
  if (!data) return <Card className="p-5"><Skeleton className="h-64" /></Card>;

  const { months, trend, avgScore, bestScore, worstScore } = data;
  const chartData = months.map((m: any) => ({
    label: m.label,
    score: m.score,
    savingsRate: m.savingsRate,
  }));

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Health Score History</h3>
          <p className="text-xs text-muted-foreground">6-month trend</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-center">
            <p className="text-muted-foreground">Avg</p>
            <p className="font-bold tabular-nums">{avgScore}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Best</p>
            <p className="font-bold tabular-nums text-violet-600">{bestScore}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground">Worst</p>
            <p className="font-bold tabular-nums text-rose-600">{worstScore}</p>
          </div>
          <Badge variant="outline" className={cn(trend >= 0 ? "text-violet-600 border-violet-500/30" : "text-rose-600 border-rose-500/30")}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)} pts
          </Badge>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
            formatter={(v: any, name: string) => name === "score" ? [`${v} / 100`, "Health Score"] : [`${v}%`, "Savings Rate"]}
          />
          <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", r: 5 }} activeDot={{ r: 7 }} name="score" />
          <Line type="monotone" dataKey="savingsRate" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#f59e0b", r: 3 }} name="savingsRate" />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-violet-500" /> Health Score</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-amber-500" style={{ borderTop: "2px dashed #f59e0b" }} /> Savings Rate %</span>
      </div>
    </Card>
  );
}

function KpiCard({ icon: Icon, label, value, trend, up, color }: any) {
  const colors: Record<string, string> = {
    emerald: "bg-violet-500/15 text-violet-500",
    rose: "bg-rose-500/15 text-rose-500",
    amber: "bg-amber-500/15 text-amber-500",
    violet: "bg-violet-500/15 text-violet-500",
  };
  return (
    <Card className="p-5 card-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={up ? "text-violet-600 border-violet-500/30" : "text-rose-600 border-rose-500/30"}>
          {up ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}{trend}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function CurrencyConverter() {
  const [from, setFrom] = useState("NGN");
  const [to, setTo] = useState("USD");
  const [amount, setAmount] = useState("100000");
  const [result, setResult] = useState<any>(null);

  const convert = async () => {
    const res = await fetch("/api/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, amount: Number(amount) }),
    });
    const data = await res.json();
    setResult(data);
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-1">Currency Converter</h3>
      <p className="text-xs text-muted-foreground mb-4">Real-time exchange rates</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">From</label>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-lg font-bold tabular-nums" />
        </div>
        <div className="flex items-end pb-2">
          <Button variant="outline" size="icon" onClick={() => { setFrom(to); setTo(from); }}>
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">To</label>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-lg font-bold tabular-nums">
            {result ? formatMoney(result.converted, to) : "—"}
          </div>
        </div>
        <div className="flex items-end pb-2">
          <Button onClick={convert}><DollarSign className="h-4 w-4 mr-1" /> Convert</Button>
        </div>
      </div>
      {result && (
        <p className="mt-3 text-xs text-muted-foreground">
          1 {from} = {result.rate.toFixed(4)} {to} · Rate updated live
        </p>
      )}
    </Card>
  );
}

function buildSeries(txs: any[], days: number) {
  const out: { label: string; in: number; out: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start.getTime() + 86400000);
    const dayTx = txs.filter((t) => new Date(t.createdAt) >= start && new Date(t.createdAt) < end);
    out.push({
      label: start.toLocaleDateString("en", { month: "short", day: "numeric" }),
      in: dayTx.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
      out: dayTx.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0),
    });
  }
  return out;
}

function buildCats(txs: any[]) {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.direction === "debit" && t.status === "completed") {
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
  }
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
}

function buildMethods(txs: any[]) {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.status === "completed" && t.method) {
      const label = t.method === "wallet" ? "Wallet" : t.method === "momo" ? "Mobile Money" : t.method === "bank" ? "Bank" : t.method === "qr" ? "QR Pay" : t.method === "card" ? "Card" : t.method;
      map[label] = (map[label] || 0) + t.amount;
    }
  }
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function buildHourly(txs: any[]) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }));
  for (const t of txs) {
    hours[new Date(t.createdAt).getHours()].count++;
  }
  return hours;
}
