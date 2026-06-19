"use client";

import { motion } from "framer-motion";
import {
  Landmark, Wallet, Lock, Clock, Activity, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Plus, Minus, Shield,
  Download, RefreshCw, ArrowLeftRight, Bitcoin, Coins,
  AlertTriangle, CheckCircle2, Lightbulb,
  ArrowRight, Gauge, Layers, BarChart3, PieChart as PieIcon, Flame,
  Building2, Snowflake, Eye, Send,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { AnimatedNumber } from "../animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

/* ------------------------- helpers ------------------------- */
const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));
const fmtUSD = (n: number, compact = false) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};
const fmtNGN = (n: number, compact = false) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `₦${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(1)}K`;
    return `₦${n.toFixed(0)}`;
  }
  return `₦${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};
const timeAgoShort = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* ------------------------- types ------------------------- */
interface TreasuryData {
  totalReserves: {
    totalUSD: number;
    totalNGN: number;
    fiatUSD: number;
    cryptoUSD: number;
    change24hPct: number;
    lastUpdated: string;
    breakdownByCurrency: {
      code: string; name: string; symbol: string; flag: string;
      balance: number; usdValue: number; type: string;
    }[];
  };
  liquidity: {
    availableUSD: number; availableNGN: number;
    lockedUSD: number; lockedNGN: number;
    pendingSettlementsUSD: number; pendingSettlementsNGN: number;
    pendingSettlementsCount: number;
    reserveRatio: number;
    customerLiabilitiesUSD: number;
    total30dOutflowUSD: number;
    status: "healthy" | "watch" | "critical";
  };
  fxExposure: {
    netPositions: {
      code: string; flag: string; netUSD: number; netNGN: number;
      direction: "long" | "short";
    }[];
    exposureByPair: {
      pair: string; hedgedUSD: number; unhedgedUSD: number;
      totalUSD: number; hedgeRatio: number; instruments: string[]; intensity: number;
    }[];
    hedgedUSD: number;
    unhedgedUSD: number;
    totalExposureUSD: number;
    overallHedgeRatio: number;
  };
  settlementAccounts: {
    id: string; bank: string; accountNumber: string; swift: string;
    currency: string; label: string; balance: number; balanceUSD: number;
    available: number; locked: number;
    status: "active" | "low-balance" | "frozen" | "monitoring";
    lastReconciled: string;
  }[];
  currencyReserves: {
    code: string; name: string; symbol: string; flag: string;
    balance: number; usdValue: number; type: string;
    threshold: number; ratio: number; status: "healthy" | "low" | "critical";
    utilizationPct: number;
  }[];
  cashFlow: {
    series: { date: string; label: string; inflow: number; outflow: number; net: number }[];
    totalInflow30d: number;
    totalOutflow30d: number;
    netCashFlow30d: number;
    avgDailyInflow: number;
    avgDailyOutflow: number;
  };
  rebalancing: {
    id: string; type: "top-up" | "reduce" | "hedge" | "rebalance";
    sourceCurrency: string; targetCurrency: string;
    amountUSD: number; amountSource: number; amountTarget: number;
    reason: string; priority: "high" | "medium" | "low";
    estimatedCompletion: string;
  }[];
  cryptoReserves: {
    code: string; name: string; symbol: string; icon: string; color: string;
    amount: number; priceUSD: number; usdValue: number; change24h: number;
    coldWallet: string; hotWallet: string; network: string;
  }[];
  allocation: {
    code: string; name: string; usdValue: number; pct: number; type: string;
  }[];
  generatedAt: string;
}

/* ------------------------- config maps ------------------------- */
const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  healthy: { color: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-500", label: "Healthy" },
  low: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", label: "Low" },
  critical: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", dot: "bg-rose-500", label: "Critical" },
  watch: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", label: "Watch" },
  active: { color: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-500", label: "Active" },
  "low-balance": { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", label: "Low Balance" },
  frozen: { color: "text-slate-500", bg: "bg-slate-500/15 border-slate-500/30", dot: "bg-slate-400", label: "Frozen" },
  monitoring: { color: "text-sky-600", bg: "bg-sky-500/15 border-sky-500/30", dot: "bg-sky-500", label: "Monitoring" },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  high: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", dot: "bg-rose-500", label: "High Priority" },
  medium: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", label: "Medium" },
  low: { color: "text-sky-600", bg: "bg-sky-500/15 border-sky-500/30", dot: "bg-sky-500", label: "Low Priority" },
};

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  "top-up": { color: "text-emerald-600", bg: "bg-emerald-500/15", icon: Plus, label: "Top-up" },
  "reduce": { color: "text-amber-600", bg: "bg-amber-500/15", icon: Minus, label: "Reduce" },
  "hedge": { color: "text-violet-600", bg: "bg-violet-500/15", icon: Shield, label: "Hedge" },
  "rebalance": { color: "text-sky-600", bg: "bg-sky-500/15", icon: ArrowLeftRight, label: "Rebalance" },
};

const ALLOCATION_COLORS = [
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9",
  "#f59e0b", "#f97316", "#ef4444", "#f43f5e",
  "#8b5cf6", "#a855f7", "#ec4899", "#84cc16",
  "#22c55e", "#eab308",
];

/* =========================================================
 *  Main view
 * ========================================================= */
export function TreasuryView() {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { data, loading, reload } = useFetch<TreasuryData>("/api/treasury");

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
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Treasury & Liquidity</h1>
            <p className="text-sm text-muted-foreground">
              Multi-currency reserves · FX exposure · settlement · liquidity positions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline" className="border-rose-500/30 text-rose-600">
            <Lock className="h-3 w-3 mr-1" /> L4 Treasury
          </Badge>
          <Button size="sm" variant="outline" onClick={() => reload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Treasury report exported (PDF, real-time)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </motion.div>

      {loading || !data ? (
        <TreasurySkeleton />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto bg-muted/50">
            <TabsTrigger value="overview" className="gap-1.5">
              <Gauge className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="reserves" className="gap-1.5">
              <Coins className="h-4 w-4" /> Reserves
              {data.currencyReserves.filter((c) => c.status !== "healthy").length > 0 && (
                <Badge className="h-4 px-1 text-[9px] bg-rose-500 text-white border-0">
                  {data.currencyReserves.filter((c) => c.status !== "healthy").length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fx" className="gap-1.5">
              <ArrowLeftRight className="h-4 w-4" /> FX Exposure
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-1.5">
              <Activity className="h-4 w-4" /> Cash Flow
            </TabsTrigger>
            <TabsTrigger value="settlements" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Settlements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <OverviewTab data={data} />
          </TabsContent>
          <TabsContent value="reserves" className="mt-5">
            <ReservesTab data={data} />
          </TabsContent>
          <TabsContent value="fx" className="mt-5">
            <FxExposureTab data={data} />
          </TabsContent>
          <TabsContent value="cashflow" className="mt-5">
            <CashFlowTab data={data} />
          </TabsContent>
          <TabsContent value="settlements" className="mt-5">
            <SettlementsTab data={data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* =========================================================
 *  Tab 1: Overview
 * ========================================================= */
function OverviewTab({ data }: { data: TreasuryData }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const tr = data.totalReserves;
  const liq = data.liquidity;
  const ratioGauge = [
    { name: "Reserve Ratio", value: Math.min(liq.reserveRatio, 220), fill: liq.reserveRatio >= 100 ? "#10b981" : liq.reserveRatio >= 80 ? "#f59e0b" : "#ef4444" },
  ];
  const liqStatus = STATUS_CONFIG[liq.status];

  return (
    <div className="space-y-5">
      {/* Total Reserves Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/50 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-3">
          {/* Total USD value */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-emerald-300">
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                  Total Treasury Reserves
                </p>
                <p className="text-[11px] text-slate-400">All currencies + crypto · updated {timeAgoShort(tr.lastUpdated)}</p>
              </div>
            </div>
            <p className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
              <AnimatedNumber value={tr.totalUSD} prefix="$" duration={1500} />
            </p>
            <p className="mt-1 text-base font-medium text-slate-300">
              ≈ <AnimatedNumber value={tr.totalNGN} prefix={symbol} duration={1500} /> NGN
            </p>

            {/* Change + breakdown */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge className={cn("border-0", tr.change24hPct >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
                {tr.change24hPct >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {tr.change24hPct >= 0 ? "+" : ""}<AnimatedNumber value={tr.change24hPct} duration={1400} decimals={2} suffix="%" />
              </Badge>
              <span className="text-[11px] text-slate-400">24h change</span>
              <span className="text-slate-700">·</span>
              <span className="text-[11px] text-slate-400">
                Fiat: <span className="font-semibold text-emerald-300">{fmtUSD(tr.fiatUSD, true)}</span>
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-[11px] text-slate-400">
                Crypto: <span className="font-semibold text-amber-300">{fmtUSD(tr.cryptoUSD, true)}</span>
              </span>
            </div>

            {/* Mini breakdown bars */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {tr.breakdownByCurrency.slice(0, 6).map((c) => {
                const maxUsd = Math.max(...tr.breakdownByCurrency.map((x) => x.usdValue));
                const pct = maxUsd > 0 ? (c.usdValue / maxUsd) * 100 : 0;
                return (
                  <div key={c.code} className="rounded-lg bg-white/5 p-2.5 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-300">{c.flag} {c.code}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{fmtUSD(c.usdValue, true)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reserve ratio gauge */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-emerald-300/80">
              Reserve Coverage Ratio
            </p>
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="100%"
                data={ratioGauge}
                startAngle={90}
                endAngle={-270}
              >
                <defs>
                  <linearGradient id="ratioGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
                <PolarAngleAxis type="number" domain={[0, 220]} tick={false} />
                <RadialBar
                  background={{ fill: "rgba(255,255,255,0.06)" }}
                  dataKey="value"
                  cornerRadius={20}
                  fill="url(#ratioGrad)"
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="-mt-32 text-center">
              <p className="text-3xl font-bold tabular-nums text-white">
                <AnimatedNumber value={liq.reserveRatio} duration={1400} decimals={1} suffix="%" />
              </p>
              <p className="text-[10px] text-slate-400">vs stress outflow</p>
            </div>
            <div className="mt-24">
              <Badge className={cn("border-0", liqStatus.bg, liqStatus.color)}>
                <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", liqStatus.dot)} />
                {liqStatus.label}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Liquidity Position: 4 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LiquidityCard
          icon={<Wallet className="h-5 w-5" />}
          label="Available Liquidity"
          valueUsd={liq.availableUSD}
          valueNgn={liq.availableNGN}
          color="emerald"
          delay={0}
          footer={<>Of total reserves ({Math.round((liq.availableUSD / (liq.availableUSD + liq.lockedUSD)) * 100)}%)</>}
        />
        <LiquidityCard
          icon={<Lock className="h-5 w-5" />}
          label="Locked Liquidity"
          valueUsd={liq.lockedUSD}
          valueNgn={liq.lockedNGN}
          color="amber"
          delay={0.05}
          footer={<>Card holds · settlement holds · escrow</>}
        />
        <LiquidityCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Settlements"
          valueUsd={liq.pendingSettlementsUSD}
          valueNgn={liq.pendingSettlementsNGN}
          color="sky"
          delay={0.1}
          footer={<>{liq.pendingSettlementsCount} transaction(s) in-flight</>}
        />
        <LiquidityCard
          icon={<Gauge className="h-5 w-5" />}
          label="Reserve Ratio"
          valueUsd={liq.reserveRatio}
          valueNgn={0}
          color={liq.reserveRatio >= 100 ? "emerald" : liq.reserveRatio >= 80 ? "amber" : "rose"}
          delay={0.15}
          isPercent
          footer={<>Stress coverage · target ≥ 100%</>}
        />
      </div>

      {/* Two-column: Allocation pie + Rebalancing recommendations */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Reserve Allocation pie */}
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-emerald-500" /> Reserve Allocation
            </h3>
            <p className="text-xs text-muted-foreground">Distribution of treasury reserves across all assets</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.allocation.filter((a) => a.usdValue > 0)}
                dataKey="usdValue"
                nameKey="code"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                stroke="none"
              >
                {data.allocation.filter((a) => a.usdValue > 0).map((entry, idx) => (
                  <Cell key={entry.code} fill={ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, _name: any, props: any) => [
                  `${fmtUSD(v)} (${props.payload.pct}%)`,
                  props.payload.name,
                ]}
                labelStyle={{ color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 max-h-32 overflow-y-auto no-scrollbar">
            {data.allocation.filter((a) => a.usdValue > 0).map((a, idx) => (
              <div key={a.code} className="flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate">{a.code}</p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">{a.pct}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Rebalancing Recommendations */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Rebalancing Recommendations
              </h3>
              <p className="text-xs text-muted-foreground">AI-driven actions to optimize liquidity & hedging</p>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              {data.rebalancing.length} active
            </Badge>
          </div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto no-scrollbar">
            {data.rebalancing.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                All reserves within optimal range. No rebalancing needed.
              </div>
            )}
            {data.rebalancing.map((r, i) => {
              const cfg = TYPE_CONFIG[r.type];
              const prio = PRIORITY_CONFIG[r.priority];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-lift rounded-lg border bg-card/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", cfg.bg, cfg.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[11px] font-semibold">
                          {r.sourceCurrency} → {r.targetCurrency}
                        </p>
                        <Badge className={cn("h-4 px-1 text-[9px] border-0", cfg.bg, cfg.color)}>{cfg.label}</Badge>
                        <Badge className={cn("h-4 px-1 text-[9px] border-0", prio.bg, prio.color)}>{prio.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {fmtUSD(r.amountUSD, true)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {r.reason}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          <Clock className="inline h-2.5 w-2.5 mr-1" />
                          {r.estimatedCompletion}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => toast.success(`Rebalancing order ${r.id} queued — ${r.sourceCurrency} → ${r.targetCurrency} ${fmtUSD(r.amountUSD, true)}`)}
                        >
                          Execute <ArrowRight className="h-2.5 w-2.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Crypto Reserves */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-amber-500" /> Crypto Reserves
            </h3>
            <p className="text-xs text-muted-foreground">Live CoinGecko prices · cold + hot wallet holdings</p>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-500/30">
            Total: {fmtUSD(tr.cryptoUSD, true)}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.cryptoReserves.map((c, i) => {
            const allocPct = tr.cryptoUSD > 0 ? (c.usdValue / tr.cryptoUSD) * 100 : 0;
            const positive = c.change24h >= 0;
            return (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-lift rounded-xl border bg-card/50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.code === "BTC" ? "₿" : c.code === "ETH" ? "Ξ" : c.code === "PI" ? "π" : c.code === "USDT" ? "₮" : "₮"}
                    </span>
                    <div>
                      <p className="text-xs font-bold">{c.code}</p>
                      <p className="text-[10px] text-muted-foreground">{c.network}</p>
                    </div>
                  </div>
                  <Badge className={cn("border-0", positive ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600")}>
                    {positive ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />}
                    {Math.abs(c.change24h).toFixed(2)}%
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Holdings</p>
                <p className="text-sm font-bold tabular-nums">
                  {c.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })} {c.code}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1.5">USD Value</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmtUSD(c.usdValue, true)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">@ ${c.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] font-medium">{allocPct.toFixed(1)}% of crypto</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, allocPct * 2)}%`, backgroundColor: c.color }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Liquidity Card helper
 * ========================================================= */
