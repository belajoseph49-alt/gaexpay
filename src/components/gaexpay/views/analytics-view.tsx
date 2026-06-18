"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES } from "@/lib/gaexpay";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

export function AnalyticsView() {
  const { data } = useFetch<{ transactions: any[] }>("/api/transactions?limit=200&days=90");
  const [range, setRange] = useState("30");
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
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
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
        <KpiCard icon={ArrowDownToLine} label="Total Inflow" value={formatMoney(totalIn, "NGN")} trend="+12.4%" up color="emerald" />
        <KpiCard icon={ArrowUpFromLine} label="Total Outflow" value={formatMoney(totalOut, "NGN")} trend="-3.1%" up={false} color="rose" />
        <KpiCard icon={ArrowLeftRight} label="Avg. Transaction" value={formatMoney(avgTx, "NGN")} trend="+5.2%" up color="amber" />
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
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> In</span>
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
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
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
              <Tooltip formatter={(v: any) => formatMoney(Number(v), "NGN")} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {cats.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#84cc16"][i % 7] }} />
                  <span className="capitalize">{c.name}</span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(c.value, "NGN")}</span>
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
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
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

      {/* Currency converter */}
      <CurrencyConverter />
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, trend, up, color }: any) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-500",
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
        <Badge variant="outline" className={up ? "text-emerald-600 border-emerald-500/30" : "text-rose-600 border-rose-500/30"}>
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
