"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Search, Download, ArrowDownRight, ArrowUpRight,
  TrendingDown, TrendingUp, Wallet, AlertTriangle, CheckCircle2, Clock,
  ShieldAlert, RefreshCw, FileText, BarChart3, Hash,
  Activity, Banknote, Receipt, Scale, FileCheck2, ChevronRight, CircleDot,
  Lock, Coins, Layers, AlertCircle, Bell, Ticket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOL } from "@/lib/gaexpay";

/* =========================================================
 *  Helpers
 * ========================================================= */
const fmtNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n || 0);
const fmtAmt = (n: number, currency: string) => {
  const symbol = CURRENCY_SYMBOL[currency] ?? "";
  return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Math.abs(n || 0))}`;
};
const fmtDateTime = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const fmtDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const today = () => isoDate(new Date());
const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return isoDate(d);
};

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "transfer", label: "Transfer" },
  { value: "payment", label: "Payment" },
  { value: "bill", label: "Bill" },
  { value: "airtime", label: "Airtime" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "exchange", label: "Exchange" },
  { value: "card", label: "Card" },
  { value: "referral", label: "Referral" },
  { value: "fee", label: "Fee" },
];
const CURRENCY_OPTIONS = [
  { value: "all", label: "All currencies" },
  { value: "NGN", label: "NGN — Naira" },
  { value: "USD", label: "USD — Dollar" },
  { value: "GHS", label: "GHS — Cedi" },
  { value: "KES", label: "KES — Shilling" },
  { value: "XOF", label: "XOF — CFA" },
  { value: "XAF", label: "XAF — CFA" },
  { value: "ZAR", label: "ZAR — Rand" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "reversed", label: "Reversed" },
  { value: "flagged", label: "Flagged" },
];

const statusBadgeClass = (s: string) =>
  s === "completed" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
  : s === "failed" ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
  : s === "reversed" ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
  : s === "flagged" ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
  : "bg-muted text-muted-foreground";

/* =========================================================
 *  Types (mirror of API responses)
 * ========================================================= */
interface LedgerEntry {
  reference: string;
  date: string;
  type: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  direction: string;
  counterparty: string | null;
  counterpartyAccount: string | null;
  counterpartyBank: string | null;
  method: string | null;
  provider: string | null;
  category: string;
  riskScore: number;
  fraudFlag: boolean;
  completedAt: string | null;
  metadata: unknown;
  auditTrail: { id: string; action: string; actor: string; severity: string; timestamp: string; details: unknown }[];
}
interface LedgerResponse {
  range: { from: string; to: string };
  entries: LedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    totalFees: number;
    netFlow: number;
    transactionCount: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byCurrency: Record<string, number>;
  };
}
interface TraceResponse {
  transaction: {
    id: string; reference: string; userId: string; senderId: string | null;
    type: string; direction: string; status: string;
    amount: number; fee: number; currency: string;
    description: string; category: string;
    counterpartyName: string | null; counterpartyAccount: string | null;
    counterpartyBank: string | null; method: string | null; provider: string | null;
    walletId: string | null; riskScore: number; fraudFlag: boolean;
    metadata: unknown; createdAt: string; completedAt: string | null;
  };
  timeline: {
    id: string; action: string; actor: string;
    severity: "info" | "warning" | "critical" | "success" | "neutral";
    source: "audit" | "notification" | "dispute" | "scheduled" | "system";
    timestamp: string; details: unknown;
  }[];
  auditTrail: {
    id: string; action: string; actor: string; severity: string;
    ip: string | null; userAgent: string | null;
    details: unknown; timestamp: string;
  }[];
  notifications: {
    id: string; title: string; message: string; type: string;
    channel: string; isRead: boolean; timestamp: string;
  }[];
  supportTickets: {
    id: string; subject: string; category: string;
    priority: string; status: string; createdAt: string;
  }[];
  disputes: {
    id: string; reason: string; description: string;
    status: string; priority: string; resolution: string | null;
    createdAt: string; resolvedAt: string | null;
  }[];
  scheduledTransfer: {
    id: string; frequency: string; nextRunAt: string;
    lastRunAt: string | null; totalRuns: number; status: string;
  } | null;
  walletImpact: {
    currency: string; before: number; after: number;
    delta: number; feeApplied: number; direction: string;
    wallets: { id: string; label: string; type: string; currentBalance: number; ledgerBalance: number }[];
  };
  riskAssessment: {
    riskScore: number; fraudFlag: boolean; tier: string; recommendation: string;
  };
}
interface ReconciliationResponse {
  range: { from: string; to: string };
  generatedAt: string;
  totals: {
    transactionCount: number; completedCount: number;
    totalVolume: number; totalFees: number;
    failedCount: number; failedAmount: number;
    refundedCount: number; refundedAmount: number;
    disputedCount: number;
    creditVolume: number; debitVolume: number;
    netSettlement: number;
    unreconciledCount: number;
  };
  volumeByCurrency: Record<string, number>;
  volumeByType: Record<string, number>;
  volumeByStatus: Record<string, number>;
  feesByCurrency: Record<string, number>;
  feesByType: Record<string, number>;
  walletTotalsByCurrency: {
    currency: string; balance: number; ledgerBalance: number; walletCount: number;
  }[];
  wallets: {
    id: string; currency: string; balance: number;
    ledgerBalance: number; label: string; type: string;
  }[];
  disputes: {
    id: string; transactionRef: string | null; reason: string;
    status: string; priority: string; createdAt: string;
  }[];
  unreconciled: {
    reference: string; amount: number; currency: string;
    type: string; description: string; createdAt: string;
  }[];
  reconciliationHealth: number;
  isBalanced: boolean;
}

/* =========================================================
 *  CSV export
 * ========================================================= */
function downloadCSV(filename: string, rows: string[][]) {
  const escape = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* =========================================================
 *  Main view
 * ========================================================= */
export function AccountingView() {
  const [tab, setTab] = useState<string>("ledger");
  const [traceRef, setTraceRef] = useState<string>("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight">Accounting & Traceability</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Double-entry ledger, transaction traceability, and daily reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-500 border-0">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
          <Badge variant="outline" className="border-rose-500/30 text-rose-500">
            <Lock className="h-3 w-3 mr-1" /> Back-Office
          </Badge>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto bg-muted/50">
          <TabsTrigger value="ledger" className="gap-1.5">
            <BookOpen className="h-4 w-4" /> Ledger
          </TabsTrigger>
          <TabsTrigger value="trace" className="gap-1.5">
            <Search className="h-4 w-4" /> Trace
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-1.5">
            <Scale className="h-4 w-4" /> Reconciliation
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <FileText className="h-4 w-4" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-5">
          <LedgerTab
            onTrace={(ref) => {
              setTraceRef(ref);
              setTab("trace");
            }}
          />
        </TabsContent>
        <TabsContent value="trace" className="mt-5">
          <TraceTab prefillRef={traceRef} />
        </TabsContent>
        <TabsContent value="reconciliation" className="mt-5">
          <ReconciliationTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-5">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* =========================================================
 *  Tab 1: Ledger
 * ========================================================= */
function LedgerTab({ onTrace }: { onTrace: (ref: string) => void }) {
  const [from, setFrom] = useState<string>(thirtyDaysAgo());
  const [to, setTo] = useState<string>(today());
  const [type, setType] = useState<string>("all");
  const [currency, setCurrency] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (type && type !== "all") p.set("type", type);
    if (currency && currency !== "all") p.set("currency", currency);
    if (status && status !== "all") p.set("status", status);
    p.set("limit", "1000");
    return p.toString();
  }, [from, to, type, currency, status, reloadKey]);

  const { data, loading, error } = useFetch<LedgerResponse>(`/api/accounting?${qs}`);

  const entries = data?.entries ?? [];
  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.trim().toLowerCase();
    return entries.filter((e) =>
      e.reference.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      (e.counterparty ?? "").toLowerCase().includes(q) ||
      e.debitAccount.toLowerCase().includes(q) ||
      e.creditAccount.toLowerCase().includes(q)
    );
  }, [entries, query]);

  const summary = data?.summary;

  const exportCSV = () => {
    if (!filtered.length) {
      toast.error("No entries to export");
      return;
    }
    const rows: string[][] = [
      ["Date", "Reference", "Type", "Direction", "Description",
        "Debit Account", "Credit Account", "Amount", "Fee", "Currency",
        "Status", "Counterparty", "Method", "Provider", "Risk Score"],
      ...filtered.map((e) => [
        e.date, e.reference, e.type, e.direction, e.description,
        e.debitAccount, e.creditAccount, String(e.amount), String(e.fee),
        e.currency, e.status, e.counterparty ?? "", e.method ?? "",
        e.provider ?? "", String(e.riskScore),
      ]),
    ];
    downloadCSV(`gaexpay-ledger-${from}_to_${to}.csv`, rows);
    toast.success(`Exported ${filtered.length} ledger entries`);
  };

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Currency</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Reference, description, counterparty…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </Card>

      {/* Summary cards */}
      {loading && !summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={ArrowUpRight} label="Total Debit" color="rose"
            value={fmtAmt(summary.totalDebit, "NGN")}
            sub={`${fmtNum(summary.transactionCount)} transactions`}
          />
          <SummaryCard
            icon={ArrowDownRight} label="Total Credit" color="emerald"
            value={fmtAmt(summary.totalCredit, "NGN")}
            sub="Inflow over range"
          />
          <SummaryCard
            icon={Receipt} label="Total Fees" color="amber"
            value={fmtAmt(summary.totalFees, "NGN")}
            sub="Platform revenue"
          />
          <SummaryCard
            icon={summary.netFlow >= 0 ? TrendingUp : TrendingDown}
            label="Net Flow" color={summary.netFlow >= 0 ? "emerald" : "rose"}
            value={fmtAmt(summary.netFlow, "NGN")}
            sub={summary.netFlow >= 0 ? "Net inflow" : "Net outflow"}
          />
          <SummaryCard
            icon={Activity} label="Tx Count" color="teal"
            value={fmtNum(summary.transactionCount)}
            sub={`${Object.keys(summary.byCurrency || {}).length} currencies`}
          />
        </div>
      ) : null}

      {/* Ledger table */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">General Ledger</h3>
            <Badge variant="outline" className="ml-1">{filtered.length} rows</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Double-entry · {Object.keys(summary?.byType || {}).length} types
          </div>
        </div>
        {error ? (
          <div className="p-8 text-center text-rose-500 text-sm">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            Failed to load ledger: {error}
          </div>
        ) : filtered.length === 0 && !loading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No ledger entries for this filter.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[140px]">Date</TableHead>
                  <TableHead className="min-w-[140px]">Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="min-w-[220px]">Description</TableHead>
                  <TableHead className="min-w-[160px]">Debit Account</TableHead>
                  <TableHead className="min-w-[160px]">Credit Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow
                    key={e.reference}
                    onClick={() => onTrace(e.reference)}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDateTime(e.date)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-medium">{e.reference}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{e.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[260px] truncate" title={e.description}>
                      {e.description}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-rose-500" />
                        {e.debitAccount}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                        {e.creditAccount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      <span className={e.direction === "credit" ? "text-emerald-500" : "text-foreground"}>
                        {e.direction === "credit" ? "+" : "-"}{fmtAmt(e.amount, e.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {e.fee > 0 ? fmtAmt(e.fee, e.currency) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] capitalize border", statusBadgeClass(e.status))}>
                        {e.status}
                      </Badge>
                      {e.fraudFlag && (
                        <ShieldAlert className="inline-block h-3 w-3 ml-1 text-orange-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Breakdown row */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <BreakdownCard title="By Type" data={summary.byType} icon={Layers} />
          <BreakdownCard title="By Status" data={summary.byStatus} icon={Activity} />
          <BreakdownCard title="By Currency" data={summary.byCurrency} icon={Coins} />
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: any; label: string; value: string; sub?: string;
  color: "rose" | "emerald" | "amber" | "teal" | "sky";
}) {
  const colors = {
    rose: "bg-rose-500/15 text-rose-500",
    emerald: "bg-emerald-500/15 text-emerald-500",
    amber: "bg-amber-500/15 text-amber-500",
    teal: "bg-teal-500/15 text-teal-500",
    sky: "bg-sky-500/15 text-sky-500",
  };
  return (
    <Card className="p-4 card-lift">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={cn("p-2 rounded-lg", colors[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function BreakdownCard({
  title, data, icon: Icon,
}: { title: string; data: Record<string, number>; icon: any }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-emerald-500" />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data</p>
        ) : entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <span className="capitalize text-muted-foreground">{k}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(v / total) * 100}%` }} />
              </div>
              <span className="font-medium tabular-nums w-8 text-right">{v}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========================================================
 *  Tab 2: Trace
 * ========================================================= */
