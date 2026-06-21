"use client";

import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, DollarSign, TrendingUp, Activity, ShieldCheck,
  Ticket, AlertTriangle, Server, Zap, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatMoney, formatCompact, timeAgo, formatDateTime } from "@/lib/gaexpay";
import { KpiCard, LoadingGrid, SectionHeader, HealthDot, EmptyState } from "./shared";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#84cc16", "#3b82f6"];

export function OverviewSection() {
  const { data, loading } = useFetch<any>("/api/admin/overview");
  const audit = useFetch<any>("/api/admin/audit?limit=10");

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Overview Dashboard" description="Platform KPIs, charts & activity feed" icon={Activity} />
        <LoadingGrid count={4} className="grid-cols-2 lg:grid-cols-4" />
      </div>
    );
  }

  const kpis = [
    { icon: Users, label: "Total Users", value: data.totalUsers?.toLocaleString() ?? "0", trend: "+8.4%", trendUp: true, color: "bg-sky-500/15 text-sky-500" },
    { icon: Building2, label: "Total Businesses", value: data.totalBusinesses?.toLocaleString() ?? "0", color: "bg-violet-500/15 text-violet-500" },
    { icon: DollarSign, label: "Platform Volume", value: formatCompact(data.volume || 0, "NGN"), trend: "+12%", trendUp: true, color: "bg-emerald-500/15 text-emerald-500" },
    { icon: TrendingUp, label: "Revenue (Fees)", value: formatCompact(data.feeRevenue || 0, "NGN"), trend: "+5.1%", trendUp: true, color: "bg-amber-500/15 text-amber-500" },
    { icon: Activity, label: "Active Users", value: data.activeUsers?.toLocaleString() ?? "0", color: "bg-teal-500/15 text-teal-500" },
    { icon: ShieldCheck, label: "Pending KYC", value: String(data.pendingKyc ?? 0), color: "bg-orange-500/15 text-orange-500" },
    { icon: Building2, label: "Pending KYB", value: String(data.pendingKyb ?? 0), color: "bg-pink-500/15 text-pink-500" },
    { icon: AlertTriangle, label: "Open Disputes", value: String(data.openDisputes ?? 0), color: "bg-rose-500/15 text-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview Dashboard"
        description="Platform KPIs, charts & activity feed"
        icon={Activity}
        actions={
          <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
            <HealthDot status="operational" /> All systems operational
          </Badge>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-1">User Growth (14 days)</h3>
          <p className="text-xs text-muted-foreground mb-3">New signups per day</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => (typeof v === "string" ? v.slice(5) : v)} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Transaction Volume (14 days)</h3>
          <p className="text-xs text-muted-foreground mb-3">Daily processed volume (NGN)</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.series || []}>
              <defs>
                <linearGradient id="aVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => (typeof v === "string" ? v.slice(5) : v)} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), "NGN")} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
              <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} fill="url(#aVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue by type */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Revenue by Type</h3>
          <p className="text-xs text-muted-foreground mb-3">Fee revenue breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.revenueByType || []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {(data.revenueByType || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatMoney(Number(v), "NGN")} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold mb-1">Recent Activity</h3>
          <p className="text-xs text-muted-foreground mb-3">Last 10 admin audit logs</p>
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-2">
            {(audit.data?.logs ?? []).length === 0 && <EmptyState message="No recent activity" icon={Activity} />}
            {(audit.data?.logs ?? []).map((l: any) => (
              <div key={l.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                <div className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold shrink-0",
                  l.severity === "critical" ? "bg-rose-500/15 text-rose-600"
                  : l.severity === "warning" ? "bg-amber-500/15 text-amber-600"
                  : "bg-sky-500/15 text-sky-600",
                )}>
                  {l.severity?.[0]?.toUpperCase() ?? "I"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.action?.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {l.user ? `${l.user.firstName} ${l.user.lastName}` : l.actor} · {l.entity}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(l.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* System health */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" /> System Health
        </h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <HealthCard icon={Activity} label="API Status" value="Operational" status="operational" />
          <HealthCard icon={Zap} label="Avg Response" value={`${data.systemHealth?.avgResponseMs ?? 0}ms`} status="operational" />
          <HealthCard icon={AlertTriangle} label="Error Rate" value={`${data.systemHealth?.errorRate ?? 0}%`} status={Number(data.systemHealth?.errorRate) < 1 ? "operational" : "degraded"} />
          <HealthCard icon={Server} label="Uptime" value={`${data.systemHealth?.uptime ?? 99.9}%`} status="operational" />
        </div>
      </Card>
    </div>
  );
}

function HealthCard({ icon: Icon, label, value, status }: { icon: any; label: string; value: string; status: "operational" | "degraded" | "down" }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <HealthDot status={status} /> {label}
        </p>
        <p className="text-base font-bold">{value}</p>
      </div>
    </div>
  );
}
