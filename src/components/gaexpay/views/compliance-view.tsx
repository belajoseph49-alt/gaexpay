"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, Activity, ScanSearch,
  FileText, Download, Plus, CheckCircle2, XCircle, Clock, MapPin,
  TrendingUp, Globe, Landmark, UserCheck, Users,
  Gauge, Bell, Zap, Eye, Flag, Ban, RefreshCw,
  Lock, FileCheck2, FileWarning, FileBarChart, BadgeCheck,
  AlertOctagon, Scale, Crosshair, Layers, Hash,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFetch } from "@/hooks/use-fetch";
import { AnimatedNumber } from "../animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------- helpers ------------------------- */
const fmtNum = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtNGN = (n: number, compact = false) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `₦${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `₦${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `₦${(n / 1e3).toFixed(1)}K`;
    return `₦${n.toFixed(0)}`;
  }
  return `₦${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
};
const fmtUSD = (n: number, compact = false) => {
  if (compact) {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n))}`;
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
const fmtDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

/* ------------------------- types ------------------------- */
interface ComplianceData {
  aml: {
    totalAlerts: number;
    alertsBySeverity: { high: number; medium: number; low: number };
    alertsByType: { type: string; label: string; count: number }[];
    alertTrend14d: { date: string; label: string; value: number }[];
    recentAlerts: {
      id: string; reference: string; userName: string; userEmail: string;
      userCountry: string; amount: number; currency: string; amountUSD: number;
      type: string; severity: "high" | "medium" | "low"; riskScore: number;
      ruleId: string; status: "open" | "under_review" | "escalated" | "closed" | "sar_filed";
      description: string; createdAt: string;
    }[];
    sarFiled: number;
    falsePositiveRate: number;
  };
  sanctions: {
    totalScreened: number;
    hitsFound: number;
    blockedTransactions: number;
    screeningLists: {
      id: string; name: string; fullName: string; entities: number;
      lastUpdated: string; status: string; hits: number;
    }[];
    recentScreened: {
      id: string; reference: string; userName: string; userCountry: string;
      counterparty: string; amount: number; currency: string; amountUSD: number;
      riskScore: number; status: "cleared" | "hit" | "blocked";
      listMatched: string | null; screenedAt: string;
    }[];
    blockedEntities: {
      id: string; name: string; country: string; type: string;
      reason: string; addedAt: string; source: string;
    }[];
  };
  kycQueue: {
    pendingReviews: number; approvedToday: number; rejectedToday: number;
    avgReviewTime: string;
    queueByTier: { tier: number; label: string; count: number }[];
    pendingList: {
      id: string; userId: string; userName: string; userEmail: string;
      userCountry: string; documentType: string; documentNumber: string;
      tier: number; submittedAt: string; daysInQueue: number; riskFlag: boolean;
    }[];
    totalPending: number;
  };
  risk: {
    usersByRisk: { low: number; medium: number; high: number; critical: number };
    txByRiskBucket: { bucket: string; label: string; count: number; color: string }[];
  };
  rules: {
    id: string; name: string; description: string;
    severity: "high" | "medium" | "low"; category: string;
    enabled: boolean; triggeredCount: number; lastTriggered: string;
    threshold: number | null;
  }[];
  metrics: {
    ctrFiled: number; sarFiled: number; complianceRate: number;
    auditScore: number; totalScreened: number; passRate: number;
  };
  reports: {
    id: string; type: string; title: string; period: string;
    status: "filed" | "draft" | "under_review";
    filedDate: string | null; regulator: string; count: number | null;
  }[];
  generatedAt: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; ring: string; label: string }> = {
  high: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", ring: "ring-rose-500/20", label: "High" },
  medium: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", ring: "ring-amber-500/20", label: "Medium" },
  low: { color: "text-sky-600", bg: "bg-sky-500/15 border-sky-500/30", ring: "ring-sky-500/20", label: "Low" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  open: { color: "text-sky-600", bg: "bg-sky-500/15 border-sky-500/30", dot: "bg-sky-500", label: "Open" },
  under_review: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", label: "Under Review" },
  escalated: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", dot: "bg-rose-500", label: "Escalated" },
  closed: { color: "text-slate-500", bg: "bg-slate-500/15 border-slate-500/30", dot: "bg-slate-400", label: "Closed" },
  sar_filed: { color: "text-violet-600", bg: "bg-violet-500/15 border-violet-500/30", dot: "bg-violet-500", label: "SAR Filed" },
  cleared: { color: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-500", label: "Cleared" },
  hit: { color: "text-amber-600", bg: "bg-amber-500/15 border-amber-500/30", dot: "bg-amber-500", label: "Hit" },
  blocked: { color: "text-rose-600", bg: "bg-rose-500/15 border-rose-500/30", dot: "bg-rose-500", label: "Blocked" },
  filed: { color: "text-emerald-600", bg: "bg-emerald-500/15 border-emerald-500/30", dot: "bg-emerald-500", label: "Filed" },
  draft: { color: "text-slate-500", bg: "bg-slate-500/15 border-slate-500/30", dot: "bg-slate-400", label: "Draft" },
};

const TYPE_COLORS: Record<string, string> = {
  "CTR": "#10b981",
  "SAR": "#f43f5e",
  "Audit": "#8b5cf6",
  "Compliance": "#06b6d4",
};

const REPORT_TYPE_ICON: Record<string, any> = {
  "CTR": FileBarChart,
  "SAR": FileWarning,
  "Audit": FileCheck2,
  "Compliance": Scale,
};

/* =========================================================
 *  Main view
 * ========================================================= */
export function ComplianceView() {
  const { data, loading } = useFetch<ComplianceData>("/api/compliance");

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
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AML & Compliance Center</h1>
            <p className="text-sm text-muted-foreground">
              Sanctions screening · transaction monitoring · KYC review · regulatory reporting
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline" className="border-rose-500/30 text-rose-600">
            <Lock className="h-3 w-3 mr-1" /> L4 Restricted
          </Badge>
          <Button size="sm" variant="outline" onClick={() => toast.success("Compliance report exported (PDF, 30d window)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </motion.div>

      {loading || !data ? (
        <ComplianceSkeleton />
      ) : (
        <Tabs defaultValue="aml">
          <TabsList className="flex-wrap h-auto bg-muted/50">
            <TabsTrigger value="aml" className="gap-1.5">
              <Activity className="h-4 w-4" /> AML Dashboard
              {data.aml.totalAlerts > 0 && (
                <Badge className="h-4 px-1 text-[9px] bg-rose-500 text-white border-0">
                  {data.aml.totalAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sanctions" className="gap-1.5">
              <ScanSearch className="h-4 w-4" /> Sanctions
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-1.5">
              <UserCheck className="h-4 w-4" /> KYC Queue
              {data.kycQueue.pendingReviews > 0 && (
                <Badge className="h-4 px-1 text-[9px] bg-amber-500 text-white border-0">
                  {data.kycQueue.pendingReviews}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5">
              <Crosshair className="h-4 w-4" /> Rules
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5">
              <FileText className="h-4 w-4" /> Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aml" className="mt-5">
            <AmlDashboardTab data={data} />
          </TabsContent>
          <TabsContent value="sanctions" className="mt-5">
            <SanctionsTab data={data} />
          </TabsContent>
          <TabsContent value="kyc" className="mt-5">
            <KycQueueTab data={data} />
          </TabsContent>
          <TabsContent value="rules" className="mt-5">
            <RulesTab data={data} />
          </TabsContent>
          <TabsContent value="reports" className="mt-5">
            <ReportsTab data={data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* =========================================================
 *  Tab 1: AML Dashboard
 * ========================================================= */
function AmlDashboardTab({ data }: { data: ComplianceData }) {
  const a = data.aml;
  const maxType = Math.max(...a.alertsByType.map((t) => t.count), 1);

  return (
    <div className="space-y-5">
      {/* Alert summary hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 p-6 ring-1 ring-rose-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-rose-300/80">
                AML Alerts · Last 30 days
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Anti-Money Laundering Dashboard</h2>
            </div>
            <Badge className="border-0 bg-white/10 text-white backdrop-blur">
              <ShieldAlert className="h-3 w-3 mr-1" /> Monitoring Active
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total alerts */}
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-rose-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                  <AlertOctagon className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">Total Alerts</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                <AnimatedNumber value={a.totalAlerts} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Across {a.alertTrend14d.length} days monitored</p>
            </div>
            {/* High severity */}
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-rose-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/20">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">High Severity</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-rose-400">
                <AnimatedNumber value={a.alertsBySeverity.high} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Requires immediate escalation</p>
            </div>
            {/* Medium severity */}
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-amber-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">Medium Severity</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-amber-400">
                <AnimatedNumber value={a.alertsBySeverity.medium} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Pending analyst review</p>
            </div>
            {/* Low severity */}
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-sky-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/20">
                  <Bell className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">Low Severity</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-sky-400">
                <AnimatedNumber value={a.alertsBySeverity.low} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Informational / automated</p>
            </div>
          </div>

          {/* SAR + FP rate strip */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl bg-violet-500/10 p-3 ring-1 ring-violet-500/20">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-violet-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-violet-300/80">SAR Filed</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    <AnimatedNumber value={a.sarFiled} duration={1400} />
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 max-w-[150px] text-right">
                Suspicious Activity Reports filed with NFIU
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-500/10 p-3 ring-1 ring-slate-500/20">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-slate-300" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-300/80">False Positive Rate</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    <AnimatedNumber value={a.falsePositiveRate} duration={1400} suffix="%" decimals={1} />
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 max-w-[150px] text-right">
                Closed alerts / total alerts triggered
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts by type bar chart + 14-day trend area chart */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" /> Alerts by Type
            </h3>
            <p className="text-xs text-muted-foreground">Distribution of AML alerts across categories (30d)</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.alertsByType} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="amlTypeBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any) => [`${v} alerts`, "Count"]}
                labelStyle={{ color: "#94a3b8" }}
                cursor={{ fill: "rgba(244,63,94,0.08)" }}
              />
              <Bar dataKey="count" fill="url(#amlTypeBar)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {a.alertsByType.map((t) => {
              const pct = maxType > 0 ? (t.count / maxType) * 100 : 0;
              return (
                <div key={t.type} className="rounded-lg border p-2 text-center">
                  <p className="text-[9px] text-muted-foreground truncate" title={t.label}>{t.label}</p>
                  <p className="text-sm font-semibold tabular-nums">{t.count}</p>
                  <Progress value={pct} className="h-1 mt-1" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Alert Trend (14 days)
              </h3>
              <p className="text-xs text-muted-foreground">Daily count of AML alerts triggered</p>
            </div>
            <Badge variant="outline" className="text-rose-600 border-rose-500/30">
              {a.totalAlerts} total
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={a.alertTrend14d}>
              <defs>
                <linearGradient id="amlTrendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any) => [`${v} alerts`, "Triggered"]}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={2.5} fill="url(#amlTrendArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent alerts table */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Flag className="h-4 w-4 text-rose-500" /> Recent AML Alerts
            </h3>
            <p className="text-xs text-muted-foreground">10 most recent alerts requiring analyst attention</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("AML alerts log exported (CSV)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export Log
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Alert</th>
                <th className="pb-2 pr-3 font-medium">User</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                <th className="pb-2 pr-3 font-medium">Risk</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Triggered</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {a.recentAlerts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    No AML alerts in the last 30 days — all clear.
                  </td>
                </tr>
              )}
              {a.recentAlerts.map((al, i) => {
                const sev = SEVERITY_CONFIG[al.severity];
                const st = STATUS_CONFIG[al.status] || STATUS_CONFIG.open;
                return (
                  <motion.tr
                    key={al.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-3 pr-3">
                      <p className="text-[11px] font-mono">{al.id}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{al.reference}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                            {al.userName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[120px]">{al.userName}</p>
                          <p className="text-[10px] text-muted-foreground">{al.userCountry || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("text-[10px] capitalize", sev.color, sev.bg)}>
                        {al.type.replace(/-/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <p className="text-xs font-semibold tabular-nums">{fmtNGN(al.amount, true)}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtUSD(al.amountUSD, true)}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full", al.riskScore >= 0.8 ? "bg-rose-500" : al.riskScore >= 0.6 ? "bg-amber-500" : "bg-sky-500")} />
                        <span className="text-xs tabular-nums font-medium">{Math.round(al.riskScore * 100)}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("text-[10px]", st.color, st.bg)}>
                        <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", st.dot)} />
                        {st.label}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-[11px] text-muted-foreground">{timeAgoShort(al.createdAt)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                          onClick={() => toast.info(`Reviewing alert ${al.id} · ${al.userName}`)}>
                          <Eye className="h-3 w-3 mr-1" /> Review
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600"
                          onClick={() => toast.success(`SAR initiated for ${al.id}`)}>
                          <FileWarning className="h-3 w-3 mr-1" /> SAR
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
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
 *  Tab 2: Sanctions Screening
 * ========================================================= */
function SanctionsTab({ data }: { data: ComplianceData }) {
  const s = data.sanctions;

  return (
    <div className="space-y-5">
      {/* Screening stats hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-6 ring-1 ring-emerald-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                Sanctions Screening · Last 30 days
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Real-time Watchlist Screening</h2>
            </div>
            <Badge className="border-0 bg-white/10 text-white backdrop-blur">
              <ScanSearch className="h-3 w-3 mr-1" /> 4 Lists Active
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-emerald-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                  <ScanSearch className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">Total Screened</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-300">
                <AnimatedNumber value={s.totalScreened} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Transactions screened against all lists</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-amber-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">Hits Found</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-amber-300">
                <AnimatedNumber value={s.hitsFound} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Potential matches requiring review</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-rose-300/80">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/20">
                  <Ban className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider">Blocked Transactions</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-rose-300">
                <AnimatedNumber value={s.blockedTransactions} duration={1400} />
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Confirmed sanctions matches · funds frozen</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Screening lists status */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" /> Screening Lists Status
            </h3>
            <p className="text-xs text-muted-foreground">Active watchlists monitored in real-time</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Refreshing all screening lists…")}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh Lists
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {s.screeningLists.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border p-4 hover:bg-muted/30 card-lift"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                  <Landmark className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </Badge>
              </div>
              <p className="text-sm font-semibold">{l.name}</p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2" title={l.fullName}>{l.fullName}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="text-muted-foreground uppercase tracking-wide">Entities</p>
                  <p className="text-xs font-semibold tabular-nums">{fmtNum(l.entities)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground uppercase tracking-wide">Hits (30d)</p>
                  <p className="text-xs font-semibold tabular-nums text-amber-600">{l.hits}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                Updated {timeAgoShort(l.lastUpdated)}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Recent screened transactions + blocked entities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ScanSearch className="h-4 w-4 text-amber-500" /> Recent Screened Transactions
            </h3>
            <p className="text-xs text-muted-foreground">Top transactions by risk score · last 30 days</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">User</th>
                  <th className="pb-2 pr-3 font-medium">Counterparty</th>
                  <th className="pb-2 pr-3 font-medium text-right">Amount</th>
                  <th className="pb-2 pr-3 font-medium">Risk</th>
                  <th className="pb-2 pr-3 font-medium">List</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {s.recentScreened.map((t, i) => {
                  const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.cleared;
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 pr-3">
                        <p className="text-xs font-medium truncate max-w-[100px]">{t.userName}</p>
                        <p className="text-[10px] text-muted-foreground">{t.userCountry}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        <p className="truncate max-w-[120px]">{t.counterparty}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{t.reference.slice(-8)}</p>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <p className="text-xs font-semibold tabular-nums">{fmtNGN(t.amount, true)}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtUSD(t.amountUSD, true)}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className={cn("h-2 w-2 rounded-full", t.riskScore >= 0.8 ? "bg-rose-500" : t.riskScore >= 0.6 ? "bg-amber-500" : "bg-emerald-500")} />
                          <span className="text-xs tabular-nums">{Math.round(t.riskScore * 100)}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-[11px] text-muted-foreground">{t.listMatched ?? "—"}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={cn("text-[10px]", st.color, st.bg)}>
                          <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Ban className="h-4 w-4 text-rose-500" /> Blocked Entities
            </h3>
            <p className="text-xs text-muted-foreground">Sanctioned individuals & entities</p>
          </div>
          <div className="max-h-[400px] space-y-2 overflow-y-auto no-scrollbar">
            {s.blockedEntities.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border p-3 hover:bg-muted/30"
              >
                <div className="flex items-start gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-600">
                    {e.type === "Individual" ? <Users className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{e.reason}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{e.country}</Badge>
                      <Badge variant="outline" className="text-[9px]">{e.type}</Badge>
                      <Badge variant="outline" className="text-[9px] text-rose-600 border-rose-500/30">{e.source}</Badge>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
 *  Tab 3: KYC Queue
 * ========================================================= */
function KycQueueTab({ data }: { data: ComplianceData }) {
  const k = data.kycQueue;
  const maxTier = Math.max(...k.queueByTier.map((t) => t.count), 1);

  return (
    <div className="space-y-5">
      {/* Queue stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 card-lift ring-1 ring-amber-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                Awaiting review
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Pending Reviews</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">
              <AnimatedNumber value={k.pendingReviews} duration={1400} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.totalPending} documents in queue</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 card-lift ring-1 ring-emerald-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                Today
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Approved Today</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
              <AnimatedNumber value={k.approvedToday} duration={1400} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Tier upgrades processed</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 card-lift ring-1 ring-rose-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">
                Today
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Rejected Today</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
              <AnimatedNumber value={k.rejectedToday} duration={1400} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Failed compliance checks</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 card-lift ring-1 ring-sky-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-600">
                <Gauge className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-sky-600 border-sky-500/30 text-[10px]">
                Avg
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Avg Review Time</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-sky-600">
              {k.avgReviewTime}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Per KYC submission</p>
          </Card>
        </motion.div>
      </div>

      {/* Queue by tier bar chart */}
      <Card className="p-5">
        <div className="mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-500" /> Queue by Verification Tier
          </h3>
          <p className="text-xs text-muted-foreground">Pending reviews distributed across KYC tiers</p>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={k.queueByTier}>
            <defs>
              <linearGradient id="kycTierBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
              formatter={(v: any) => [`${v} pending`, "Reviews"]}
              labelStyle={{ color: "#94a3b8" }}
              cursor={{ fill: "rgba(20,184,166,0.08)" }}
            />
            <Bar dataKey="count" fill="url(#kycTierBar)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {k.queueByTier.map((t) => {
            const pct = maxTier > 0 ? (t.count / maxTier) * 100 : 0;
            return (
              <div key={t.tier} className="rounded-lg border p-2 text-center">
                <p className="text-[10px] text-muted-foreground truncate">Tier {t.tier}</p>
                <p className="text-sm font-semibold tabular-nums">{t.count}</p>
                <Progress value={pct} className="h-1 mt-1" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pending reviews list */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" /> Pending KYC Reviews
            </h3>
            <p className="text-xs text-muted-foreground">{k.pendingList.length} submissions awaiting analyst review</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("KYC queue exported (CSV)")}>
            <Download className="h-4 w-4 mr-1.5" /> Export Queue
          </Button>
        </div>
        <div className="max-h-[480px] space-y-2 overflow-y-auto no-scrollbar">
          {k.pendingList.length === 0 && (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">KYC queue is clear</p>
              <p className="text-xs text-muted-foreground">All submissions have been reviewed</p>
            </div>
          )}
          {k.pendingList.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border p-4 hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {r.userName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{r.userName}</p>
                    <Badge variant="outline" className="text-[10px]">Tier {r.tier} → {r.tier + 1}</Badge>
                    {r.riskFlag && (
                      <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-500/30 bg-rose-500/10">
                        <AlertTriangle className="h-3 w-3 mr-1" /> High-risk jurisdiction
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{r.userEmail}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span className="capitalize">{r.documentType.replace(/_/g, " ")}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{r.userCountry}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {r.daysInQueue === 0 ? "Today" : `${r.daysInQueue}d in queue`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8"
                    onClick={() => toast.info(`Opening KYC submission ${r.id.slice(-6)}`)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Docs
                  </Button>
                  <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => toast.success(`KYC approved for ${r.userName} · Tier ${r.tier + 1}`)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                    onClick={() => toast.error(`KYC rejected for ${r.userName}`)}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* =========================================================
 *  Tab 4: Transaction Monitoring Rules
 * ========================================================= */
function RulesTab({ data }: { data: ComplianceData }) {
  const [rules, setRules] = useState(data.rules);
  const [riskThreshold, setRiskThreshold] = useState(70);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const r = rules.find((x) => x.id === id);
    if (r) {
      toast.success(`Rule "${r.name}" ${r.enabled ? "disabled" : "enabled"}`);
    }
  };

  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalTriggers = rules.reduce((s, r) => s + r.triggeredCount, 0);

  return (
    <div className="space-y-5">
      {/* Rules summary hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950/40 to-slate-900 p-6 ring-1 ring-teal-500/20"
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-teal-300/80">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                <Crosshair className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider">Active Rules</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-teal-300">
              <AnimatedNumber value={enabledCount} duration={1400} />
              <span className="text-base text-slate-400"> / {rules.length}</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Monitoring all transactions</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-amber-300/80">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                <Zap className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider">Total Triggers (30d)</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-300">
              <AnimatedNumber value={totalTriggers} duration={1400} />
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Across all enabled rules</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 backdrop-blur ring-1 ring-white/10">
            <div className="flex items-center gap-2 text-emerald-300/80">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                <Gauge className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider">Risk Threshold</span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-300">
              {riskThreshold}<span className="text-base text-slate-400"> / 100</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Auto-escalation cutoff</p>
          </div>
        </div>
      </motion.div>

      {/* Risk threshold slider card */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-500" /> Risk Score Threshold
            </h3>
            <p className="text-xs text-muted-foreground">Transactions scoring above this threshold are auto-escalated to senior analysts</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-base font-bold tabular-nums">
            {riskThreshold}/100
          </Badge>
        </div>
        <div className="px-2">
          <Slider
            value={[riskThreshold]}
            min={20}
            max={100}
            step={5}
            onValueChange={(v) => setRiskThreshold(v[0])}
            className="w-full"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>20 (permissive)</span>
            <span>60 (recommended)</span>
            <span>100 (strict)</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">
            Threshold set to <span className="font-semibold text-foreground">{riskThreshold}</span> · applies to all monitoring rules
          </p>
          <Button size="sm" variant="outline" className="h-7 text-[11px]"
            onClick={() => toast.success(`Risk threshold updated to ${riskThreshold}/100`)}>
            Apply
          </Button>
        </div>
      </Card>

      {/* Rule cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {rules.map((r, i) => {
          const sev = SEVERITY_CONFIG[r.severity];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className={cn("p-5 card-lift ring-1 h-full", r.enabled ? sev.ring : "ring-muted/40 opacity-80")}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-lg", sev.bg)}>
                      <Crosshair className={cn("h-5 w-5", sev.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.category} · {sev.label} severity</p>
                    </div>
                  </div>
                  <Switch checked={r.enabled} onCheckedChange={() => toggleRule(r.id)} />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4 min-h-[48px]">
                  {r.description}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Triggered (30d)</p>
                    <p className="text-base font-bold tabular-nums">
                      <AnimatedNumber value={r.triggeredCount} duration={1000} />
                    </p>
                  </div>
                  <div className="rounded-lg border p-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last triggered</p>
                    <p className="text-xs font-semibold mt-1">{r.triggeredCount > 0 ? timeAgoShort(r.lastTriggered) : "Never"}</p>
                  </div>
                </div>
                {r.threshold !== null && (
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Threshold
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {r.id === "rule_large_txn" ? `₦${fmtNum(r.threshold)}`
                        : r.id === "rule_velocity" ? `${r.threshold} tx/day`
                        : r.id === "rule_failed_attempts" ? `${r.threshold} attempts/hr`
                        : `${r.threshold} sub-threshold tx`}
                    </span>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
 *  Tab 5: Reports
 * ========================================================= */
function ReportsTab({ data }: { data: ComplianceData }) {
  const [genOpen, setGenOpen] = useState(false);
  const [reportType, setReportType] = useState("CTR");
  const [period, setPeriod] = useState("current_month");
  const m = data.metrics;

  const handleGenerate = () => {
    toast.success(`${reportType} report generated for ${period.replace(/_/g, " ")} · queued for compliance officer review`);
    setGenOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Compliance metrics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 card-lift ring-1 ring-emerald-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                <FileBarChart className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">NFIU</Badge>
            </div>
            <p className="text-xs text-muted-foreground">CTR Filed</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
              <AnimatedNumber value={m.ctrFiled} duration={1400} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Currency Transaction Reports (30d)</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 card-lift ring-1 ring-rose-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-500/15 text-rose-600">
                <FileWarning className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">NFIU</Badge>
            </div>
            <p className="text-xs text-muted-foreground">SAR Filed</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
              <AnimatedNumber value={m.sarFiled} duration={1400} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Suspicious Activity Reports</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 card-lift ring-1 ring-sky-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-600">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <Badge variant="outline" className={cn(
                "text-[10px]",
                m.complianceRate >= 80 ? "text-emerald-600 border-emerald-500/30"
                  : m.complianceRate >= 50 ? "text-amber-600 border-amber-500/30"
                  : "text-rose-600 border-rose-500/30",
              )}>
                {m.complianceRate >= 80 ? "Healthy" : m.complianceRate >= 50 ? "Watch" : "At Risk"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Compliance Rate</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-sky-600">
              <AnimatedNumber value={m.complianceRate} duration={1400} decimals={1} suffix="%" />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Users with verified KYC</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 card-lift ring-1 ring-violet-500/20 h-full">
            <div className="mb-3 flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-600">
                <Scale className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-violet-600 border-violet-500/30 text-[10px]">
                {m.auditScore >= 90 ? "A+" : m.auditScore >= 85 ? "A" : "B"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Audit Score</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-600">
              <AnimatedNumber value={m.auditScore} duration={1400} /> <span className="text-base text-muted-foreground">/100</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Q2 2026 internal audit</p>
          </Card>
        </motion.div>
      </div>

      {/* Regulatory reports table */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" /> Regulatory Reports
            </h3>
            <p className="text-xs text-muted-foreground">{data.reports.length} reports on file · CTR, SAR, audit & compliance summaries</p>
          </div>
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate regulatory report</DialogTitle>
                <DialogDescription>
                  Create a new compliance report. Reports enter draft state and require sign-off from the Compliance Officer before filing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="rtype">Report type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="rtype"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CTR">CTR — Currency Transaction Report</SelectItem>
                      <SelectItem value="SAR">SAR — Suspicious Activity Report</SelectItem>
                      <SelectItem value="Audit">Compliance Audit</SelectItem>
                      <SelectItem value="Compliance">Compliance Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rperiod">Reporting period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger id="rperiod"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">Current month (MTD)</SelectItem>
                      <SelectItem value="last_month">Last month</SelectItem>
                      <SelectItem value="current_quarter">Current quarter (QTD)</SelectItem>
                      <SelectItem value="last_quarter">Last quarter</SelectItem>
                      <SelectItem value="ytd">Year to date (YTD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Report will include:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {reportType === "CTR" && (
                      <>
                        <li>All transactions ≥ $10,000 USD equivalent</li>
                        <li>Customer identification details</li>
                        <li>Transaction source & destination</li>
                      </>
                    )}
                    {reportType === "SAR" && (
                      <>
                        <li>Flagged suspicious activities (open + escalated)</li>
                        <li>Risk scores and alert history</li>
                        <li>Supporting transaction evidence</li>
                      </>
                    )}
                    {reportType === "Audit" && (
                      <>
                        <li>Full compliance framework review</li>
                        <li>Rule effectiveness analysis</li>
                        <li>Officer certifications</li>
                      </>
                    )}
                    {reportType === "Compliance" && (
                      <>
                        <li>KYC verification statistics</li>
                        <li>Sanctions screening summary</li>
                        <li>Regulatory KPIs & audit score</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerate}>
                  <FileText className="h-4 w-4 mr-1.5" /> Generate Report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Report ID</th>
                <th className="pb-2 pr-3 font-medium">Type</th>
                <th className="pb-2 pr-3 font-medium">Title / Period</th>
                <th className="pb-2 pr-3 font-medium">Regulator</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Filed</th>
                <th className="pb-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((r, i) => {
                const st = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
                const Icon = REPORT_TYPE_ICON[r.type] || FileText;
                const color = TYPE_COLORS[r.type] || "#10b981";
                return (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="py-3 pr-3">
                      <p className="text-[11px] font-mono">{r.id}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="grid h-6 w-6 place-items-center rounded" style={{ backgroundColor: `${color}20`, color }}>
                          <Icon className="h-3 w-3" />
                        </span>
                        <span className="text-[11px] font-medium">{r.type}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-xs font-medium truncate max-w-[220px]">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">{r.period}{r.count !== null ? ` · ${r.count} records` : ""}</p>
                    </td>
                    <td className="py-3 pr-3 text-[11px] text-muted-foreground">{r.regulator}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={cn("text-[10px]", st.color, st.bg)}>
                        <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", st.dot)} />
                        {st.label}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-[11px] text-muted-foreground">
                      {r.filedDate ? fmtDate(r.filedDate) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                        onClick={() => r.status === "filed"
                          ? toast.success(`Downloading ${r.id} (PDF)`)
                          : toast.info(`${r.id} is ${r.status.replace(/_/g, " ")} — not yet available for download`)}>
                        <Download className="h-3 w-3 mr-1" /> {r.status === "filed" ? "Download" : "Preview"}
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Risk distribution + pass rate */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" /> User Risk Distribution
            </h3>
            <p className="text-xs text-muted-foreground">All platform users categorized by risk level</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: "Low", value: data.risk.usersByRisk.low, color: "#10b981" },
                  { name: "Medium", value: data.risk.usersByRisk.medium, color: "#f59e0b" },
                  { name: "High", value: data.risk.usersByRisk.high, color: "#f97316" },
                  { name: "Critical", value: data.risk.usersByRisk.critical, color: "#ef4444" },
                ].filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                stroke="none"
              >
                {[
                  { name: "Low", color: "#10b981" },
                  { name: "Medium", color: "#f59e0b" },
                  { name: "High", color: "#f97316" },
                  { name: "Critical", color: "#ef4444" },
                ].map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, name: any) => [`${v} users`, name]}
                labelStyle={{ color: "#94a3b8" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[
              { name: "Low", value: data.risk.usersByRisk.low, color: "#10b981" },
              { name: "Medium", value: data.risk.usersByRisk.medium, color: "#f59e0b" },
              { name: "High", value: data.risk.usersByRisk.high, color: "#f97316" },
              { name: "Critical", value: data.risk.usersByRisk.critical, color: "#ef4444" },
            ].map((d) => (
              <div key={d.name} className="rounded-lg border p-2 text-center">
                <span className="inline-block h-2 w-2 rounded-full mb-1" style={{ backgroundColor: d.color }} />
                <p className="text-[10px] text-muted-foreground">{d.name}</p>
                <p className="text-sm font-semibold tabular-nums">{d.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> Transactions by Risk Score
            </h3>
            <p className="text-xs text-muted-foreground">Distribution across 5 risk buckets (30d)</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.risk.txByRiskBucket}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, background: "#0f172a", border: "1px solid #1e293b", color: "#fff" }}
                formatter={(v: any, _name: any, props: any) => [`${v} transactions`, props.payload.label]}
                labelStyle={{ color: "#94a3b8" }}
                cursor={{ fill: "rgba(16,185,129,0.08)" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.risk.txByRiskBucket.map((b) => (
                  <Cell key={b.bucket} fill={b.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/5 p-3 ring-1 ring-emerald-500/20">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sanctions Pass Rate</p>
                <p className="text-sm font-bold tabular-nums text-emerald-600">
                  <AnimatedNumber value={m.passRate} duration={1400} decimals={1} suffix="%" />
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right max-w-[180px]">
              {m.totalScreened} screened · {data.sanctions.hitsFound} hits · {data.sanctions.blockedTransactions} blocked
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
 *  Skeleton
 * ========================================================= */
function ComplianceSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-44 rounded-2xl" />
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
