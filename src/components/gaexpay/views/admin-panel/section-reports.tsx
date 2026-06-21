"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Download, FileText, Users, TrendingUp, ShieldCheck } from "lucide-react";
import { formatMoney, formatCompact } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState } from "./shared";
import { toast } from "sonner";

export function ReportsSection() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const { data, loading } = useFetch<any>(`/api/admin/reports?period=${period}`);

  function exportCSV() {
    if (!data) return;
    const headers = ["Bucket", "Revenue (NGN)", "Volume (NGN)", "Count"];
    const rows = data.buckets.map((b: any) => [b.bucket, b.revenue.toFixed(2), b.volume.toFixed(2), b.count]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `gaexpay-report-${period}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(u);
    toast.success("Report exported");
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Reports & Statistics" description="Revenue, users, transactions, KYC" icon={BarChart3} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Reports & Statistics"
        description="Comprehensive platform analytics & exports"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs">Daily</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">Weekly</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1.5" /> CSV
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={TrendingUp} label="Total Revenue" value={formatCompact(data.summary.totalRevenue, "NGN")} color="bg-emerald-500/15 text-emerald-600" />
        <SummaryCard icon={BarChart3} label="Total Volume" value={formatCompact(data.summary.totalVolume, "NGN")} color="bg-sky-500/15 text-sky-600" />
        <SummaryCard icon={FileText} label="Transactions" value={data.summary.totalTx.toLocaleString()} color="bg-violet-500/15 text-violet-600" />
        <SummaryCard icon={Users} label="New Users" value={data.summary.newUsers.toLocaleString()} color="bg-amber-500/15 text-amber-600" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Revenue Trend</h3>
          <p className="text-xs text-muted-foreground mb-3">Fee revenue over time (NGN)</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), "NGN")} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-1">Volume Trend</h3>
          <p className="text-xs text-muted-foreground mb-3">Processed volume over time</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.buckets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), "NGN")} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
              <Bar dataKey="volume" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Fee breakdown + KYC report */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Revenue by Transaction Type</h3>
          <div className="space-y-2">
            {data.feeByType.map((f: any) => (
              <div key={f.type} className="flex items-center justify-between text-sm">
                <span className="capitalize">{f.type}</span>
                <span className="font-medium tabular-nums">{formatMoney(f.value, "NGN")}</span>
              </div>
            ))}
            {data.feeByType.length === 0 && <EmptyState message="No data" icon={BarChart3} />}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> KYC/KYB Processing Report</h3>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Total Users" value={data.kycStats.total} />
            <Kpi label="KYC Verified" value={data.kycStats.verified} color="text-emerald-600" />
            <Kpi label="KYC Pending" value={data.kycStats.pending} color="text-amber-600" />
            <Kpi label="KYC Rejected" value={data.kycStats.rejected} color="text-rose-600" />
            <Kpi label="KYC Unverified" value={data.kycStats.unverified} color="text-muted-foreground" />
            <Kpi label="Total Businesses" value={data.kycStats.totalBusinesses} />
            <Kpi label="KYB Verified" value={data.kycStats.kybVerified} color="text-emerald-600" />
            <Kpi label="KYB Pending" value={data.kycStats.kybPending} color="text-amber-600" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color || ""}`}>{value.toLocaleString()}</p>
    </div>
  );
}
