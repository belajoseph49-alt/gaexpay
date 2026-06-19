"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, Download, ArrowDownRight, ArrowUpRight, ArrowLeftRight,
  Receipt, Smartphone, QrCode, CreditCard, Gift, Zap, TrendingUp,
  CheckCircle2, XCircle, Clock, Flag, Repeat,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDateTime, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = {
  transfer: ArrowLeftRight, deposit: ArrowDownRight, withdrawal: ArrowUpRight,
  payment: QrCode, bill: Receipt, airtime: Smartphone, exchange: TrendingUp,
  card: CreditCard, referral: Gift,
};

const STATUS_STYLES: Record<string, any> = {
  completed: { icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
  failed: { icon: XCircle, color: "text-rose-600 bg-rose-500/10" },
  pending: { icon: Clock, color: "text-amber-600 bg-amber-500/10" },
  flagged: { icon: Flag, color: "text-orange-600 bg-orange-500/10" },
  reversed: { icon: XCircle, color: "text-slate-600 bg-slate-500/10" },
};

export function TransactionsView() {
  const { data } = useFetch<{ transactions: any[] }>("/api/transactions?limit=200");
  const { setView } = useApp();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const txs = data?.transactions ?? [];

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (status !== "all" && t.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.description?.toLowerCase().includes(q) ||
          t.counterpartyName?.toLowerCase().includes(q) ||
          t.reference?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [txs, search, type, status]);

  // group by date
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const t of filtered) {
      const d = new Date(t.createdAt);
      const key = d.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
      g[key] = g[key] || [];
      g[key].push(t);
    }
    return g;
  }, [filtered]);

  const totalIn = filtered.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} transactions found</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total In</p>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatMoney(totalIn, "NGN")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Out</p>
          <p className="text-lg font-bold text-rose-600 tabular-nums">{formatMoney(totalOut, "NGN")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Net Flow</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(totalIn - totalOut, "NGN")}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fees Paid</p>
          <p className="text-lg font-bold tabular-nums">{formatMoney(filtered.reduce((s, t) => s + t.fee, 0), "NGN")}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, description, reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="bill">Bill</SelectItem>
              <SelectItem value="airtime">Airtime</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* List */}
      <Card className="p-2">
        {filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No transactions match your filters</p>
          </div>
        ) : (
          <div className="space-y-4 p-2">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{date}</p>
                <div className="space-y-0.5">
                  {items.map((t) => {
                    const Icon = TYPE_ICONS[t.type] || ArrowLeftRight;
                    const isCredit = t.direction === "credit";
                    const S = STATUS_STYLES[t.status] || STATUS_STYLES.completed;
                    const StatusIcon = S.icon;
                    return (
                      <motion.button
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setSelected(t)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-muted/50"
                      >
                        <div className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                          isCredit ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500",
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.counterpartyName || t.description}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t.type} · {formatDateTime(t.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", S.color)}>
                            <StatusIcon className="h-3 w-3" /> {t.status}
                          </span>
                          <p className={cn("text-sm font-semibold tabular-nums w-28 text-right", isCredit ? "text-emerald-600" : "")}>
                            {isCredit ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div className={cn(
                  "grid h-14 w-14 place-items-center rounded-full mb-2",
                  selected.direction === "credit" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500",
                )}>
                  {selected.direction === "credit" ? <ArrowDownRight className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {selected.direction === "credit" ? "+" : "-"}{formatMoney(selected.amount, selected.currency)}
                </p>
                <Badge className={cn("mt-2", STATUS_STYLES[selected.status]?.color)} variant="outline">
                  {selected.status}
                </Badge>
              </div>
              <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
                <DetailRow label="Reference" value={selected.reference} mono />
                <DetailRow label="Type" value={selected.type} />
                <DetailRow label="Category" value={selected.category} />
                <DetailRow label="Description" value={selected.description} />
                <DetailRow label="Counterparty" value={selected.counterpartyName || "—"} />
                {selected.counterpartyAccount && <DetailRow label="Account" value={selected.counterpartyAccount} />}
                {selected.counterpartyBank && <DetailRow label="Bank/Provider" value={selected.counterpartyBank} />}
                <DetailRow label="Method" value={selected.method} />
                {selected.provider && <DetailRow label="Provider" value={selected.provider} />}
                <DetailRow label="Fee" value={formatMoney(selected.fee, selected.currency)} />
                <DetailRow label="Date" value={formatDateTime(selected.createdAt)} />
                {selected.completedAt && <DetailRow label="Completed" value={formatDateTime(selected.completedAt)} />}
                {selected.riskScore > 0.5 && <DetailRow label="Risk Score" value={`${(selected.riskScore * 100).toFixed(0)}%`} />}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" type="button"><Download className="h-4 w-4 mr-1.5" /> Receipt</Button>
                {selected.direction === "debit" && selected.status === "completed" && (
                  <Button variant="outline" className="flex-1" type="button" onClick={() => {
                    setSelected(null);
                    setView("send");
                  }}>
                    <Repeat className="h-4 w-4 mr-1.5" /> Send Again
                  </Button>
                )}
                <Button variant="outline" className="flex-1" type="button">Report Issue</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-sm font-medium text-right break-all", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