function TraceTab({ prefillRef }: { prefillRef: string }) {
  const [search, setSearch] = useState<string>(prefillRef);
  const [submittedRef, setSubmittedRef] = useState<string>(prefillRef);

  // When parent (LedgerTab) sets a new reference, pre-fill and auto-search.
  useEffect(() => {
    if (prefillRef) {
      setSearch(prefillRef);
      setSubmittedRef(prefillRef);
    }
  }, [prefillRef]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = search.trim();
    if (!r) {
      toast.error("Enter a transaction reference");
      return;
    }
    setSubmittedRef(r);
  };

  const url = submittedRef ? `/api/accounting/trace/${encodeURIComponent(submittedRef)}` : null;
  const { data, loading, error } = useFetch<TraceResponse>(url);

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Transaction Reference
            </label>
            <div className="relative">
              <Hash className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="e.g. GXPMQK62VNE6XIG"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-mono uppercase"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            <Search className="h-4 w-4 mr-1.5" /> {loading ? "Tracing…" : "Trace"}
          </Button>
        </form>
      </Card>

      {!submittedRef ? (
        <EmptyState
          icon={Search}
          title="Search for a transaction reference"
          sub="Enter any GXP reference above to view its complete traceability report — audit trail, notifications, disputes, wallet impact, and risk assessment."
        />
      ) : loading ? (
        <TraceSkeleton />
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
          <p className="text-sm font-semibold text-rose-500 mb-1">Trace failed</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </Card>
      ) : data ? (
        <TraceResult data={data} />
      ) : null}
    </div>
  );
}

