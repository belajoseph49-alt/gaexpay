"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, Search, Eye, Download, Flag, ArrowLeftRight,
} from "lucide-react";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, apiAction, showError } from "./shared";
import { toast } from "sonner";

export function TransactionsSection() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [detail, setDetail] = useState<any | null>(null);
  const [reverseTarget, setReverseTarget] = useState<any | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (type !== "all") p.set("type", type);
    if (status !== "all") p.set("status", status);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("limit", "300");
    return `/api/admin/transactions?${p.toString()}&k=${reloadKey}`;
  }, [search, type, status, from, to, reloadKey]);

  const { data, loading } = useFetch<{ transactions: any[] }>(url);
  const disputes = useFetch<any>("/api/admin/disputes?status=open");
  const txs = data?.transactions ?? [];

  function exportCSV() {
    const headers = ["Reference", "User", "Type", "Direction", "Amount", "Fee", "Currency", "Status", "Date", "Description"];
    const rows = txs.map((t) => [
      t.reference, `${t.user?.firstName ?? ""} ${t.user?.lastName ?? ""}`, t.type, t.direction,
      t.amount, t.fee, t.currency, t.status, new Date(t.createdAt).toLocaleString(), t.description,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `gaexpay-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(u);
    toast.success(`Exported ${txs.length} transactions`);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Transaction Management"
        description={`${txs.length} transactions · search, filter, reverse & flag`}
        icon={DollarSign}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Reference, description, counterparty…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="bill">Bill</SelectItem>
              <SelectItem value="airtime">Airtime</SelectItem>
              <SelectItem value="exchange">Exchange</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="fee">Fee</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.length === 0 && (
                  <TableRow><TableCell colSpan={8}><EmptyState message="No transactions found" icon={DollarSign} /></TableCell></TableRow>
                )}
                {txs.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                    <TableCell className="text-xs">{t.user?.firstName} {t.user?.lastName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{t.type}</Badge></TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-sm">
                      <span className={t.direction === "credit" ? "text-violet-600" : ""}>
                        {t.direction === "credit" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatMoney(t.fee, t.currency)}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetail(t)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        {t.status === "completed" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600" onClick={() => { setReverseTarget(t); setReverseReason(""); }} title="Reverse"><ArrowLeftRight className="h-3.5 w-3.5" /></Button>
                        )}
                        {!t.fraudFlag && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/transactions?action=flag`, "PATCH", { transactionId: t.id, reason: "Flagged by admin" }, "Transaction flagged");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Flag as fraud"><Flag className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Disputes sub-section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Flag className="h-4 w-4 text-amber-600" />
          Open Disputes ({disputes.data?.disputes?.length ?? 0})
        </h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {(disputes.data?.disputes ?? []).length === 0 && <EmptyState message="No open disputes" icon={Flag} />}
          {(disputes.data?.disputes ?? []).map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.reason?.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {d.user?.firstName} {d.user?.lastName} · {d.transactionRef} · {d.transaction ? formatMoney(d.transaction.amount, d.transaction.currency) : "—"}
                </p>
              </div>
              <StatusBadge status={d.status} />
              <span className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Transaction detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Transaction Details</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <Row label="Reference" value={<span className="font-mono">{detail.reference}</span>} />
              <Row label="User" value={`${detail.user?.firstName} ${detail.user?.lastName} (${detail.user?.email})`} />
              <Row label="Type" value={<Badge variant="outline" className="text-[10px] capitalize">{detail.type}</Badge>} />
              <Row label="Direction" value={<span className="capitalize">{detail.direction}</span>} />
              <Row label="Amount" value={<span className="font-semibold tabular-nums">{formatMoney(detail.amount, detail.currency)}</span>} />
              <Row label="Fee" value={formatMoney(detail.fee, detail.currency)} />
              <Row label="Status" value={<StatusBadge status={detail.status} />} />
              <Row label="Method" value={detail.method || "—"} />
              <Row label="Provider" value={detail.provider || "—"} />
              <Row label="Counterparty" value={detail.counterpartyName || "—"} />
              <Row label="Description" value={detail.description || "—"} />
              <Row label="Risk Score" value={`${Math.round((detail.riskScore || 0) * 100)}%`} />
              <Row label="Created" value={new Date(detail.createdAt).toLocaleString()} />
              {detail.completedAt && <Row label="Completed" value={new Date(detail.completedAt).toLocaleString()} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reverse confirm */}
      <Dialog open={!!reverseTarget} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Transaction</DialogTitle>
            <DialogDescription>This will refund the user&apos;s wallet and mark the transaction as reversed.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for reversal</Label>
            <Textarea value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} rows={3} placeholder="E.g., Customer dispute, duplicate transaction…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              const r = await apiAction(`/api/admin/transactions?action=reverse`, "PATCH", { transactionId: reverseTarget.id, reason: reverseReason }, "Transaction reversed");
              if (!r.ok) showError(r.error || "Failed"); else { setReloadKey((k) => k + 1); setReverseTarget(null); }
            }}>Reverse transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-right break-all">{value}</span>
    </div>
  );
}
