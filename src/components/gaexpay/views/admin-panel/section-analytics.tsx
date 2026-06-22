"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, Users, Globe, Smartphone, TrendingUp, Clock, Filter, Repeat, Target,
} from "lucide-react";
import { formatCompact } from "@/lib/gaexpay";
import { SectionHeader, LoadingGrid, EmptyState } from "./shared";

const DEVICE_COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b"];
const PERIOD_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function AnalyticsSection() {
  const [days, setDays] = useState("30");
  const { data, loading } = useFetch<any>(`/api/admin/analytics?days=${days}`);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Platform Analytics" description="Deep-dive metrics" icon={Activity} />
        <LoadingGrid count={4} className="grid-cols-2 lg:grid-cols-4" />
      </div>
    );
  }

  const funnelTotal = data.funnel?.[0]?.value ?? 1;
  const funnel = (data.funnel ?? []).map((f: any) => ({
    ...f,
    pct: funnelTotal > 0 ? Math.round((f.value / funnelTotal) * 100) : 0,
  }));

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Platform Analytics"
        description="DAU/MAU, retention, conversion funnel, geo & device breakdown"
        icon={Activity}
        actions={
          <Tabs value={days} onValueChange={setDays}>
            <TabsList className="h-8">
              {PERIOD_OPTIONS.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="text-xs">{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="DAU (today)" value={data.dauToday ?? 0} color="bg-sky-500/15 text-sky-600" />
        <KpiCard icon={Users} label="MAU (30d)" value={data.mau ?? 0} color="bg-emerald-500/15 text-emerald-600" />
        <KpiCard icon={TrendingUp} label="DAU/MAU Ratio" value={`${data.dauMauRatio ?? 0}%`} color="bg-violet-500/15 text-violet-600" />
        <KpiCard icon={Clock} label="Avg Session" value={`${Math.round((data.sessions?.avgDurationSec ?? 0) / 60)}m ${((data.sessions?.avgDurationSec ?? 0) % 60)}s`} color="bg-amber-500/15 text-amber-600" />
      </div>

      {/* DAU trend */}
      <Card className="p-5">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> DAU Trend</h3>
        <p className="text-xs text-muted-foreground mb-3">Daily active users over the last {days} days</p>
        {data.dauTrend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.dauTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="dau" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyState message="No data" icon={TrendingUp} />}
      </Card>

      {/* Conversion funnel + retention cohort */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Conversion Funnel</h3>
          <p className="text-xs text-muted-foreground mb-3">From signup to repeat transaction</p>
          <div className="space-y-2">
            {funnel.map((stage: any, i: number) => (
              <div key={stage.stage}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{stage.stage}</span>
                  <span className="text-muted-foreground">{stage.value.toLocaleString()} ({stage.pct}%)</span>
                </div>
                <div className="h-6 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{ width: `${stage.pct}%`, background: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Repeat className="h-4 w-4 text-primary" /> Retention Cohort</h3>
          <p className="text-xs text-muted-foreground mb-3">Weekly retention by signup cohort (%)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium py-1.5 pr-2">Cohort</th>
                  <th className="text-right font-medium py-1.5 px-2">Users</th>
                  <th className="text-right font-medium py-1.5 px-2">W1</th>
                  <th className="text-right font-medium py-1.5 px-2">W2</th>
                  <th className="text-right font-medium py-1.5 px-2">W3</th>
                  <th className="text-right font-medium py-1.5 pl-2">W4</th>
                </tr>
              </thead>
              <tbody>
                {(data.cohorts ?? []).map((c: any) => (
                  <tr key={c.cohort} className="border-t">
                    <td className="py-1.5 pr-2 font-mono">{c.cohort}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{c.size}</td>
                    {[c.week1, c.week2, c.week3, c.week4].map((v: number, i: number) => (
                      <td key={i} className="py-1.5 px-2 text-right">
                        <span
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums"
                          style={{
                            background: `rgba(16, 185, 129, ${Math.max(0.05, v / 100)})`,
                            color: v >= 50 ? "#fff" : "inherit",
                          }}
                        >
                          {v}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Geo + Devices */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Geographic Distribution</h3>
          <p className="text-xs text-muted-foreground mb-3">Top countries by user count</p>
          {data.geo?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.geo} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="users" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No geographic data" icon={Globe} />}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Device Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribution by device type</p>
          {data.devices?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.devices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  labelLine={false}
                >
                  {data.devices.map((_: any, i: number) => (
                    <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No device data" icon={Smartphone} />}
        </Card>
      </div>

      {/* Feature usage + session */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Feature Usage</h3>
          <p className="text-xs text-muted-foreground mb-3">Most-used features (by transaction type)</p>
          {data.featureUsage?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.featureUsage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="feature" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No feature usage data" icon={Activity} />}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Session Analytics</h3>
          <p className="text-xs text-muted-foreground mb-3">User engagement metrics</p>
          <div className="grid grid-cols-2 gap-3">
            <SessionCard label="Avg Duration" value={`${Math.round((data.sessions?.avgDurationSec ?? 0) / 60)}m ${(data.sessions?.avgDurationSec ?? 0) % 60}s`} />
            <SessionCard label="Pages / Session" value={`${data.sessions?.pagesPerSession ?? 0}`} />
            <SessionCard label="Total Devices" value={`${(data.sessions?.totalDevices ?? 0).toLocaleString()}`} />
            <SessionCard label="Period" value={`${days} days`} />
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Filter className="h-3 w-3" /> Insights</p>
            <ul className="space-y-1 text-xs">
              <li>• DAU/MAU ratio of <Badge variant="outline" className="text-[9px] mx-0.5">{data.dauMauRatio}%</Badge> indicates {data.dauMauRatio >= 20 ? "healthy engagement" : "opportunity to improve retention"}</li>
              <li>• {(data.funnel?.[2]?.value ?? 0)} users completed KYC out of {(data.funnel?.[0]?.value ?? 0)} signups ({funnel[2]?.pct ?? 0}% conversion)</li>
              <li>• {data.geo?.[0]?.country ?? "—"} is the top geography with {data.geo?.[0]?.users ?? 0} users</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </Card>
  );
}

function SessionCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
