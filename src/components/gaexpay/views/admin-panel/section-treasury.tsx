"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Landmark, Wallet, ArrowLeftRight, Download, ShieldCheck, TrendingUp, Coins, Plus,
} from "lucide-react";
import { formatMoney, formatCompact } from "@/lib/gaexpay";
import { SectionHeader, LoadingGrid, LoadingTable, EmptyState, StatusBadge, apiAction, showError } from "./shared";

const WALLET_TYPES = [
  { value: "operating", label: "Operating", color: "bg-sky-500/15 text-sky-600" },
  { value: "reserve", label: "Reserve", color: "bg-violet-500/15 text-violet-600" },
  { value: "liquidity", label: "Liquidity Pool", color: "bg-purple-500/15 text-purple-600" },
];

export function TreasurySection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/treasury");
  const [transferOpen, setTransferOpen] = useState(false);
  const [rebalanceTarget, setRebalanceTarget] = useState<any | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Treasury" description="Platform liquidity & reserves" icon={Landmark} />
        <LoadingGrid count={4} className="grid-cols-2 lg:grid-cols-4" />
        <LoadingTable rows={4} />
      </div>
    );
  }

  const wallets = data.wallets ?? [];
  const trend = data.trend ?? [];

  function exportReconciliation() {
    const headers = ["Wallet ID", "Currency", "Balance", "Provider", "Type"];
    const rows = wallets.map((w: any) => [w.id, w.currency, w.balance, w.provider, w.type]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `treasury-reconciliation-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(u);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Treasury"
        description="Platform liquidity, reserves & reconciliation"
        icon={Landmark}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportReconciliation}>
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Transfer
            </Button>
          </div>
        }
      />

      {/* Reserve overview cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <ReserveCard
          icon={Wallet}
          label="NGN Reserve"
          value={formatCompact(data.reserves?.ngn ?? 0, "NGN")}
          color="bg-violet-500/15 text-violet-600"
        />
        <ReserveCard
          icon={Wallet}
          label="USD Reserve"
          value={formatCompact(data.reserves?.usd ?? 0, "USD")}
          color="bg-sky-500/15 text-sky-600"
        />
        <ReserveCard
          icon={Coins}
          label="Crypto Reserve"
          value={`${(data.reserves?.crypto ?? 0).toFixed(2)} units`}
          color="bg-amber-500/15 text-amber-600"
        />
        <ReserveCard
          icon={TrendingUp}
          label="Liquidity Ratio"
          value={`${data.liquidityRatio ?? 0}%`}
          color="bg-violet-500/15 text-violet-600"
        />
      </div>

      {/* Wallets table */}
      <Card className="p-0">
        <div className="border-b p-4">
          <h3 className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /> Treasury Wallets ({wallets.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallets.length === 0 && (
                <TableRow><TableCell colSpan={5}><EmptyState message="No treasury wallets" icon={Landmark} /></TableCell></TableRow>
              )}
              {wallets.map((w: any) => {
                const typeMeta = WALLET_TYPES.find((t) => t.value === w.type) ?? WALLET_TYPES[0];
                return (
                  <TableRow key={w.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-mono font-semibold">{w.currency}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(w.balance, w.currency)}
                    </TableCell>
                    <TableCell className="text-sm">{w.provider}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${typeMeta.color}`}>{typeMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRebalanceTarget(w)}>
                        Rebalance
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Liquidity chart + reconciliation */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold mb-1">30-Day Liquidity Trend</h3>
          <p className="text-xs text-muted-foreground mb-3">Reserve balances over time</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="gradNg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradUs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(Number(v), "")} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="ngn" stroke="#10b981" strokeWidth={2} fill="url(#gradNg)" name="NGN" />
              <Area type="monotone" dataKey="usd" stroke="#06b6d4" strokeWidth={2} fill="url(#gradUs)" name="USD" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-600" /> Reconciliation</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={data.reconciliation?.status ?? "balanced"} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last Reconciled</span><span className="text-xs">{data.reconciliation?.lastReconciledAt ? new Date(data.reconciliation.lastReconciledAt).toLocaleString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Wallets Checked</span><span className="font-medium">{data.reconciliation?.checkedWallets ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Matched</span><span className="font-medium text-violet-600">{data.reconciliation?.matchedWallets ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Drift Amount</span><span className="font-medium">{formatMoney(data.reconciliation?.driftAmount ?? 0, "NGN")}</span></div>
            <div className="pt-2 border-t">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Total" value={data.counts?.total ?? 0} />
                <Mini label="Operating" value={data.counts?.operating ?? 0} />
                <Mini label="Reserve" value={data.counts?.reserve ?? 0} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <TransferDialog open={transferOpen} wallets={wallets} onClose={() => setTransferOpen(false)} onSaved={() => { setTransferOpen(false); reload(); }} />
      <RebalanceDialog wallet={rebalanceTarget} onClose={() => setRebalanceTarget(null)} onSaved={() => { setRebalanceTarget(null); reload(); }} />
    </div>
  );
}

function ReserveCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
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

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function TransferDialog({ open, wallets, onClose, onSaved }: { open: boolean; wallets: any[]; onClose: () => void; onSaved: () => void }) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState(0);

  const from = wallets.find((w) => w.id === fromId);
  const to = wallets.find((w) => w.id === toId);
  const sameCurrency = from && to && from.currency === to.currency;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Between Wallets</DialogTitle>
          <DialogDescription>Move funds between treasury wallets (same currency only)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>From Wallet</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.currency} · {w.provider} ({formatMoney(w.balance, w.currency)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To Wallet</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Select destination wallet" /></SelectTrigger>
              <SelectContent>
                {wallets.filter((w) => w.id !== fromId).map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.currency} · {w.provider} ({formatMoney(w.balance, w.currency)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {from && to && !sameCurrency && (
            <p className="text-xs text-rose-600">Cannot transfer between different currencies ({from.currency} → {to.currency})</p>
          )}
          <div>
            <Label>Amount {from && `(${from.currency})`}</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            if (!fromId || !toId || amount <= 0) { showError("Fill all fields with a positive amount"); return; }
            const r = await apiAction(`/api/admin/treasury`, "PATCH", { action: "transfer", fromId, toId, amount }, "Transfer completed");
            if (!r.ok) showError(r.error || "Failed"); else { setAmount(0); setFromId(""); setToId(""); onSaved(); }
          }}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RebalanceDialog({ wallet, onClose, onSaved }: { wallet: any; onClose: () => void; onSaved: () => void }) {
  const [newBalance, setNewBalance] = useState<number>(0);
  if (!wallet) return null;

  return (
    <Dialog open={!!wallet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rebalance Wallet</DialogTitle>
          <DialogDescription>{wallet.currency} · {wallet.provider}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Balance</span>
            <span className="font-medium">{formatMoney(wallet.balance, wallet.currency)}</span>
          </div>
          <div>
            <Label>New Balance ({wallet.currency})</Label>
            <Input type="number" step="0.01" value={newBalance} onChange={(e) => setNewBalance(Number(e.target.value))} />
          </div>
          <p className="text-xs text-muted-foreground">Adjust the wallet balance to match external bank records. This will be logged in the audit trail.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/treasury`, "PATCH", { action: "rebalance", walletId: wallet.id, newBalance }, "Wallet rebalanced");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Rebalance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