function TraceResult({ data }: { data: TraceResponse }) {
  const tx = data.transaction;
  const risk = data.riskAssessment;
  const impact = data.walletImpact;

  const riskTierColor = (tier: string) =>
    tier === "critical" ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
    : tier === "high" ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
    : tier === "medium" ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";

  const sourceIcon = (source: string) => {
    if (source === "audit") return <Lock className="h-3 w-3" />;
    if (source === "notification") return <Bell className="h-3 w-3" />;
    if (source === "dispute") return <AlertTriangle className="h-3 w-3" />;
    if (source === "scheduled") return <Clock className="h-3 w-3" />;
    return <CircleDot className="h-3 w-3" />;
  };

  const sourceColor = (source: string) =>
    source === "audit" ? "bg-sky-500/15 text-sky-500"
    : source === "notification" ? "bg-violet-500/15 text-violet-500"
    : source === "dispute" ? "bg-rose-500/15 text-rose-500"
    : source === "scheduled" ? "bg-amber-500/15 text-amber-500"
    : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-5">
      {/* Transaction hero */}
      <Card className="p-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Transaction Trace
                </p>
              </div>
              <h2 className="text-xl font-bold font-mono">{tx.reference}</h2>
              <p className="text-sm text-muted-foreground mt-1">{tx.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline" className={cn("capitalize border", statusBadgeClass(tx.status))}>
                {tx.status}
              </Badge>
              <Badge variant="outline" className="capitalize">{tx.type} · {tx.direction}</Badge>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Amount" value={fmtAmt(tx.amount, tx.currency)} bold />
            <DetailItem label="Fee" value={tx.fee > 0 ? fmtAmt(tx.fee, tx.currency) : "Free"} />
            <DetailItem label="Counterparty" value={tx.counterpartyName || "—"} />
            <DetailItem label="Method" value={tx.method || "—"} />
            <DetailItem label="Provider" value={tx.provider || "—"} />
            <DetailItem label="Category" value={tx.category} />
            <DetailItem label="Initiated" value={fmtDateTime(tx.createdAt)} />
            <DetailItem label="Completed" value={tx.completedAt ? fmtDateTime(tx.completedAt) : "—"} />
            {tx.counterpartyAccount && (
              <DetailItem label="Counterparty Account" value={tx.counterpartyAccount} mono />
            )}
            {tx.counterpartyBank && (
              <DetailItem label="Counterparty Bank" value={tx.counterpartyBank} />
            )}
          </div>
        </div>
      </Card>

      {/* Risk + Wallet impact */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Risk Assessment</h3>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
              <p className="text-3xl font-bold tabular-nums">
                {risk.riskScore.toFixed(0)}<span className="text-base text-muted-foreground">/100</span>
              </p>
            </div>
            <Badge variant="outline" className={cn("capitalize border", riskTierColor(risk.tier))}>
              {risk.tier} risk
            </Badge>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className={cn(
                "h-full transition-all",
                risk.tier === "critical" ? "bg-rose-500"
                : risk.tier === "high" ? "bg-orange-500"
                : risk.tier === "medium" ? "bg-amber-500"
                : "bg-emerald-500",
              )}
              style={{ width: `${risk.riskScore}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            {risk.fraudFlag ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-500 font-medium">Flagged as fraud</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">No fraud flag</span>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">{risk.recommendation}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Wallet Impact ({impact.currency})</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">Before</p>
              <p className="text-sm font-semibold tabular-nums mt-1">{fmtAmt(impact.before, impact.currency)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">Delta</p>
              <p className={cn(
                "text-sm font-semibold tabular-nums mt-1",
                impact.delta >= 0 ? "text-emerald-500" : "text-rose-500",
              )}>
                {impact.delta >= 0 ? "+" : ""}{fmtAmt(impact.delta, impact.currency)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[11px] text-muted-foreground">After</p>
              <p className="text-sm font-semibold tabular-nums mt-1">{fmtAmt(impact.after, impact.currency)}</p>
            </div>
          </div>
          {impact.feeApplied > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Fee applied: <span className="font-medium">{fmtAmt(impact.feeApplied, impact.currency)}</span>
              {" · "}Direction: <span className="font-medium capitalize">{impact.direction}</span>
            </p>
          )}
          {impact.wallets.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-muted-foreground">Current wallets in {impact.currency}</p>
              {impact.wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{w.label} ({w.type})</span>
                  <span className="font-medium tabular-nums">{fmtAmt(w.currentBalance, impact.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Timeline */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold">Event Timeline</h3>
          <Badge variant="outline" className="ml-1">{data.timeline.length} events</Badge>
        </div>
        {data.timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events recorded.</p>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {data.timeline.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className={cn(
                    "absolute -left-6 top-1 h-3.5 w-3.5 rounded-full ring-2 ring-background flex items-center justify-center",
                    sourceColor(ev.source),
                  )}>
                    {sourceIcon(ev.source)}
                  </div>
                  <div className="ml-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium font-mono">{ev.action}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{ev.source}</Badge>
                      <Badge variant="outline" className={cn(
                        "text-[10px] capitalize",
                        ev.severity === "critical" ? "border-rose-500/30 text-rose-500"
                        : ev.severity === "warning" ? "border-amber-500/30 text-amber-500"
                        : ev.severity === "success" ? "border-emerald-500/30 text-emerald-500"
                        : "border-muted text-muted-foreground",
                      )}>
                        {ev.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{ev.actor}</span> · {fmtDateTime(ev.timestamp)}
                    </p>
                    {ev.details && typeof ev.details === "object" && (
                      <pre className="mt-1.5 text-[11px] bg-muted/40 rounded p-2 overflow-x-auto text-muted-foreground">
                        {JSON.stringify(ev.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Related records grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RelatedCard
          title="Audit Trail" icon={Lock} items={data.auditTrail.map((a) => ({
            id: a.id, primary: a.action, secondary: `${a.actor} · ${fmtDateTime(a.timestamp)}`,
            badge: a.severity, extra: a.ip,
          }))}
        />
        <RelatedCard
          title="Notifications" icon={Bell} items={data.notifications.map((n) => ({
            id: n.id, primary: n.title, secondary: n.message, badge: n.type,
            extra: `${n.channel}${n.isRead ? "" : " · unread"}`,
          }))}
        />
        <RelatedCard
          title="Disputes" icon={AlertTriangle} items={data.disputes.map((d) => ({
            id: d.id, primary: d.reason, secondary: d.description, badge: d.status,
            extra: `${d.priority} priority`,
          }))}
        />
        <RelatedCard
          title="Support Tickets" icon={Ticket} items={data.supportTickets.map((t) => ({
            id: t.id, primary: t.subject, secondary: `${t.category} · ${t.priority}`,
            badge: t.status, extra: fmtDate(t.createdAt),
          }))}
        />
      </div>

      {data.scheduledTransfer && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Linked Scheduled Transfer</h3>
            <Badge variant="outline" className="capitalize">{data.scheduledTransfer.status}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <DetailItem label="Frequency" value={data.scheduledTransfer.frequency} />
            <DetailItem label="Total Runs" value={String(data.scheduledTransfer.totalRuns)} />
            <DetailItem label="Next Run" value={fmtDateTime(data.scheduledTransfer.nextRunAt)} />
            <DetailItem label="Last Run" value={data.scheduledTransfer.lastRunAt ? fmtDateTime(data.scheduledTransfer.lastRunAt) : "—"} />
          </div>
        </Card>
      )}
    </div>
  );
}

function DetailItem({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn(
        "text-sm mt-0.5",
        mono && "font-mono",
        bold ? "font-bold" : "font-medium",
      )}>
        {value}
      </p>
    </div>
  );
}

function RelatedCard({
  title, icon: Icon, items,
}: {
  title: string;
  icon: any;
  items: { id: string; primary: string; secondary: string; badge: string; extra?: string | null }[];
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-emerald-500" />
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="outline" className="ml-auto">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">None</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="rounded-md bg-muted/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium font-mono truncate">{it.primary}</span>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{it.badge}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={it.secondary}>
                {it.secondary}
              </p>
              {it.extra && <p className="text-[10px] text-muted-foreground mt-1">{it.extra}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* =========================================================
 *  Tab 3: Reconciliation
 * ========================================================= */
function ReconciliationTab() {
  const [date, setDate] = useState<string>(today());
  const [reloadKey, setReloadKey] = useState(0);

  const qs = useMemo(() => `?date=${encodeURIComponent(date)}`, [date, reloadKey]);
  const { data, loading, error } = useFetch<ReconciliationResponse>(`/api/accounting/reconciliation${qs}`);

  const markReconciled = () => {
    toast.success("Marked as reconciled", {
      description: data ? `Cleared ${data.unreconciled.length} unreconciled entries for ${date}.` : "",
    });
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Reconciliation Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[180px]" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Refresh
          </Button>
          <div className="flex-1" />
          <Button size="sm" onClick={markReconciled} disabled={!data || data.unreconciled.length === 0}>
            <FileCheck2 className="h-4 w-4 mr-1.5" /> Mark as reconciled
          </Button>
        </div>
      </Card>

      {loading && !data ? (
        <ReconciliationSkeleton />
      ) : error ? (
        <Card className="p-8 text-center text-rose-500">
          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </Card>
      ) : data ? (
        <ReconciliationResult data={data} />
      ) : null}
    </div>
  );
}

function ReconciliationResult({ data }: { data: ReconciliationResponse }) {
  const t = data.totals;
  return (
    <div className="space-y-5">
      {/* Health banner */}
      <Card className={cn(
        "p-5 relative overflow-hidden",
        data.isBalanced ? "bg-emerald-500/5 ring-1 ring-emerald-500/20" : "bg-amber-500/5 ring-1 ring-amber-500/20",
      )}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {data.isBalanced ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-semibold">
                {data.isBalanced ? "Reconciliation balanced" : "Reconciliation pending"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.isBalanced
                  ? `All ${t.completedCount} completed transactions reconciled for ${fmtDate(data.range.from)}.`
                  : `${t.unreconciledCount} transaction(s) need attention · ${t.failedCount} failed`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Health Score</p>
            <p className={cn(
              "text-2xl font-bold tabular-nums",
              data.reconciliationHealth >= 95 ? "text-emerald-500"
              : data.reconciliationHealth >= 75 ? "text-amber-500"
              : "text-rose-500",
            )}>
              {data.reconciliationHealth}<span className="text-base text-muted-foreground">%</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Activity} label="Total Volume" color="emerald"
          value={fmtAmt(t.totalVolume, "NGN")}
          sub={`${t.transactionCount} txs · ${t.completedCount} completed`} />
        <SummaryCard icon={Receipt} label="Fees Collected" color="amber"
          value={fmtAmt(t.totalFees, "NGN")}
          sub="Platform revenue" />
        <SummaryCard icon={AlertTriangle} label="Failed" color="rose"
          value={fmtAmt(t.failedAmount, "NGN")}
          sub={`${t.failedCount} transactions`} />
        <SummaryCard icon={Scale} label="Net Settlement" color={t.netSettlement >= 0 ? "emerald" : "rose"}
          value={fmtAmt(t.netSettlement, "NGN")}
          sub={t.netSettlement >= 0 ? "Net owed to user" : "Net owed by user"} />
      </div>

      {/* Two-column: by currency + by status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-semibold">Volume by Currency</h4>
          </div>
          {Object.keys(data.volumeByCurrency).length === 0 ? (
            <p className="text-xs text-muted-foreground">No transactions</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.volumeByCurrency).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                <div key={c} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c}</span>
                  <span className="tabular-nums">{fmtAmt(v, c)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-semibold">Volume by Type</h4>
          </div>
          {Object.keys(data.volumeByType).length === 0 ? (
            <p className="text-xs text-muted-foreground">No transactions</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.volumeByType).sort((a, b) => b[1] - a[1]).map(([ty, n]) => (
                <div key={ty} className="flex items-center justify-between text-sm capitalize">
                  <span className="text-muted-foreground">{ty}</span>
                  <span className="tabular-nums font-medium">{n}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-semibold">Status Breakdown</h4>
          </div>
          {Object.keys(data.volumeByStatus).length === 0 ? (
            <p className="text-xs text-muted-foreground">No transactions</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.volumeByStatus).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
                <div key={s} className="flex items-center justify-between text-sm capitalize">
                  <span className="text-muted-foreground">{s}</span>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", statusBadgeClass(s))}>{n}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Wallet totals */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <h4 className="text-sm font-semibold">Wallet Balance Totals by Currency</h4>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              const rows: string[][] = [
                ["Currency", "Available Balance", "Ledger Balance", "Wallet Count"],
                ...data.walletTotalsByCurrency.map((w) => [
                  w.currency, String(w.balance), String(w.ledgerBalance), String(w.walletCount),
                ]),
              ];
              downloadCSV(`wallet-totals-${data.range.from.slice(0, 10)}.csv`, rows);
              toast.success("Wallet totals exported");
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Available Balance</TableHead>
                <TableHead className="text-right">Ledger Balance</TableHead>
                <TableHead className="text-right">Wallets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.walletTotalsByCurrency.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No wallets</TableCell>
                </TableRow>
              ) : data.walletTotalsByCurrency.map((w) => (
                <TableRow key={w.currency}>
                  <TableCell className="font-semibold">{w.currency}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtAmt(w.balance, w.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{fmtAmt(w.ledgerBalance, w.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.walletCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Unreconciled list */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-semibold">Unreconciled Transactions</h4>
            <Badge variant="outline" className="text-[10px]">{data.unreconciled.length}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Completed txs without an audit log
          </p>
        </div>
        {data.unreconciled.length === 0 ? (
          <div className="text-center py-6 text-emerald-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-medium">All transactions reconciled</p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {data.unreconciled.map((u) => (
              <div key={u.reference} className="flex items-center justify-between rounded-md bg-muted/40 p-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium">{u.reference}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{u.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{u.description}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(u.createdAt)}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums ml-2">
                  {fmtAmt(u.amount, u.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Disputes */}
      {data.disputes.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <h4 className="text-sm font-semibold">Disputes ({data.disputes.length})</h4>
          </div>
          <div className="space-y-2">
            {data.disputes.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md bg-muted/40 p-2.5">
                <div>
                  <span className="font-mono text-xs">{d.transactionRef || "—"}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{d.priority}</Badge>
                  <Badge variant="outline" className={cn("text-[10px] capitalize", statusBadgeClass(d.status))}>
                    {d.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* =========================================================
 *  Tab 4: Reports
 * ========================================================= */
function ReportsTab() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [reportType, setReportType] = useState<"revenue" | "volume" | "compliance">("revenue");

  // Compute date range from period
  const { from, to } = useMemo(() => {
    const t = new Date();
    const toIso = isoDate(t);
    let f = new Date();
    if (period === "daily") {
      // last 1 day
    } else if (period === "weekly") {
      f.setDate(f.getDate() - 7);
    } else {
      f.setMonth(f.getMonth() - 1);
    }
    return { from: period === "daily" ? toIso : isoDate(f), to: toIso };
  }, [period]);

  const url = `/api/accounting?from=${from}&to=${to}&limit=2000`;
  const { data, loading } = useFetch<LedgerResponse>(url);

  // Compute report-specific aggregations
  const report = useMemo<ReportData | null>(() => {
    if (!data) return null;
    const entries = data.entries;

    // Revenue report: fees by type
    if (reportType === "revenue") {
      const feesByType: Record<string, number> = {};
      const feesByCurrency: Record<string, number> = {};
      for (const e of entries) {
        if (!e.fee) continue;
        feesByType[e.type] = (feesByType[e.type] ?? 0) + e.fee;
        feesByCurrency[e.currency] = (feesByCurrency[e.currency] ?? 0) + e.fee;
      }
      const totalFees = Object.values(feesByCurrency).reduce((s, v) => s + v, 0);
      return { kind: "revenue", feesByType, feesByCurrency, totalFees, entries: entries.length };
    }

    // Volume report: by currency + by type
    if (reportType === "volume") {
      const volumeByCurrency: Record<string, number> = {};
      const volumeByType: Record<string, number> = {};
      const countByCurrency: Record<string, number> = {};
      const countByType: Record<string, number> = {};
      for (const e of entries) {
        volumeByCurrency[e.currency] = (volumeByCurrency[e.currency] ?? 0) + e.amount;
        volumeByType[e.type] = (volumeByType[e.type] ?? 0) + e.amount;
        countByCurrency[e.currency] = (countByCurrency[e.currency] ?? 0) + 1;
        countByType[e.type] = (countByType[e.type] ?? 0) + 1;
      }
      return {
        kind: "volume",
        volumeByCurrency, volumeByType, countByCurrency, countByType,
        entries: entries.length,
        total: Object.values(volumeByCurrency).reduce((s, v) => s + v, 0),
      };
    }

    // Compliance report: flagged + risk + KYC status (proxy via fraud flags)
    const flagged = entries.filter((e) => e.fraudFlag || e.riskScore >= 70);
    const highRisk = entries.filter((e) => e.riskScore >= 40 && e.riskScore < 70 && !e.fraudFlag);
    const completed = entries.filter((e) => e.status === "completed");
    const failed = entries.filter((e) => e.status === "failed");
    const reversed = entries.filter((e) => e.status === "reversed");
    const disputed = entries.filter((e) => e.auditTrail.some((a) => a.action.startsWith("dispute")));
    return {
      kind: "compliance",
      flagged, highRisk, completed, failed, reversed, disputed,
      entries: entries.length,
      avgRisk: entries.length ? entries.reduce((s, e) => s + e.riskScore, 0) / entries.length : 0,
    };
  }, [data, reportType]);

  const exportReport = () => {
    if (!report) return;
    let rows: string[][] = [];
    let filename = "";
    if (report.kind === "revenue") {
      rows = [
        ["Revenue Report", `${from} to ${to}`],
        [],
        ["Type", "Fee Amount (NGN equivalent)"],
        ...Object.entries(report.feesByType).map(([k, v]) => [k, String(v)]),
        [],
        ["Currency", "Fee Amount"],
        ...Object.entries(report.feesByCurrency).map(([k, v]) => [k, String(v)]),
        [],
        ["Total Fees", String(report.totalFees)],
        ["Transactions", String(report.entries)],
      ];
      filename = `revenue-report-${from}_to_${to}.csv`;
    } else if (report.kind === "volume") {
      rows = [
        ["Volume Report", `${from} to ${to}`],
        [],
        ["Currency", "Volume", "Tx Count"],
        ...Object.entries(report.volumeByCurrency).map(([k, v]) => [k, String(v), String(report.countByCurrency[k] ?? 0)]),
        [],
        ["Type", "Volume", "Tx Count"],
        ...Object.entries(report.volumeByType).map(([k, v]) => [k, String(v), String(report.countByType[k] ?? 0)]),
        [],
        ["Total Volume", String(report.total)],
        ["Transactions", String(report.entries)],
      ];
      filename = `volume-report-${from}_to_${to}.csv`;
    } else {
      rows = [
        ["Compliance Report", `${from} to ${to}`],
        [],
        ["Metric", "Value"],
        ["Total transactions", String(report.entries)],
        ["Completed", String(report.completed.length)],
        ["Failed", String(report.failed.length)],
        ["Reversed", String(report.reversed.length)],
        ["Flagged (fraud)", String(report.flagged.length)],
        ["High-risk (40-69)", String(report.highRisk.length)],
        ["Disputed", String(report.disputed.length)],
        ["Avg risk score", report.avgRisk.toFixed(2)],
        [],
        ["Flagged Transactions"],
        ["Reference", "Type", "Amount", "Currency", "Risk Score", "Status", "Description"],
        ...report.flagged.map((e) => [e.reference, e.type, String(e.amount), e.currency, String(e.riskScore), e.status, e.description]),
      ];
      filename = `compliance-report-${from}_to_${to}.csv`;
    }
    downloadCSV(filename, rows);
    toast.success(`${report.kind} report exported`);
  };

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Period</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">Last 7 days</SelectItem>
                <SelectItem value="monthly">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Report Type</label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue (fees)</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <div className="text-xs text-muted-foreground">
            {from} → {to}
          </div>
          <Button size="sm" onClick={exportReport} disabled={loading || !report}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </Card>

      {loading || !report ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : report.kind === "revenue" ? (
        <RevenueReport report={report} from={from} to={to} />
      ) : report.kind === "volume" ? (
        <VolumeReport report={report} from={from} to={to} />
      ) : (
        <ComplianceReport report={report} from={from} to={to} />
      )}
    </div>
  );
}

function RevenueReport({ report, from, to }: {
  report: Extract<ReportData, { kind: "revenue" }>;
  from: string; to: string;
}) {
  const maxFee = Math.max(...Object.values(report.feesByType), 1);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard icon={Receipt} label="Total Fees" color="emerald"
          value={fmtAmt(report.totalFees, "NGN")}
          sub={`${report.entries} transactions`} />
        <SummaryCard icon={Coins} label="Currencies" color="teal"
          value={String(Object.keys(report.feesByCurrency).length)}
          sub="With collected fees" />
        <SummaryCard icon={BarChart3} label="Avg Fee / Tx" color="amber"
          value={fmtAmt(report.entries ? report.totalFees / report.entries : 0, "NGN")}
          sub="Across all transactions" />
      </div>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Fees by Transaction Type</h4>
        {Object.keys(report.feesByType).length === 0 ? (
          <p className="text-xs text-muted-foreground">No fees collected in this period.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(report.feesByType).sort((a, b) => b[1] - a[1]).map(([type, fee]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{type}</span>
                  <span className="tabular-nums">{fmtAmt(fee, "NGN")}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(fee / maxFee) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Fees by Currency</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(report.feesByCurrency).map(([c, v]) => (
            <div key={c} className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">{c}</p>
              <p className="text-lg font-bold tabular-nums">{fmtAmt(v, c)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function VolumeReport({ report }: {
  report: Extract<ReportData, { kind: "volume" }>;
  from: string; to: string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard icon={Activity} label="Total Volume" color="emerald"
          value={fmtAmt(report.total, "NGN")}
          sub={`${report.entries} transactions`} />
        <SummaryCard icon={Coins} label="Currencies" color="teal"
          value={String(Object.keys(report.volumeByCurrency).length)}
          sub="Trading volume" />
        <SummaryCard icon={BarChart3} label="Tx Types" color="sky"
          value={String(Object.keys(report.volumeByType).length)}
          sub="Distinct types" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3">Volume by Currency</h4>
          <div className="space-y-2">
            {Object.entries(report.volumeByCurrency).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
              <div key={c} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{report.countByCurrency[c] ?? 0} txs</span>
                  <span className="tabular-nums">{fmtAmt(v, c)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3">Volume by Type</h4>
          <div className="space-y-2">
            {Object.entries(report.volumeByType).sort((a, b) => b[1] - a[1]).map(([ty, v]) => (
              <div key={ty} className="flex items-center justify-between text-sm capitalize">
                <span className="text-muted-foreground">{ty}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{report.countByType[ty] ?? 0} txs</span>
                  <span className="tabular-nums font-medium">{fmtAmt(v, "NGN")}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ComplianceReport({ report }: {
  report: Extract<ReportData, { kind: "compliance" }>;
  from: string; to: string;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={ShieldAlert} label="Flagged (Fraud)" color="rose"
          value={String(report.flagged.length)}
          sub="Requires review" />
        <SummaryCard icon={AlertCircle} label="High Risk" color="amber"
          value={String(report.highRisk.length)}
          sub="Risk score 40-69" />
        <SummaryCard icon={Activity} label="Failed" color="rose"
          value={String(report.failed.length)}
          sub="Out of total volume" />
        <SummaryCard icon={Scale} label="Avg Risk Score" color="teal"
          value={report.avgRisk.toFixed(1)}
          sub={`${report.completed.length} completed`} />
      </div>

      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Flagged Transactions</h4>
        {report.flagged.length === 0 ? (
          <div className="text-center py-6 text-emerald-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-medium">No flagged transactions</p>
            <p className="text-xs text-muted-foreground mt-1">All transactions within normal risk parameters.</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {report.flagged.map((e) => (
              <div key={e.reference} className="rounded-md bg-rose-500/5 ring-1 ring-rose-500/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <span className="font-mono text-sm font-medium">{e.reference}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{e.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-500">
                      Risk: {e.riskScore.toFixed(0)}/100
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px] capitalize", statusBadgeClass(e.status))}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                <p className="text-xs font-semibold tabular-nums mt-1">{fmtAmt(e.amount, e.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* =========================================================
 *  Shared types
 * ========================================================= */
type ReportData =
  | { kind: "revenue"; feesByType: Record<string, number>; feesByCurrency: Record<string, number>; totalFees: number; entries: number }
  | { kind: "volume"; volumeByCurrency: Record<string, number>; volumeByType: Record<string, number>; countByCurrency: Record<string, number>; countByType: Record<string, number>; entries: number; total: number }
  | { kind: "compliance"; flagged: LedgerEntry[]; highRisk: LedgerEntry[]; completed: LedgerEntry[]; failed: LedgerEntry[]; reversed: LedgerEntry[]; disputed: LedgerEntry[]; entries: number; avgRisk: number };

/* =========================================================
 *  Skeletons + empty state
 * ========================================================= */
function EmptyState({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <Card className="p-10 text-center">
      <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
      <p className="text-sm font-semibold mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{sub}</p>
    </Card>
  );
}

function TraceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

function ReconciliationSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
