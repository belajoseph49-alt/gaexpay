"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, CheckCircle2, Pause, TrendingUp,
  TrendingDown, Zap, Gauge, AlertOctagon, Clock, ArrowUpRight,
  ArrowDownRight, Crown, Flame,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { getServiceMeta, type Stats } from "./data";

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
};
const timeAgo = (d: string | Date | null) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 0) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

interface Props {
  stats: Stats | null;
  loading: boolean;
}

const CHART_COLORS = {
  primary: "#10b981",
  warning: "#f59e0b",
  error: "#f43f5e",
  info: "#0ea5e9",
  muted: "#71717a",
};

export function StatsTab({ stats, loading }: Props) {
  const seriesData = useMemo(() => stats?.series || [], [stats]);
  const rtData = useMemo(() => stats?.responseTimeDistribution || [], [stats]);

  if (loading || !stats) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-72" />)}
      </div>
    );
  }

  const { totals, topUsed, topErrors, byService, recentErrors } = stats;
  const peakRequests = Math.max(...seriesData.map(s => s.requests), 1);
  const avgResponseMs = seriesData.length > 0
    ? Math.round(seriesData.reduce((s, d) => s + d.avgResponseMs, 0) / seriesData.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Health summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HealthCard
          icon={CheckCircle2}
          label="Healthy"
          value={totals.healthy}
          color="bg-violet-500/15 text-violet-600"
          dot="bg-violet-500"
        />
        <HealthCard
          icon={AlertTriangle}
          label="Warnings"
          value={totals.warnings}
          color="bg-amber-500/15 text-amber-600"
          dot="bg-amber-500"
        />
        <HealthCard
          icon={AlertOctagon}
          label="Errors"
          value={totals.errors}
          color="bg-rose-500/15 text-rose-600"
          dot="bg-rose-500"
        />
        <HealthCard
          icon={Pause}
          label="Disabled"
          value={totals.disabled}
          color="bg-zinc-500/15 text-zinc-500"
          dot="bg-zinc-400"
        />
      </div>

      {/* Requests over time + Error rate */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold">Requests Over Time</h3>
              <p className="text-xs text-muted-foreground">Daily API call volume (14 days)</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              <Activity className="h-2.5 w-2.5 mr-1" />
              peak {fmtCompact(peakRequests)}/day
            </Badge>
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-req" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-err" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.error} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={CHART_COLORS.error} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill="url(#g-req)"
                  name="Requests"
                />
                <Area
                  type="monotone"
                  dataKey="errors"
                  stroke={CHART_COLORS.error}
                  strokeWidth={2}
                  fill="url(#g-err)"
                  name="Errors"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold">Error Rate Trend</h3>
              <p className="text-xs text-muted-foreground">Daily error % across all APIs</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              <Gauge className="h-2.5 w-2.5 mr-1" />
              overall {(totals.overallErrorRate * 100).toFixed(2)}%
            </Badge>
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData.map(s => ({
                ...s,
                errorRate: s.requests > 0 ? Number((s.errors / s.requests * 100).toFixed(2)) : 0,
              }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  stroke={CHART_COLORS.error}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.error, r: 3 }}
                  name="Error %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Response time distribution + Service breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold">Response Time Distribution</h3>
              <p className="text-xs text-muted-foreground">Bucketed latencies (14 days)</p>
            </div>
            <Badge variant="outline" className="text-[10px]">
              <Zap className="h-2.5 w-2.5 mr-1" />
              avg {avgResponseMs}ms
            </Badge>
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rtData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill={CHART_COLORS.info}
                  radius={[4, 4, 0, 0]}
                  name="Count"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold">Requests by Service</h3>
              <p className="text-xs text-muted-foreground">Total call volume per category</p>
            </div>
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byService.map(s => ({ ...s, label: getServiceMeta(s.service).label }))}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="totalRequests"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  name="Total Requests"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top 5 most-used + Top 5 most-erroring */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold">Top 5 Most-Used APIs</h3>
          </div>
          {topUsed.length === 0 ? (
            <div className="py-10 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No usage data yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topUsed.map((api, idx) => {
                const meta = getServiceMeta(api.service);
                const Icon = meta.icon;
                const errorRate = api.totalRequests > 0 ? api.failedRequests / api.totalRequests : 0;
                return (
                  <motion.div
                    key={api.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2.5"
                  >
                    <div className={cn("grid h-7 w-7 place-items-center rounded-lg text-xs font-bold", meta.color)}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{api.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Icon className="h-2.5 w-2.5" />
                          {meta.label}
                        </span>
                        {errorRate > 0 && (
                          <span className="text-rose-600">{(errorRate * 100).toFixed(1)}% err</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{fmtCompact(api.totalRequests)}</p>
                      <p className="text-[10px] text-muted-foreground">requests</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-rose-500" />
            <h3 className="font-semibold">Top 5 Most-Erroring APIs</h3>
          </div>
          {topErrors.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-violet-500/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No errors recorded 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {topErrors.map((api, idx) => {
                const meta = getServiceMeta(api.service);
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={api.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border bg-rose-500/5 p-2.5"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/15 text-rose-600 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{api.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Icon className="h-2.5 w-2.5" />
                          {meta.label}
                        </span>
                        <span>last err: {timeAgo(api.lastErrorAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-rose-600">{fmtCompact(api.failedRequests)}</p>
                      <p className="text-[10px] text-muted-foreground">{(api.errorRate * 100).toFixed(1)}% of {fmtCompact(api.totalRequests)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent errors feed */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertOctagon className="h-4 w-4 text-rose-500" />
          <h3 className="font-semibold">Recent Errors (7 days)</h3>
          <Badge variant="outline" className="text-[10px] ml-auto">{recentErrors.length} entries</Badge>
        </div>
        {recentErrors.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-violet-500/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No recent errors. All systems nominal.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {recentErrors.map((log, idx) => {
              const api = topUsed.find(a => a.id === log.apiConfigId)
                || topErrors.find(a => a.id === log.apiConfigId);
              const meta = api ? getServiceMeta(api.service) : getServiceMeta("other");
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                  className="flex items-start gap-2 rounded-lg border bg-rose-500/5 p-2.5"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{api?.name || "Unknown API"}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{log.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      {log.statusCode != null && <span>HTTP {log.statusCode}</span>}
                      {log.responseTimeMs != null && <span>{log.responseTimeMs}ms</span>}
                      <span>{timeAgo(log.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function HealthCard({
  icon: Icon, label, value, color, dot,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  dot: string;
}) {
  return (
    <Card className="p-4 card-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg", color)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className={cn("h-2 w-2 rounded-full", dot)} />
      </div>
      <p className="mt-2.5 text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}