function LiquidityCard({
  icon, label, valueUsd, valueNgn, color, delay, footer, isPercent,
}: {
  icon: React.ReactNode; label: string; valueUsd: number; valueNgn: number;
  color: "emerald" | "amber" | "sky" | "rose"; delay: number;
  footer: React.ReactNode; isPercent?: boolean;
}) {
  const colors = {
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 ring-emerald-500/20",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 ring-amber-500/20",
    sky: "from-sky-500/15 to-sky-500/5 text-sky-600 ring-sky-500/20",
    rose: "from-rose-500/15 to-rose-500/5 text-rose-600 ring-rose-500/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn("card-lift relative overflow-hidden rounded-xl bg-gradient-to-br p-4 ring-1", colors[color])}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 dark:bg-black/10">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {isPercent ? (
          <AnimatedNumber value={valueUsd} duration={1400} decimals={1} suffix="%" />
        ) : (
          <AnimatedNumber value={valueUsd} prefix="$" duration={1400} />
        )}
      </p>
      {!isPercent && valueNgn > 0 && (
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          ≈ ₦<AnimatedNumber value={valueNgn} duration={1400} />
        </p>
      )}
      <div className="mt-2 text-[10px] text-muted-foreground">{footer}</div>
    </motion.div>
  );
}

/* =========================================================
 *  Tab 2: Reserves (currency reserve table + allocation)
 * ========================================================= */
