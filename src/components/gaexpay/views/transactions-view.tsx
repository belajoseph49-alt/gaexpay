"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, Download, ArrowDownRight, ArrowUpRight, ArrowLeftRight,
  Receipt, Smartphone, QrCode, CreditCard, Gift, TrendingUp,
  CheckCircle2, XCircle, Clock, Flag, Repeat, AlertTriangle, FileText, X, Calendar, Check,
  ArrowRight, Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDateTime, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

const TYPE_ICONS: Record<string, any> = {
  transfer: ArrowLeftRight, deposit: ArrowDownRight, withdrawal: ArrowUpRight,
  payment: QrCode, bill: Receipt, airtime: Smartphone, exchange: TrendingUp,
  card: CreditCard, referral: Gift,
};

const STATUS_STYLES: Record<string, any> = {
  completed: { icon: CheckCircle2, pill: "pill-success", color: "text-emerald-600 bg-emerald-500/10" },
  failed: { icon: XCircle, pill: "pill-danger", color: "text-rose-600 bg-rose-500/10" },
  pending: { icon: Clock, pill: "pill-warning", color: "text-amber-600 bg-amber-500/10" },
  flagged: { icon: Flag, pill: "pill-warning", color: "text-orange-600 bg-orange-500/10" },
  reversed: { icon: XCircle, pill: "pill-info", color: "text-slate-600 bg-slate-500/10" },
};

const QUICK_FILTERS = [
  { id: "all", label: "All" },
  { id: "sent", label: "Sent" },
  { id: "received", label: "Received" },
  { id: "bills", label: "Bills" },
  { id: "cards", label: "Cards" },
];

function dateGroupLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  if (target >= weekAgo) return "This week";
  return "Earlier";
}

