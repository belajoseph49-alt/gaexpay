// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, DollarSign, TrendingUp, Activity, ShieldCheck,
  Server, Cpu, Globe, Crown, AlertTriangle, Ban, CheckCircle2,
  FileText, Eye, ArrowUpRight, ArrowDownRight, Lock, Zap, Gauge,
  Clock, Wifi, Database, ShieldAlert, ScanSearch, Download,
  UserCheck, UserX, MapPin, ChevronRight, Sparkles, BadgeCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { AnimatedNumber } from "../animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FEE_COLORS: Record<string, string> = {
  transfer: "#10b981",
  exchange: "#f59e0b",
  card: "#8b5cf6",
  bill: "#06b6d4",
  crypto: "#ec4899",
};

const fmtUSD = (n: number, compact = false) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);

const timeAgoShort = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

interface EnterpriseData {
  kpis: {
    totalUsers: number;
    activeUsers30d: number;
    newUsers7d: number;
    suspendedUsers: number;
    totalVolume30dUSD: number;
    revenueMTD_USD: number;
    feeRevenue30d_USD: number;
    avgTxValueUSD: number;
    totalTransactions: number;
    flaggedTx: number;
    openTickets: number;
  };
  revenueByType: { name: string; value: number }[];
  userGrowthSeries: { date: string; label: string; value: number }[];
  volumeSeries: { date: string; label: string; value: number; count: number }[];
  revenueSeries: { date: string; label: string; value: number; count: number }[];
  activeUsersSeries: { date: string; label: string; value: number }[];
  geographic: { country: string; users: number; volumeUSD: number }[];
  topUsers: {
    rank: number; userId: string; name: string; email: string;
    country: string; volumeUSD: number; txCount: number;
    status: string; kycTier: number;
  }[];
  systemHealth: {
    uptimePct: number;
    avgResponseMs: number;
    errorRate: number;
    activeSessions: number;
    requestsPerMin: number;
    dbConnections: number;
    cacheHitRate: number;
  };
  compliance: {
    pendingKyc: number;
    approvedKyc: number;
    rejectedKyc: number;
    amlAlerts: number;
    sanctionsHits: number;
    totalScreened: number;
    passRate: number;
  };
  recentAuditLogs: any[];
  recentActivity: any[];
  generatedAt: string;
}