function ReservesTab({ data }: { data: TreasuryData }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  return (
    <div className="space-y-5">
      {/* Reserves hero summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat label="Total Reserves" value={data.totalReserves.totalUSD} prefix="$" icon={<Wallet className="h-4 w-4" />} color="emerald" />
          <HeroStat label="Fiat Reserves" value={data.totalReserves.fiatUSD} prefix="$" icon={<Coins className="h-4 w-4" />} color="teal" />
          <HeroStat label="Crypto Reserves" value={data.totalReserves.cryptoUSD} prefix="$" icon={<Bitcoin className="h-4 w-4" />} color="amber" />
          <HeroStat label="Currencies Tracked" value={data.currencyReserves.length + data.cryptoReserves.length} icon={<Layers className="h-4 w-4" />} color="sky" />
        </div>
      </motion.div>

      {/* Currency Reserves table */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-500" /> Currency Reserves
            </h3>
            <p className="text-xs text-muted-foreground">Per-currency reserve health against minimum thresholds</p>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
              {data.currencyReserves.filter((c) => c.status === "healthy").length} Healthy
            </Badge>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              {data.currencyReserves.filter((c) => c.status === "low").length} Low
            </Badge>
            <Badge variant="outline" className="text-rose-600 border-rose-500/30">
              {data.currencyReserves.filter((c) => c.status === "critical").length} Critical
            </Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Currency</th>
                <th className="pb-2 pr-3 font-medium text-right">Balance</th>
                <th className="pb-2 pr-3 font-medium text-right">USD Value</th>
                <th className="pb-2 pr-3 font-medium text-right">Threshold</th>
                <th className="pb-2 pr-3 font-medium">Coverage</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.currencyReserves.map((c, i) => {
                const status = STATUS_CONFIG[c.status];
                const actionLabel = c.status === "critical" ? "Top-up now" : c.status === "low" ? "Top-up" : c.ratio > 2.5 ? "Reduce" : "Rebalance";
                const actionColor = c.status === "critical" ? "bg-rose-600 hover:bg-rose-700 text-white" : c.status === "low" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white";
                return (
                  <motion.tr
                    key={c.code}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{c.flag}</span>
                        <div>
                          <p className="text-xs font-semibold">{c.code}</p>
                          <p className="text-[10px] text-muted-foreground">{c.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      <p className="text-xs font-semibold">{c.symbol}{fmtNum(c.balance)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.code}</p>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      <p className="text-xs font-semibold">{fmtUSD(c.usdValue, true)}</p>
                      <p className="text-[10px] text-muted-foreground">≈ {symbol}{fmtNum(c.usdValue * 1535)}</p>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      <p className="text-xs">{c.symbol}{fmtNum(c.threshold)}</p>
                      <p className="text-[10px] text-muted-foreground">min</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              c.status === "healthy" ? "bg-emerald-500" : c.status === "low" ? "bg-amber-500" : "bg-rose-500",
                            )}
                            style={{ width: `${Math.min(100, c.ratio * 40)}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{c.ratio}×</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("text-[10px]", status.color, status.bg)}>
                        <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", status.dot)} />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        className={cn("h-7 px-2 text-[10px]", actionColor)}
                        onClick={() => toast.success(`${actionLabel} order queued for ${c.code} — ${c.symbol}${fmtNum(c.threshold * 1.5)}`)}
                      >
                        {actionLabel}
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Crypto Reserves detail */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-amber-500" /> Crypto Reserve Holdings
          </h3>
          <p className="text-xs text-muted-foreground">Cold + hot wallet breakdown · real CoinGecko pricing</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.cryptoReserves.map((c, i) => {
            const positive = c.change24h >= 0;
            return (
              <motion.div
                key={c.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-lift rounded-xl border bg-card/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-lg text-base font-bold text-white"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.code === "BTC" ? "₿" : c.code === "ETH" ? "Ξ" : c.code === "PI" ? "π" : "₮"}
                    </span>
                    <div>
                      <p className="text-xs font-bold">{c.code}</p>
                      <p className="text-[10px] text-muted-foreground">{c.name}</p>
                    </div>
                  </div>
                  <Badge className={cn("border-0", positive ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600")}>
                    {positive ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />}
                    {Math.abs(c.change24h).toFixed(2)}%
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Holdings</p>
                    <p className="font-bold tabular-nums">{c.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Unit Price</p>
                    <p className="font-bold tabular-nums">${c.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="mt-2 border-t pt-2">
                  <p className="text-[10px] text-muted-foreground">USD Value</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtUSD(c.usdValue)}</p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Snowflake className="h-3 w-3" />
                  <span className="font-mono">{c.coldWallet}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span className="font-mono">{c.hotWallet}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Hero Stat helper
 * ========================================================= */
function HeroStat({
  label, value, prefix, icon, color,
}: {
  label: string; value: number; prefix?: string; icon: React.ReactNode;
  color: "emerald" | "teal" | "amber" | "sky";
}) {
  const colors = {
    emerald: "text-emerald-300 bg-emerald-500/10",
    teal: "text-teal-300 bg-teal-500/10",
    amber: "text-amber-300 bg-amber-500/10",
    sky: "text-sky-300 bg-sky-500/10",
  };
  return (
    <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg", colors[color])}>
          {icon}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300/80">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white">
        <AnimatedNumber value={value} prefix={prefix} duration={1400} />
      </p>
    </div>
  );
}

/* =========================================================
 *  Tab 3: FX Exposure
 * ========================================================= */
function FxExposureTab({ data }: { data: TreasuryData }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const fx = data.fxExposure;
  const maxNet = Math.max(...fx.netPositions.map((p) => Math.abs(p.netUSD)), 1);

  return (
    <div className="space-y-5">
      {/* Exposure hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 p-6 ring-1 ring-teal-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat label="Total Exposure" value={fx.totalExposureUSD} prefix="$" icon={<ArrowLeftRight className="h-4 w-4" />} color="teal" />
          <HeroStat label="Hedged" value={fx.hedgedUSD} prefix="$" icon={<Shield className="h-4 w-4" />} color="emerald" />
          <HeroStat label="Unhedged" value={fx.unhedgedUSD} prefix="$" icon={<AlertTriangle className="h-4 w-4" />} color="amber" />
          <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
                <Gauge className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300/80">Overall Hedge Ratio</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-white">
              <AnimatedNumber value={fx.overallHedgeRatio} duration={1400} decimals={1} suffix="%" />
            </p>
          </div>
        </div>
      </motion.div>

      {/* Net Position bar chart + Hedged vs Unhedged pie */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Net position by currency */}
        <Card className="p-5 lg:col-span-3">
          <div className="mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" /> Net Position by Currency
            </h3>
            <p className="text-xs text-muted-foreground">30-day net inflow / outflow per currency (USD)</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fx.netPositions} margin={{ left: -5 }}>
              <defs>
                <linearGradient id="netLong" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="netShort" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtUSD(v, true)} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, _n: any, props: any) => [`${fmtUSD(v)} · ${props.payload.direction}`, "Net Position"]}
                labelStyle={{ color: "#94a3b8" }}
                cursor={{ fill: "rgba(16,185,129,0.08)" }}
              />
              <Bar dataKey="netUSD" radius={[6, 6, 0, 0]}>
                {fx.netPositions.map((p) => (
                  <Cell key={p.code} fill={p.direction === "long" ? "url(#netLong)" : "url(#netShort)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Hedged vs Unhedged pie */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-emerald-500" /> Hedged vs Unhedged
            </h3>
            <p className="text-xs text-muted-foreground">Overall FX hedge coverage</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: "Hedged", value: fx.hedgedUSD, color: "#10b981" },
                  { name: "Unhedged", value: fx.unhedgedUSD, color: "#f43f5e" },
                ].filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                stroke="none"
              >
                <Cell key="hedged" fill="#10b981" />
                <Cell key="unhedged" fill="#f43f5e" />
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, name: any) => [fmtUSD(v), name]}
                labelStyle={{ color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-2 text-center">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mb-1" />
              <p className="text-[10px] text-muted-foreground">Hedged</p>
              <p className="text-sm font-semibold tabular-nums text-emerald-600">{fmtUSD(fx.hedgedUSD, true)}</p>
              <p className="text-[10px] text-muted-foreground">{fx.overallHedgeRatio}%</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500 mb-1" />
              <p className="text-[10px] text-muted-foreground">Unhedged</p>
              <p className="text-sm font-semibold tabular-nums text-rose-600">{fmtUSD(fx.unhedgedUSD, true)}</p>
              <p className="text-[10px] text-muted-foreground">{(100 - fx.overallHedgeRatio).toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Exposure Heatmap by pair */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" /> Exposure Heatmap by Currency Pair
          </h3>
          <p className="text-xs text-muted-foreground">Color intensity = total exposure magnitude · hedge ratio shown as %</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fx.exposureByPair.map((p, i) => {
            // Color intensity based on exposure magnitude
            const intensity = p.intensity;
            const bg = p.hedgeRatio >= 50
              ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})`
              : p.hedgeRatio >= 25
                ? `rgba(245, 158, 11, ${0.1 + intensity * 0.3})`
                : `rgba(244, 63, 94, ${0.1 + intensity * 0.3})`;
            const borderColor = p.hedgeRatio >= 50 ? "rgba(16,185,129,0.4)" : p.hedgeRatio >= 25 ? "rgba(245,158,11,0.4)" : "rgba(244,63,94,0.4)";
            return (
              <motion.div
                key={p.pair}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl p-4 ring-1"
                style={{ backgroundColor: bg, borderColor }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{p.pair}</p>
                  <Badge className={cn(
                    "border-0 text-[10px]",
                    p.hedgeRatio >= 50 ? "bg-emerald-500/30 text-emerald-100" : p.hedgeRatio >= 25 ? "bg-amber-500/30 text-amber-100" : "bg-rose-500/30 text-rose-100",
                  )}>
                    {p.hedgeRatio}% hedged
                  </Badge>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-300/80">Total Exposure</p>
                <p className="text-xl font-bold tabular-nums text-white">{fmtUSD(p.totalUSD, true)}</p>

                {/* Hedge progress bar */}
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="bg-emerald-500" style={{ width: `${p.hedgeRatio}%` }} />
                  <div className="bg-rose-500/70" style={{ width: `${100 - p.hedgeRatio}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-300/80">
                  <span>🟢 {fmtUSD(p.hedgedUSD, true)}</span>
                  <span>🔴 {fmtUSD(p.unhedgedUSD, true)}</span>
                </div>

                {p.instruments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.instruments.map((inst) => (
                      <span key={inst} className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] text-white">
                        {inst}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Detailed FX position table */}
      <Card className="p-5">
        <div className="mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" /> Net Position Detail
          </h3>
          <p className="text-xs text-muted-foreground">Long / short exposure per currency</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Currency</th>
                <th className="pb-2 pr-3 font-medium">Direction</th>
                <th className="pb-2 pr-3 font-medium text-right">Net USD</th>
                <th className="pb-2 pr-3 font-medium text-right">Net NGN</th>
                <th className="pb-2 pr-3 font-medium">Magnitude</th>
              </tr>
            </thead>
            <tbody>
              {fx.netPositions.map((p, i) => (
                <motion.tr
                  key={p.code}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.flag}</span>
                      <span className="text-xs font-semibold">{p.code}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        p.direction === "long"
                          ? "text-emerald-600 bg-emerald-500/15 border-emerald-500/30"
                          : "text-rose-600 bg-rose-500/15 border-rose-500/30",
                      )}
                    >
                      {p.direction === "long" ? <ArrowUpRight className="h-2.5 w-2.5 mr-1" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-1" />}
                      {p.direction === "long" ? "Long" : "Short"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-xs font-semibold">
                    {p.netUSD >= 0 ? "+" : "−"}{fmtUSD(Math.abs(p.netUSD))}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-xs">
                    {p.netNGN >= 0 ? "+" : "−"}{symbol}{fmtNum(Math.abs(p.netNGN))}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="w-32 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", p.direction === "long" ? "bg-emerald-500" : "bg-rose-500")}
                        style={{ width: `${(Math.abs(p.netUSD) / maxNet) * 100}%` }}
                      />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Tab 4: Cash Flow
 * ========================================================= */
function CashFlowTab({ data }: { data: TreasuryData }) {
  const cf = data.cashFlow;

  return (
    <div className="space-y-5">
      {/* Cash flow summary hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat label="Total Inflow (30d)" value={cf.totalInflow30d} prefix="$" icon={<ArrowDownRight className="h-4 w-4" />} color="emerald" />
          <HeroStat label="Total Outflow (30d)" value={cf.totalOutflow30d} prefix="$" icon={<ArrowUpRight className="h-4 w-4" />} color="amber" />
          <HeroStat label="Net Cash Flow" value={cf.netCashFlow30d} prefix="$" icon={<Activity className="h-4 w-4" />} color="teal" />
          <HeroStat label="Avg Daily Inflow" value={cf.avgDailyInflow} prefix="$" icon={<TrendingUp className="h-4 w-4" />} color="sky" />
        </div>
      </motion.div>

      {/* 30-day cash flow area chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> 30-Day Cash Flow
            </h3>
            <p className="text-xs text-muted-foreground">Daily inflow vs outflow across all currencies (USD-normalized)</p>
          </div>
          <div className="flex gap-1.5">
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" /> Inflow
            </Badge>
            <Badge variant="outline" className="text-rose-600 border-rose-500/30">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500 mr-1" /> Outflow
            </Badge>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={cf.series}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtUSD(v, true)} />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
              formatter={(v: any, name: any) => [fmtUSD(v), name === "inflow" ? "Inflow" : "Outflow"]}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2} fill="url(#inflowGrad)" />
            <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fill="url(#outflowGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Net cash flow bar chart */}
      <Card className="p-5">
        <div className="mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-500" /> Daily Net Cash Flow
          </h3>
          <p className="text-xs text-muted-foreground">Green = net positive · Red = net outflow</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cf.series}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtUSD(v, true)} />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
              formatter={(v: any) => [fmtUSD(v), "Net"]}
              labelStyle={{ color: "#94a3b8" }}
              cursor={{ fill: "rgba(139,92,246,0.08)" }}
            />
            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
              {cf.series.map((d, idx) => (
                <Cell key={idx} fill={d.net >= 0 ? "#10b981" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Daily flow table */}
      <Card className="p-5">
        <div className="mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-500" /> Daily Flow Detail
          </h3>
          <p className="text-xs text-muted-foreground">30-day breakdown</p>
        </div>
        <div className="max-h-96 overflow-y-auto no-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium text-right">Inflow</th>
                <th className="pb-2 pr-3 font-medium text-right">Outflow</th>
                <th className="pb-2 pr-3 font-medium text-right">Net</th>
                <th className="pb-2 font-medium">Flow</th>
              </tr>
            </thead>
            <tbody>
              {cf.series.slice().reverse().map((d, i) => {
                const maxFlow = Math.max(...cf.series.map((x) => Math.max(x.inflow, x.outflow)), 1);
                return (
                  <tr key={d.date} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pr-3 text-xs font-medium">{d.label}</td>
                    <td className="py-2 pr-3 text-right text-xs tabular-nums text-emerald-600">{fmtUSD(d.inflow, true)}</td>
                    <td className="py-2 pr-3 text-right text-xs tabular-nums text-rose-600">{fmtUSD(d.outflow, true)}</td>
                    <td className={cn("py-2 pr-3 text-right text-xs font-semibold tabular-nums", d.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {d.net >= 0 ? "+" : "−"}{fmtUSD(Math.abs(d.net), true)}
                    </td>
                    <td className="py-2">
                      <div className="flex w-24 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="bg-emerald-500" style={{ width: `${(d.inflow / maxFlow) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Tab 5: Settlements
 * ========================================================= */
function SettlementsTab({ data }: { data: TreasuryData }) {
  const accounts = data.settlementAccounts;
  const totalBalanceUSD = accounts.reduce((s, a) => s + a.balanceUSD, 0);
  const totalAvailableUSD = accounts.reduce((s, a) => s + (a.balanceUSD * (a.available / a.balance)), 0);
  const totalLockedUSD = accounts.reduce((s, a) => s + (a.balanceUSD * (a.locked / a.balance)), 0);

  return (
    <div className="space-y-5">
      {/* Settlement hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 p-6 ring-1 ring-teal-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HeroStat label="Total Balance" value={totalBalanceUSD} prefix="$" icon={<Building2 className="h-4 w-4" />} color="teal" />
          <HeroStat label="Available" value={totalAvailableUSD} prefix="$" icon={<Wallet className="h-4 w-4" />} color="emerald" />
          <HeroStat label="Locked" value={totalLockedUSD} prefix="$" icon={<Lock className="h-4 w-4" />} color="amber" />
          <HeroStat label="Active Accounts" value={accounts.filter((a) => a.status === "active").length} icon={<CheckCircle2 className="h-4 w-4" />} color="sky" />
        </div>
      </motion.div>

      {/* Settlement accounts list */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-500" /> Settlement Accounts
            </h3>
            <p className="text-xs text-muted-foreground">{accounts.length} nostro & operating accounts across currencies</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => toast.info("Initiating reconciliation sweep across all accounts…")}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reconcile All
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {accounts.map((a, i) => {
            const status = STATUS_CONFIG[a.status];
            const lockedPct = a.balance > 0 ? (a.locked / a.balance) * 100 : 0;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-lift rounded-xl border bg-card/50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold">{a.bank}</p>
                      <p className="text-[10px] text-muted-foreground">{a.label}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", status.color, status.bg)}>
                    <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Account Number</p>
                    <p className="text-xs font-mono font-semibold">{a.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">SWIFT / Currency</p>
                    <p className="text-xs font-mono font-semibold">{a.swift} · {a.currency}</p>
                  </div>
                </div>

                <div className="mt-3 border-t pt-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Balance</p>
                      <p className="text-lg font-bold tabular-nums">
                        {a.currency === "NGN" ? "₦" : a.currency === "USD" ? "$" : a.currency === "EUR" ? "€" : a.currency === "GBP" ? "£" : a.currency === "GHS" ? "₵" : a.currency === "KES" ? "KSh" : a.currency === "ZAR" ? "R" : ""}
                        {fmtNum(a.balance)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">≈ {fmtUSD(a.balanceUSD, true)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Available</p>
                      <p className="text-sm font-semibold tabular-nums text-emerald-600">{fmtUSD(a.balanceUSD * (a.available / a.balance), true)}</p>
                      <p className="text-[10px] text-muted-foreground">Locked: {fmtUSD(a.balanceUSD * (a.locked / a.balance), true)} ({lockedPct.toFixed(0)}%)</p>
                    </div>
                  </div>

                  {/* Locked vs Available bar */}
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="bg-emerald-500" style={{ width: `${100 - lockedPct}%` }} />
                    <div className="bg-amber-500" style={{ width: `${lockedPct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                    <span>🟢 Available ({(100 - lockedPct).toFixed(0)}%)</span>
                    <span>🟠 Locked ({lockedPct.toFixed(0)}%)</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-[10px] text-muted-foreground">
                    <Clock className="inline h-2.5 w-2.5 mr-1" />
                    Reconciled {timeAgoShort(a.lastReconciled)}
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px]"
                      onClick={() => toast.info(`Viewing ledger for ${a.bank} (${a.currency})`)}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Ledger
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                      disabled={a.status === "frozen"}
                      onClick={() => toast.success(`Transfer initiated from ${a.bank} (${a.currency})`)}
                    >
                      <Send className="h-3 w-3 mr-1" /> Transfer
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Skeleton
 * ========================================================= */
function TreasurySkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-10 w-96" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