export function TransactionsView() {
  const { t } = useTranslation();
  const { data, reload } = useFetch<{ transactions: any[] }>("/api/transactions?limit=200");
  const { data: disputesData, reload: reloadDisputes } = useFetch<{ disputes: any[]; open: number }>("/api/disputes");
  const { data: tagsData } = useFetch<{ tags: any[] }>("/api/transactions/tag");
  const { setView } = useApp();
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [direction, setDirection] = useState<"all" | "credit" | "debit">("all");
  const [selected, setSelected] = useState<any>(null);
  const [disputeTx, setDisputeTx] = useState<any>(null);
  const [showDisputes, setShowDisputes] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [txTags, setTxTags] = useState<string[]>([]);

  const tags = tagsData?.tags ?? [];

  useEffect(() => {
    if (selected?.metadata) {
      try {
        const meta = JSON.parse(selected.metadata);
        setTxTags(meta.tags || []);
      } catch {
        setTxTags([]);
      }
    } else {
      setTxTags([]);
    }
  }, [selected]);

  const toggleTag = async (tagId: string) => {
    if (!selected) return;
    const newTags = txTags.includes(tagId)
      ? txTags.filter((t) => t !== tagId)
      : [...txTags, tagId];
    setTxTags(newTags);
    await fetch("/api/transactions/tag", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: selected.id, tags: newTags }),
    });
    toast.success(newTags.includes(tagId) ? "Tag added" : "Tag removed");
    reload();
  };

  const setQuickFilter = (id: string) => {
    setType("all");
    setDirection("all");
    if (id === "sent") setDirection("debit");
    else if (id === "received") setDirection("credit");
    else if (id === "bills") setType("bill");
    else if (id === "cards") setType("card");
  };

  const isQuickActive = (id: string) => {
    if (id === "all") return type === "all" && direction === "all";
    if (id === "sent") return direction === "debit";
    if (id === "received") return direction === "credit";
    if (id === "bills") return type === "bill";
    if (id === "cards") return type === "card";
    return false;
  };

  const txs = data?.transactions ?? [];
  const loading = !data;

  const filtered = useMemo(() => {
    return txs.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (direction !== "all" && t.direction !== direction) return false;
      if (status !== "all" && t.status !== status) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(t.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(t.createdAt) > to) return false;
      }
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
  }, [txs, search, type, status, direction, dateFrom, dateTo]);

  // group by date label (Today / Yesterday / This week / Earlier)
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    const order = ["Today", "Yesterday", "This week", "Earlier"];
    for (const k of order) g[k] = [];
    for (const t of filtered) {
      const label = dateGroupLabel(new Date(t.createdAt));
      g[label] = g[label] || [];
      g[label].push(t);
    }
    // remove empty groups, preserve order
    return order.filter((k) => g[k].length > 0).map((k) => [k, g[k]] as [string, any[]]);
  }, [filtered]);

  const totalIn = filtered.filter((t) => t.direction === "credit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.direction === "debit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("transactions.title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? "Loading your activity…" : `${filtered.length} transactions found`}
          </p>
        </div>
        <div className="flex gap-2">
          {!!disputesData?.open && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              onClick={() => setShowDisputes(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-1.5" /> {disputesData.open} Disputes
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => window.open("/api/export?format=csv&days=90", "_blank")}
          >
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="p-4 sm:p-5 card-lift border-border/60 shadow-premium-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <ArrowDownRight className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total In</p>
                <p className="text-lg font-bold tabular-nums truncate">{fmt(totalIn)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 shrink-0 text-[9px]">credit</Badge>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 card-lift border-border/60 shadow-premium-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-500">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Total Out</p>
                <p className="text-lg font-bold tabular-nums truncate">{fmt(totalOut)}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-rose-600 border-rose-500/30 shrink-0 text-[9px]">debit</Badge>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 card-lift border-border/60 shadow-premium-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  net >= 0 ? "bg-primary/10 text-primary" : "bg-rose-500/15 text-rose-500",
                )}
              >
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Net Flow</p>
                <p
                  className={cn(
                    "text-lg font-bold tabular-nums truncate",
                    net >= 0 ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-muted-foreground shrink-0 text-[9px]">net</Badge>
          </div>
        </Card>
      </div>

      {/* Quick filter pills + Search */}
      <Card className="p-3 sm:p-4 border-border/60 shadow-premium-sm">
        {/* Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_FILTERS.map((q) => {
            const active = isQuickActive(q.id);
            return (
              <button
                key={q.id}
                onClick={() => setQuickFilter(q.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>

        {/* Search + advanced filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, description, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <Select value={type} onValueChange={(v) => { setType(v); setDirection("all"); }}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="h-10 w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showDateFilter || dateFrom || dateTo ? "default" : "outline"}
            size="sm"
            className="h-10 rounded-xl"
            onClick={() => setShowDateFilter(!showDateFilter)}
          >
            <Calendar className="h-4 w-4 mr-1.5" /> Date
            {(dateFrom || dateTo) && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-white" />}
          </Button>
          {(dateFrom || dateTo || type !== "all" || status !== "all" || direction !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 rounded-xl text-xs"
              onClick={() => {
                setDateFrom(""); setDateTo(""); setType("all"); setStatus("all");
                setDirection("all"); setSearch("");
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
        {showDateFilter && (
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border/60 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto h-9 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto h-9 rounded-xl" />
            </div>
            <div className="flex gap-1">
              {[
                { label: "Today", days: 0 },
                { label: "7d", days: 7 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
              ].map((r) => (
                <button
                  key={r.label}
                  onClick={() => {
                    const to = new Date();
                    const from = new Date();
                    from.setDate(from.getDate() - r.days);
                    if (r.days === 0) {
                      setDateFrom(to.toISOString().slice(0, 10));
                      setDateTo(to.toISOString().slice(0, 10));
                    } else {
                      setDateFrom(from.toISOString().slice(0, 10));
                      setDateTo(to.toISOString().slice(0, 10));
                    }
                  }}
                  className="rounded-lg border border-border/60 px-2 py-1 text-xs hover:bg-muted transition"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Transaction list */}
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="text-right space-y-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3 w-14 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 sm:p-16 border-border/60 shadow-premium-sm">
            <div className="grid place-items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-4">
                <Inbox className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold">No transactions yet</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                {search || type !== "all" || status !== "all" || direction !== "all" || dateFrom || dateTo
                  ? "No transactions match your current filters. Try adjusting or clearing them."
                  : "Send your first payment or top up your wallet to get started."}
              </p>
              <Button className="mt-5 h-10 rounded-xl shadow-premium-sm" onClick={() => setView("send")}>
                <ArrowRight className="h-4 w-4 mr-1.5" /> Send Money
              </Button>
            </div>
          </Card>
        ) : (
          grouped.map(([label, items]) => (
            <div key={label}>
              {/* Sticky date header */}
              <div className="sticky top-0 z-10 -mx-1 mb-2 px-1">
                <div className="inline-block rounded-full bg-background/80 px-3 py-1 backdrop-blur">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label} · {items.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {items.map((t) => {
                  const Icon = TYPE_ICONS[t.type] || ArrowLeftRight;
                  const isCredit = t.direction === "credit";
                  const S = STATUS_STYLES[t.status] || STATUS_STYLES.completed;
                  const StatusIcon = S.icon;
                  return (
                    <motion.button
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => setSelected(t)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card p-3 text-left shadow-premium-xs transition hover:border-primary/40 hover:bg-muted/30 hover:shadow-premium-sm"
                    >
                      <div
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-full transition",
                          isCredit
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-rose-500/15 text-rose-500",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.counterpartyName || t.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="capitalize">{t.type}</span> · {timeAgo(t.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            isCredit ? "text-emerald-600" : "text-foreground",
                          )}
                        >
                          {isCredit ? "+" : "−"}{formatMoney(t.amount, t.currency)}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            S.pill,
                          )}
                        >
                          <StatusIcon className="h-3 w-3" /> {t.status}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div
                  className={cn(
                    "grid h-16 w-16 place-items-center rounded-full mb-3",
                    selected.direction === "credit"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-rose-500/15 text-rose-500",
                  )}
                >
                  {selected.direction === "credit"
                    ? <ArrowDownRight className="h-7 w-7" />
                    : <ArrowUpRight className="h-7 w-7" />}
                </div>
                <p className="text-2xl font-bold tabular-nums">
                  {selected.direction === "credit" ? "+" : "−"}{formatMoney(selected.amount, selected.currency)}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_STYLES[selected.status]?.pill || "pill-info",
                  )}
                >
                  {selected.status}
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
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

              {/* Tags */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const active = txTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <span>{tag.icon}</span>
                        {tag.label}
                        {active && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" type="button">
                  <Download className="h-4 w-4 mr-1.5" /> Receipt
                </Button>
                {selected.direction === "debit" && selected.status === "completed" && (
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    type="button"
                    onClick={() => { setSelected(null); setView("send"); }}
                  >
                    <Repeat className="h-4 w-4 mr-1.5" /> Send Again
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-amber-600 hover:bg-amber-500/10"
                  type="button"
                  onClick={() => {
                    const tx = selected;
                    setSelected(null);
                    setTimeout(() => setDisputeTx(tx), 100);
                  }}
                >
                  <AlertTriangle className="h-4 w-4 mr-1.5" /> Dispute
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispute filing dialog */}
      <DisputeDialog
        tx={disputeTx}
        onClose={() => setDisputeTx(null)}
        onSubmitted={() => { setDisputeTx(null); reloadDisputes(); reload(); }}
      />

      {/* Disputes list dialog */}
      <Dialog open={showDisputes} onOpenChange={setShowDisputes}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>My Disputes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {disputesData?.disputes?.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">No disputes filed</div>
            )}
            {disputesData?.disputes?.map((d) => (
              <div key={d.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{d.transactionRef}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      d.status === "open" ? "pill-warning" :
                      d.status === "resolved" || d.status === "refunded" ? "pill-success" :
                      d.status === "rejected" ? "pill-danger" : "pill-info",
                    )}
                  >
                    {d.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-medium capitalize">{d.reason.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{d.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Filed {timeAgo(d.createdAt)}</p>
              </div>
            ))}
          </div>
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

const DISPUTE_REASONS = [
  { id: "unauthorized", label: "Unauthorized transaction", desc: "I didn't authorize this payment" },
  { id: "failed_not_received", label: "Payment not received", desc: "Recipient didn't get the funds" },
  { id: "wrong_amount", label: "Wrong amount", desc: "The amount charged is incorrect" },
  { id: "duplicate", label: "Duplicate charge", desc: "I was charged more than once" },
  { id: "merchant_issue", label: "Merchant issue", desc: "Goods/services not delivered" },
  { id: "other", label: "Other", desc: "Something else" },
];

function DisputeDialog({ tx, onClose, onSubmitted }: { tx: any; onClose: () => void; onSubmitted: () => void }) {
  const [reason, setReason] = useState("unauthorized");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);

  if (!tx) return null;

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: tx.id,
          transactionRef: tx.reference,
          reason,
          description,
          priority,
        }),
      });
      if (res.ok) {
        toast.success("Dispute filed successfully. We'll review it within 48 hours.");
        onSubmitted();
      } else {
        toast.error("Failed to file dispute");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!tx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> File a Dispute
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Transaction</span>
              <span className="font-mono text-xs">{tx.reference}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Amount</span>
              <span className="font-semibold">{formatMoney(tx.amount, tx.currency)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="text-xs">{formatDateTime(tx.createdAt)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {DISPUTE_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-xl border p-2.5 text-left transition",
                    reason === r.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted",
                  )}
                >
                  <div className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2", reason === r.id ? "border-primary" : "border-muted-foreground/30")}>
                    {reason === r.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Describe the issue</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about what happened..."
              rows={3}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            <FileText className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Our team will review your dispute within 48 hours. You'll receive updates via email and in-app notifications. Filing a dispute doesn't guarantee a refund.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={!description.trim() || loading}
            className="rounded-xl bg-amber-600 hover:bg-amber-700"
          >
            {loading ? "Filing..." : "File Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
