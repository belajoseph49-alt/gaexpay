"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, DollarSign, TrendingUp, AlertTriangle, ShieldCheck, Activity,
  Search, Ban, CheckCircle2, Eye, Download, Ticket, Clock, Cpu,
  ArrowUpRight, ArrowDownRight, Flag, Lock, UserCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatCompact, timeAgo, formatDateTime } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

export function AdminView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Platform monitoring, compliance & operations</p>
        </div>
        <Badge className="bg-rose-500/15 text-rose-600 border-0">
          <Lock className="h-3 w-3 mr-1" /> Admin Access
        </Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" /> Users</TabsTrigger>
          <TabsTrigger value="transactions"><DollarSign className="h-4 w-4 mr-1.5" /> Transactions</TabsTrigger>
          <TabsTrigger value="fraud"><AlertTriangle className="h-4 w-4 mr-1.5" /> Fraud</TabsTrigger>
          <TabsTrigger value="kyc"><ShieldCheck className="h-4 w-4 mr-1.5" /> KYC</TabsTrigger>
          <TabsTrigger value="audit"><Cpu className="h-4 w-4 mr-1.5" /> Audit Logs</TabsTrigger>
          <TabsTrigger value="tickets"><Ticket className="h-4 w-4 mr-1.5" /> Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4"><Overview /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><TxTab /></TabsContent>
        <TabsContent value="fraud" className="mt-4"><FraudTab /></TabsContent>
        <TabsContent value="kyc" className="mt-4"><KycTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
        <TabsContent value="tickets" className="mt-4"><TicketsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Overview() {
  const { data } = useFetch<any>("/api/admin/overview");
  if (!data) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>;

  const kpis = [
    { icon: Users, label: "Total Users", value: data.totalUsers.toLocaleString(), trend: "+1,240", up: true, color: "bg-sky-500/15 text-sky-500" },
    { icon: DollarSign, label: "Volume (14d)", value: formatCompact(data.volume, "NGN"), trend: "+8.4%", up: true, color: "bg-violet-500/15 text-violet-500" },
    { icon: TrendingUp, label: "Fee Revenue", value: formatCompact(data.feeRevenue, "NGN"), trend: "+12.1%", up: true, color: "bg-amber-500/15 text-amber-500" },
    { icon: AlertTriangle, label: "Flagged Tx", value: String(data.flagged), trend: "-4", up: false, color: "bg-rose-500/15 text-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-5 card-lift">
              <div className="flex items-start justify-between">
                <div className={cn("grid h-10 w-10 place-items-center rounded-lg", k.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={k.up ? "text-violet-600 border-violet-500/30" : "text-rose-600 border-rose-500/30"}>
                  {k.up ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}{k.trend}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Volume chart */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Transaction Volume (14 days)</h3>
          <p className="text-xs text-muted-foreground mb-3">Daily processed volume</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="aVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v, "NGN")} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), "NGN")} />
              <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} fill="url(#aVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Type breakdown */}
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Volume by Type</h3>
          <p className="text-xs text-muted-foreground mb-3">Distribution across transaction types</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.typeBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {data.typeBreakdown.map((_: any, i: number) => (
                  <Cell key={i} fill={["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f43f5e", "#84cc16"][i % 7]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatMoney(Number(v), "NGN")} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quick metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Users (30d)", value: data.activeUsers.toLocaleString(), icon: UserCheck, color: "text-violet-600" },
          { label: "Pending KYC", value: data.pendingKyc.toLocaleString(), icon: ShieldCheck, color: "text-amber-600" },
          { label: "Open Tickets", value: String(data.openTickets), icon: Ticket, color: "text-sky-600" },
          { label: "Suspended Accounts", value: String(data.suspendedUsers), icon: Ban, color: "text-rose-600" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="flex items-center gap-3 p-4">
              <Icon className={cn("h-8 w-8", m.color)} />
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-xl font-bold tabular-nums">{m.value}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function UsersTab() {
  const { data } = useFetch<{ users: any[] }>("/api/admin/users");
  const [search, setSearch] = useState("");
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const users = (data?.users ?? []).filter((u) =>
    !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" /> Export</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">User</th>
              <th className="pb-2 font-medium">Country</th>
              <th className="pb-2 font-medium">KYC</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Joined</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {u.firstName[0]}{u.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 text-xs">{u.country}</td>
                <td className="py-2.5">
                  <Badge variant="outline" className={cn("text-[10px]",
                    u.kycStatus === "verified" ? "text-violet-600" : u.kycStatus === "pending" ? "text-amber-600" : "text-muted-foreground")}>
                    Tier {u.kycTier}
                  </Badge>
                </td>
                <td className="py-2.5">
                  <Badge variant="outline" className={cn("text-[10px]",
                    u.status === "active" ? "text-violet-600" : u.status === "suspended" ? "text-rose-600" : "text-muted-foreground")}>
                    {u.status}
                  </Badge>
                </td>
                <td className="py-2.5 text-xs text-muted-foreground">{timeAgo(u.createdAt)}</td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toast.info("Viewing user")}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => toast.success("User suspended")}><Ban className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TxTab() {
  const { data } = useFetch<{ transactions: any[] }>("/api/admin/transactions?limit=100");
  const txs = data?.transactions ?? [];
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">All Transactions ({txs.length})</h3>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" /> Export</Button>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 font-medium">Reference</th>
              <th className="pb-2 font-medium">User</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2.5 font-mono text-xs">{t.reference}</td>
                <td className="py-2.5 text-xs">{t.user?.firstName} {t.user?.lastName}</td>
                <td className="py-2.5 capitalize text-xs">{t.type}</td>
                <td className="py-2.5 font-medium tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                <td className="py-2.5">
                  <Badge variant="outline" className={cn("text-[10px]",
                    t.status === "completed" ? "text-violet-600" : t.status === "flagged" ? "text-orange-600" : t.status === "failed" ? "text-rose-600" : "text-amber-600")}>
                    {t.status}
                  </Badge>
                </td>
                <td className="py-2.5 text-xs text-muted-foreground">{timeAgo(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FraudTab() {
  const { data } = useFetch<{ flagged: any[] }>("/api/admin/fraud");
  const flagged = data?.flagged ?? [];
  return (
    <div className="space-y-4">
      <Card className="border-rose-500/30 bg-rose-500/5 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Fraud Detection — AI Powered</h3>
            <p className="text-sm text-muted-foreground">{flagged.length} transactions flagged for review. ML model analyzes patterns in real-time.</p>
          </div>
        </div>
      </Card>
      <div className="space-y-2">
        {flagged.map((t) => (
          <Card key={t.id} className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500/15 text-orange-500">
              <Flag className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium font-mono">{t.reference}</p>
                <Badge className="bg-orange-500/15 text-orange-600 border-0">Risk {(t.riskScore * 100).toFixed(0)}%</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.user?.firstName} {t.user?.lastName} · {formatMoney(t.amount, t.currency)} · {t.type} · {timeAgo(t.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs text-violet-600" onClick={() => toast.success("Transaction approved")}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600" onClick={() => toast.success("Transaction blocked & account frozen")}>
                <Ban className="h-3.5 w-3.5 mr-1" /> Block
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function KycTab() {
  const { data } = useFetch<{ users: any[] }>("/api/admin/users?status=all");
  const pending = (data?.users ?? []).filter((u) => u.kycStatus === "pending");
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-1">KYC Verification Queue</h3>
        <p className="text-sm text-muted-foreground mb-4">{pending.length} applications awaiting review</p>
        <div className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No pending KYC applications</p>}
          {pending.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-amber-500/15 text-amber-600 text-xs font-semibold">
                  {u.firstName[0]}{u.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-muted-foreground">{u.email} · {u.country} · Submitted {timeAgo(u.createdAt)}</p>
              </div>
              <Button size="sm" className="h-7 text-xs" onClick={() => toast.success("KYC approved")}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600" onClick={() => toast.success("KYC rejected")}>
                Reject
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AuditTab() {
  const { data } = useFetch<{ logs: any[] }>("/api/admin/audit");
  const logs = data?.logs ?? [];
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Audit Trail ({logs.length})</h3>
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {logs.map((l) => {
          const sc: Record<string, any> = {
            info: "bg-sky-500/15 text-sky-600",
            warning: "bg-amber-500/15 text-amber-600",
            critical: "bg-rose-500/15 text-rose-600",
          };
          return (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className={cn("grid h-8 w-8 place-items-center rounded-full text-xs font-bold", sc[l.severity])}>
                {l.severity[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{l.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {l.user ? `${l.user.firstName} ${l.user.lastName}` : l.actor} · {l.entity} · {l.ip}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(l.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TicketsTab() {
  const { data } = useFetch<{ tickets: any[] }>("/api/admin/tickets");
  const tickets = data?.tickets ?? [];
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Support Tickets ({tickets.length})</h3>
      <div className="space-y-2">
        {tickets.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/15 text-sky-500">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t.user?.firstName} {t.user?.lastName} · {t.messages?.[0]?.content}
              </p>
            </div>
            <Badge variant="outline" className={cn("text-[10px]",
              t.priority === "urgent" ? "text-rose-600" : t.priority === "high" ? "text-amber-600" : "text-muted-foreground")}>
              {t.priority}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {timeAgo(t.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