export function EnterpriseAdminView() {
  const { data, loading } = useFetch<EnterpriseData>("/api/admin/enterprise");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Enterprise Admin Console</h1>
              <p className="text-sm text-muted-foreground">
                Platform-wide analytics, compliance, risk & operations
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-500/15 text-violet-600 border-0">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline" className="border-rose-500/30 text-rose-600">
            <Lock className="h-3 w-3 mr-1" /> L4 Access
          </Badge>
          <Button size="sm" variant="outline" onClick={() => toast.success("Report exported (CSV, 30d window)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </motion.div>

      {loading || !data ? (
        <EnterpriseSkeleton />
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto bg-muted/50">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="revenue" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Revenue
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Compliance
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5">
              <Server className="h-4 w-4" /> System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <OverviewTab data={data} />
          </TabsContent>
          <TabsContent value="users" className="mt-5">
            <UsersTab data={data} />
          </TabsContent>
          <TabsContent value="revenue" className="mt-5">
            <RevenueTab data={data} />
          </TabsContent>
          <TabsContent value="compliance" className="mt-5">
            <ComplianceTab data={data} />
          </TabsContent>
          <TabsContent value="system" className="mt-5">
            <SystemTab data={data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ===========================================================
 *  Overview Tab — Hero + Quick Stats + Recent Activity
 * =========================================================== */
function OverviewTab({ data }: { data: EnterpriseData }) {
  const k = data.kpis;

  return (
    <div className="space-y-5">
      {/* Platform Overview Hero (dark gradient) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-6 ring-1 ring-violet-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-violet-violet-300/80">
                Platform Overview · Last 30 days
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                GaexPay Enterprise Dashboard
              </h2>
            </div>
            <Badge className="border-0 bg-white/10 text-white backdrop-blur">
              <Sparkles className="h-3 w-3 mr-1" />
              {fmtNumber(k.totalUsers)} users
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <HeroStat
              icon={<Users className="h-4 w-4" />}
              label="Total Users"
              value={k.totalUsers}
              accent="violet"
            />
            <HeroStat
              icon={<DollarSign className="h-4 w-4" />}
              label="Volume (30d)"
              value={k.totalVolume30dUSD}
              prefix="$"
              format="compact"
              accent="teal"
            />
            <HeroStat
              icon={<TrendingUp className="h-4 w-4" />}
              label="Revenue (MTD)"
              value={k.revenueMTD_USD}
              prefix="$"
              format="compact"
              accent="cyan"
            />
            <HeroStat
              icon={<Gauge className="h-4 w-4" />}
              label="Avg. Tx Value"
              value={k.avgTxValueUSD}
              prefix="$"
              format="compact"
              accent="lime"
            />
          </div>
        </div>
      </motion.div>

      {/* Quick KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          icon={UserCheck}
          label="Active Users (30d)"
          value={fmtNumber(k.activeUsers30d)}
          trend="+1,240"
          up
          color="bg-violet-500/15 text-violet-500"
        />
        <MiniStat
          icon={Users}
          label="New Users (7d)"
          value={fmtNumber(k.newUsers7d)}
          trend="+8.4%"
          up
          color="bg-sky-500/15 text-sky-500"
        />
        <MiniStat
          icon={Ban}
          label="Suspended Accounts"
          value={fmtNumber(k.suspendedUsers)}
          trend="-2"
          up={false}
          color="bg-rose-500/15 text-rose-500"
        />
        <MiniStat
          icon={DollarSign}
          label="Fee Revenue (30d)"
          value={fmtUSD(k.feeRevenue30d_USD, true)}
          trend="+12.1%"
          up
          color="bg-amber-500/15 text-amber-500"
        />
      </div>

      {/* Quick actions */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <span className="text-xs text-muted-foreground">Operator toolkit</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={Ban}
            label="Suspend User"
            desc="Freeze a problematic account"
            color="rose"
            onClick={() => setView("admin-panel")}
          />
          <QuickAction
            icon={CheckCircle2}
            label="Approve KYC"
            desc="Review pending verifications"
            color="violet"
            badge={data.compliance.pendingKyc}
            onClick={() => setView("admin-panel")}
          />
          <QuickAction
            icon={AlertTriangle}
            label="Review Fraud"
            desc="Investigate flagged transactions"
            color="amber"
            badge={k.flaggedTx}
            onClick={() => setView("admin-panel")}
          />
          <QuickAction
            icon={FileText}
            label="Export Report"
            desc="Download CSV / PDF"
            color="violet"
            onClick={() => toast.success("Report exported (CSV, 30d window)")}
          />
        </div>
      </Card>

      {/* Recent activity + charts */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Transaction Volume (14d)</h3>
              <p className="text-xs text-muted-foreground">Daily processed USD volume</p>
            </div>
            <Badge variant="outline" className="text-violet-600 border-violet-500/30">
              {fmtUSD(k.totalVolume30dUSD, true)} total
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.volumeSeries}>
              <defs>
                <linearGradient id="ovVolume" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(v) => fmtUSD(Number(v), true)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any) => [fmtUSD(Number(v)), "Volume"]}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2.5} fill="url(#ovVolume)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Activity</h3>
            <Badge variant="outline" className="text-xs">Last 8</Badge>
          </div>
          <div className="max-h-[260px] space-y-2 overflow-y-auto no-scrollbar">
            {data.recentActivity.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
            )}
            {data.recentActivity.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/40"
              >
                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg",
                    t.direction === "credit"
                      ? "bg-violet-500/15 text-violet-500"
                      : "bg-rose-500/15 text-rose-500",
                  )}
                >
                  {t.direction === "credit" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium capitalize">
                    {t.type} · {t.userName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t.reference} · {timeAgoShort(t.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-xs font-semibold tabular-nums", t.direction === "credit" ? "text-violet-600" : "text-rose-600")}>
                    {t.direction === "credit" ? "+" : "-"}{fmtUSD(t.amountUSD)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t.status}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ===========================================================
 *  Users Tab — Growth chart + Geographic + Top users
 * =========================================================== */
function UsersTab({ data }: { data: EnterpriseData }) {
  return (
    <div className="space-y-5">
      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold">New User Signups (14d)</h3>
            <p className="text-xs text-muted-foreground">Daily new account creations</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.userGrowthSeries}>
              <defs>
                <linearGradient id="userBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any) => [`${v} users`, "Signups"]}
                labelStyle={{ color: "#94a3b8" }}
                cursor={{ fill: "rgba(20,184,166,0.08)" }}
              />
              <Bar dataKey="value" fill="url(#userBar)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold">Active Users (14d)</h3>
            <p className="text-xs text-muted-foreground">Daily unique transacting users</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.activeUsersSeries}>
              <defs>
                <linearGradient id="activeUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any) => [`${v} users`, "Active"]}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#activeUsers)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Geographic distribution */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-violet-500" />
              Geographic Distribution
            </h3>
            <p className="text-xs text-muted-foreground">Top 10 countries by user count</p>
          </div>
        </div>
        <div className="space-y-2">
          {data.geographic.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No geographic data</p>
          )}
          {data.geographic.map((c, i) => {
            const maxUsers = data.geographic[0]?.users ?? 1;
            const pct = (c.users / maxUsers) * 100;
            return (
              <motion.div
                key={c.country}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/30"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10 text-violet-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{c.country}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{fmtNumber(c.users)} users</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        {fmtUSD(c.volumeUSD, true)} vol
                      </Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Top users by volume */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Top 10 Users by Volume (30d)
            </h3>
            <p className="text-xs text-muted-foreground">Highest transacting accounts (USD-normalized)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Top users report exported")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">#</th>
                <th className="pb-2 pr-2 font-medium">User</th>
                <th className="pb-2 pr-2 font-medium">Country</th>
                <th className="pb-2 pr-2 font-medium text-right">Volume</th>
                <th className="pb-2 pr-2 font-medium text-right">Tx Count</th>
                <th className="pb-2 pr-2 font-medium">Status</th>
                <th className="pb-2 font-medium">KYC</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No transaction volume recorded yet
                  </td>
                </tr>
              )}
              {data.topUsers.map((u) => (
                <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 pr-2">
                    <div
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                        u.rank === 1
                          ? "bg-amber-500/20 text-amber-600"
                          : u.rank === 2
                            ? "bg-slate-400/20 text-slate-500"
                            : u.rank === 3
                              ? "bg-orange-700/20 text-orange-700"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {u.rank}
                    </div>
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                          {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{u.name}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-2 text-xs">{u.country}</td>
                  <td className="py-3 pr-2 text-right font-semibold tabular-nums">{fmtUSD(u.volumeUSD)}</td>
                  <td className="py-3 pr-2 text-right tabular-nums text-xs">{u.txCount}</td>
                  <td className="py-3 pr-2">
                    <Badge variant="outline" className={cn("text-[10px]", u.status === "active" ? "text-violet-600" : "text-rose-600")}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Badge variant="outline" className="text-[10px]">Tier {u.kycTier}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  Revenue Tab — Pie chart + Area chart + Fee breakdown cards
 * =========================================================== */
function RevenueTab({ data }: { data: EnterpriseData }) {
  const totalFee = data.revenueByType.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-5">
      {/* Revenue summary hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-violet-900 via-slate-900 to-purple-900 p-6 ring-1 ring-violet-500/20"
      >
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-violet-300/80">Revenue (MTD)</p>
            <p className="mt-1 text-3xl font-bold text-white tabular-nums">
              <AnimatedNumber value={data.kpis.revenueMTD_USD} prefix="$" decimals={2} duration={1500} />
            </p>
            <p className="mt-1 text-xs text-violet-violet-300/70 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> +14.2% vs last month
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-violet-300/80">Fee Revenue (30d)</p>
            <p className="mt-1 text-3xl font-bold text-white tabular-nums">
              <AnimatedNumber value={data.kpis.feeRevenue30d_USD} prefix="$" decimals={2} duration={1500} />
            </p>
            <p className="mt-1 text-xs text-violet-violet-300/70 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> +9.7% vs prior period
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-violet-300/80">Total Volume (30d)</p>
            <p className="mt-1 text-3xl font-bold text-white tabular-nums">
              <AnimatedNumber value={data.kpis.totalVolume30dUSD} prefix="$" decimals={2} duration={1500} />
            </p>
            <p className="mt-1 text-xs text-violet-violet-300/70 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> +8.4% growth
            </p>
          </div>
        </div>
      </motion.div>

      {/* Pie + Area chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold">Revenue by Type</h3>
            <p className="text-xs text-muted-foreground">Fee distribution across product lines</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.revenueByType}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={3}
                stroke="none"
              >
                {data.revenueByType.map((entry) => (
                  <Cell key={entry.name} fill={FEE_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, name: any) => [fmtUSD(Number(v)), name]}
                labelStyle={{ color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {data.revenueByType.map((r) => (
              <div key={r.name} className="text-center">
                <div className="mx-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: FEE_COLORS[r.name] }} />
                <p className="text-[10px] font-medium capitalize">{r.name}</p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {totalFee > 0 ? ((r.value / totalFee) * 100).toFixed(0) : 0}%
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold">Revenue Trend (14d)</h3>
            <p className="text-xs text-muted-foreground">Daily fee revenue in USD</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.revenueSeries}>
              <defs>
                <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtUSD(Number(v), true)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any) => [fmtUSD(Number(v)), "Revenue"]}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fill="url(#revArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Fee revenue breakdown cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { key: "transfer", label: "Transfer Fees", icon: Users, desc: "P2P & wallet transfers" },
          { key: "exchange", label: "Exchange Fees", icon: ArrowUpRight, desc: "Currency conversion" },
          { key: "card", label: "Card Fees", icon: Building2, desc: "Virtual & physical cards" },
          { key: "bill", label: "Bill Fees", icon: FileText, desc: "Bill payments & airtime" },
          { key: "crypto", label: "Crypto Fees", icon: Sparkles, desc: "Swaps & cashouts" },
        ].map((card, i) => {
          const item = data.revenueByType.find((r) => r.name === card.key);
          const val = item?.value ?? 0;
          const pct = totalFee > 0 ? (val / totalFee) * 100 : 0;
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full p-4 card-lift">
                <div className="mb-2 flex items-start justify-between">
                  <div
                    className="grid h-9 w-9 place-items-center rounded-lg"
                    style={{ backgroundColor: `${FEE_COLORS[card.key]}20`, color: FEE_COLORS[card.key] }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: FEE_COLORS[card.key] }}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{fmtUSD(val, true)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{card.desc}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ===========================================================
 *  Compliance Tab — KYC + AML + Sanctions
 * =========================================================== */
function ComplianceTab({ data }: { data: EnterpriseData }) {
  const c = data.compliance;

  return (
    <div className="space-y-5">
      {/* Compliance summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ComplianceCard
          icon={Clock}
          label="Pending KYC"
          value={c.pendingKyc}
          desc="Awaiting verification review"
          color="amber"
          onClick={() => setView("admin-panel")}
        />
        <ComplianceCard
          icon={BadgeCheck}
          label="Approved KYC"
          value={c.approvedKyc}
          desc="Verified users on platform"
          color="violet"
          onClick={() => toast.success(`${c.approvedKyc} verified users`)}
        />
        <ComplianceCard
          icon={UserX}
          label="Rejected KYC"
          value={c.rejectedKyc}
          desc="Applications declined"
          color="rose"
          onClick={() => setView("admin-panel")}
        />
      </div>

      {/* AML + Sanctions + Pass Rate */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 ring-1 ring-rose-500/20">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AML Alerts</h3>
              <p className="text-xs text-muted-foreground">Anti-Money Laundering flags</p>
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums text-rose-600">
            <AnimatedNumber value={c.amlAlerts} duration={1000} />
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last 30 days</span>
            <Badge variant="outline" className="text-rose-600 border-rose-500/30">Action required</Badge>
          </div>
        </Card>

        <Card className="p-5 ring-1 ring-amber-500/20">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-500">
              <ScanSearch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Sanctions Hits</h3>
              <p className="text-xs text-muted-foreground">Screening match alerts</p>
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums text-amber-600">
            <AnimatedNumber value={c.sanctionsHits} duration={1000} />
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{fmtNumber(c.totalScreened)} screened</span>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">Review queue</Badge>
          </div>
        </Card>

        <Card className="p-5 ring-1 ring-violet-500/20">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Pass Rate</h3>
              <p className="text-xs text-muted-foreground">Clean screenings</p>
            </div>
          </div>
          <p className="text-3xl font-bold tabular-nums text-violet-600">
            <AnimatedNumber value={c.passRate} decimals={1} suffix="%" duration={1200} />
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Compliance score</span>
            <Badge variant="outline" className="text-violet-600 border-violet-500/30">Healthy</Badge>
          </div>
        </Card>
      </div>

      {/* KYC distribution bar */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">KYC Verification Distribution</h3>
            <p className="text-xs text-muted-foreground">Breakdown of all user verification states</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {fmtNumber(c.pendingKyc + c.approvedKyc + c.rejectedKyc)} total
          </Badge>
        </div>
        <div className="space-y-3">
          <ComplianceBar label="Approved" value={c.approvedKyc} total={c.pendingKyc + c.approvedKyc + c.rejectedKyc} color="bg-violet-500" />
          <ComplianceBar label="Pending Review" value={c.pendingKyc} total={c.pendingKyc + c.approvedKyc + c.rejectedKyc} color="bg-amber-500" />
          <ComplianceBar label="Rejected" value={c.rejectedKyc} total={c.pendingKyc + c.approvedKyc + c.rejectedKyc} color="bg-rose-500" />
        </div>
      </Card>

      {/* Recent audit logs */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-sky-500" />
              Recent System Audit Trail
            </h3>
            <p className="text-xs text-muted-foreground">Last 20 platform events</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Audit log exported")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
        <div className="max-h-96 space-y-1.5 overflow-y-auto no-scrollbar">
          {data.recentAuditLogs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No audit logs recorded</p>
          )}
          {data.recentAuditLogs.map((l, i) => {
            const sev: Record<string, string> = {
              info: "bg-sky-500/15 text-sky-600",
              warning: "bg-amber-500/15 text-amber-600",
              critical: "bg-rose-500/15 text-rose-600",
            };
            return (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/30"
              >
                <div className={cn("grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold", sev[l.severity] ?? sev.info)}>
                  {l.severity[0]?.toUpperCase() ?? "I"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium capitalize">{l.action.replace(/_/g, " ")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {l.user?.name ?? l.actor} · {l.entity}
                    {l.ip ? ` · ${l.ip}` : ""}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgoShort(l.createdAt)}</span>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  System Tab — Health cards + Activity feed
 * =========================================================== */
function SystemTab({ data }: { data: EnterpriseData }) {
  const s = data.systemHealth;

  return (
    <div className="space-y-5">
      {/* System health cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HealthCard
          icon={Activity}
          label="API Uptime"
          value={
            <span className="flex items-baseline gap-1">
              <AnimatedNumber value={s.uptimePct} decimals={2} duration={1200} />
              <span className="text-base text-muted-foreground">%</span>
            </span>
          }
          status={s.uptimePct > 99 ? "healthy" : s.uptimePct > 95 ? "warning" : "critical"}
          desc="30-day rolling average"
        />
        <HealthCard
          icon={Gauge}
          label="Avg Response Time"
          value={
            <span className="flex items-baseline gap-1">
              <AnimatedNumber value={s.avgResponseMs} duration={1200} />
              <span className="text-base text-muted-foreground">ms</span>
            </span>
          }
          status={s.avgResponseMs < 400 ? "healthy" : s.avgResponseMs < 800 ? "warning" : "critical"}
          desc="p95 across all endpoints"
        />
        <HealthCard
          icon={AlertTriangle}
          label="Error Rate"
          value={
            <span className="flex items-baseline gap-1">
              <AnimatedNumber value={s.errorRate} decimals={2} duration={1200} />
              <span className="text-base text-muted-foreground">%</span>
            </span>
          }
          status={s.errorRate < 1 ? "healthy" : s.errorRate < 5 ? "warning" : "critical"}
          desc="Failed transactions ratio"
        />
        <HealthCard
          icon={Wifi}
          label="Active Sessions"
          value={<AnimatedNumber value={s.activeSessions} duration={1200} />}
          status="healthy"
          desc="Last 7 days devices"
        />
      </div>

      {/* Infrastructure metrics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-violet-500" />
            Infrastructure Metrics
          </h3>
          <div className="space-y-4">
            <InfraMetric
              icon={Zap}
              label="Requests / min"
              value={fmtNumber(s.requestsPerMin)}
              color="text-amber-500"
              pct={70}
            />
            <InfraMetric
              icon={Database}
              label="DB Connections"
              value={`${s.dbConnections} / 20`}
              color="text-sky-500"
              pct={(s.dbConnections / 20) * 100}
            />
            <InfraMetric
              icon={Cpu}
              label="Cache Hit Rate"
              value={`${s.cacheHitRate}%`}
              color="text-violet-500"
              pct={s.cacheHitRate}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-500" />
            Service Status
          </h3>
          <div className="space-y-2">
            {[
              { name: "API Gateway", status: "operational", latency: "82ms" },
              { name: "Wallet Service", status: "operational", latency: "120ms" },
              { name: "Payment Processor", status: "operational", latency: "210ms" },
              { name: "KYC Verification", status: "operational", latency: "340ms" },
              { name: "Fraud Detection ML", status: "operational", latency: "180ms" },
              { name: "Notification Service", status: "degraded", latency: "540ms" },
              { name: "Crypto Price Feed", status: "operational", latency: "60ms" },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between rounded-lg border p-2.5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      svc.status === "operational" ? "bg-violet-500" : "bg-amber-500",
                    )}
                  />
                  <span className="text-sm font-medium">{svc.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{svc.latency}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      svc.status === "operational"
                        ? "text-violet-600 border-violet-500/30"
                        : "text-amber-600 border-amber-500/30",
                    )}
                  >
                    {svc.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System info banner */}
      <Card className="border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">All Systems Operational</h3>
              <p className="text-xs text-muted-foreground">
                Last full health check: {new Date(data.generatedAt).toLocaleString()} · No active incidents
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setView("support")}>
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Report Incident
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ===========================================================
 *  Reusable Sub-components
 * =========================================================== */
function HeroStat({
  icon, label, value, prefix, format, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  format?: "compact";
  accent: "violet" | "teal" | "cyan" | "lime";
}) {
  const accentColors: Record<string, string> = {
    emerald: "text-violet-violet-300",
    teal: "text-purple-300",
    cyan: "text-cyan-300",
    lime: "text-lime-300",
  };
  const formatted = format === "compact" ? fmtUSD(value, true) : fmtNumber(value);
  return (
    <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-violet-violet-300/80">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", accentColors[accent])}>
        {prefix}
        <AnimatedNumber value={value} decimals={format === "compact" ? 2 : 0} duration={1400} />
      </p>
      <p className="mt-1 text-[11px] text-slate-400">{formatted} {format === "compact" ? "USD" : ""}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, trend, up, color,
}: {
  icon: any;
  label: string;
  value: string;
  trend: string;
  up: boolean;
  color: string;
}) {
  return (
    <Card className="p-5 card-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={up ? "text-violet-600 border-violet-500/30" : "text-rose-600 border-rose-500/30"}>
          {up ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
          {trend}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function QuickAction({
  icon: Icon, label, desc, color, badge, onClick,
}: {
  icon: any;
  label: string;
  desc: string;
  color: "rose" | "violet" | "amber" | "violet";
  badge?: number;
  onClick: () => void;
}) {
  const colorMap = {
    rose: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 ring-rose-500/20",
    emerald: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/15 ring-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 ring-amber-500/20",
    violet: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/15 ring-violet-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl p-3 text-left ring-1 transition-all hover:shadow-md",
        colorMap[color],
      )}
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/50 dark:bg-black/20">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold">{label}</p>
          {badge !== undefined && badge > 0 && (
            <Badge className="h-4 px-1 text-[9px] bg-rose-500 text-white border-0">{badge}</Badge>
          )}
        </div>
        <p className="text-[11px] opacity-70 truncate">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function ComplianceCard({
  icon: Icon, label, value, desc, color, onClick,
}: {
  icon: any;
  label: string;
  value: number;
  desc: string;
  color: "amber" | "violet" | "rose";
  onClick: () => void;
}) {
  const colorMap = {
    amber: "ring-amber-500/20 hover:ring-amber-500/40 text-amber-600 bg-amber-500/10",
    emerald: "ring-violet-500/20 hover:ring-violet-500/40 text-violet-600 bg-violet-500/10",
    rose: "ring-rose-500/20 hover:ring-rose-500/40 text-rose-600 bg-rose-500/10",
  };
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn("rounded-xl p-5 text-left ring-1 transition-all", colorMap[color])}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/40 dark:bg-black/20">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">
        <AnimatedNumber value={value} duration={1200} />
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
    </motion.button>
  );
}

function ComplianceBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {fmtNumber(value)} · {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

function HealthCard({
  icon: Icon, label, value, status, desc,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  status: "healthy" | "warning" | "critical";
  desc: string;
}) {
  const statusMap = {
    healthy: { color: "bg-violet-500/15 text-violet-600", ring: "ring-violet-500/20", dot: "bg-violet-500" },
    warning: { color: "bg-amber-500/15 text-amber-600", ring: "ring-amber-500/20", dot: "bg-amber-500" },
    critical: { color: "bg-rose-500/15 text-rose-600", ring: "ring-rose-500/20", dot: "bg-rose-500" },
  };
  const s = statusMap[status];
  return (
    <Card className={cn("p-5 ring-1 card-lift", s.ring)}>
      <div className="mb-3 flex items-center justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", s.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn("h-2 w-2 rounded-full animate-pulse", s.dot)} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
    </Card>
  );
}

function InfraMetric({
  icon: Icon, label, value, color, pct,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", color)} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">{value}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function EnterpriseSkeleton() {
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
