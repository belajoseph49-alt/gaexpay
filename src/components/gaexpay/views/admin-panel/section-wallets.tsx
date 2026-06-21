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
  Wallet as WalletIcon, Search, Snowflake, Sun, ArrowLeftRight,
} from "lucide-react";
import { formatMoney, CURRENCIES } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, apiAction, showError } from "./shared";

export function WalletsSection() {
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("all");
  const [status, setStatus] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (currency !== "all") p.set("currency", currency);
    if (status !== "all") p.set("status", status);
    return `/api/admin/wallets?${p.toString()}&k=${reloadKey}`;
  }, [search, currency, status, reloadKey]);

  const { data, loading } = useFetch<{ wallets: any[] }>(url);
  const wallets = data?.wallets ?? [];

  // Totals
  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalFrozen = wallets.filter((w) => w.status === "frozen").length;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Wallet Management"
        description={`${wallets.length} wallets · ${totalFrozen} frozen · total balance ₦${totalBalance.toLocaleString()}`}
        icon={WalletIcon}
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by user name, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Currency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CURRENCIES.slice(0, 12).map((c) => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Ledger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.length === 0 && (
                  <TableRow><TableCell colSpan={7}><EmptyState message="No wallets found" icon={WalletIcon} /></TableCell></TableRow>
                )}
                {wallets.map((w) => (
                  <TableRow key={w.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{w.user?.firstName} {w.user?.lastName}</p>
                      <p className="text-muted-foreground">{w.user?.email}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{w.currency}</Badge></TableCell>
                    <TableCell className="text-xs capitalize">{w.type}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatMoney(w.balance, w.currency)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatMoney(w.ledgerBalance, w.currency)}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdjustTarget(w)} title="Adjust balance">
                          <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Adjust
                        </Button>
                        {w.status === "active" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-sky-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/wallets?action=freeze`, "PATCH", { walletId: w.id }, "Wallet frozen");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Freeze"><Snowflake className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/wallets?action=unfreeze`, "PATCH", { walletId: w.id }, "Wallet unfrozen");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Unfreeze"><Sun className="h-3.5 w-3.5" /></Button>
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

      <AdjustWalletDialog wallet={adjustTarget} onClose={() => setAdjustTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}

function AdjustWalletDialog({ wallet, onClose, onSaved }: { wallet: any; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (wallet && wallet.id !== lastId) {
    setAmount(""); setDirection("credit"); setReason(""); setLastId(wallet.id);
  }
  if (!wallet) return null;

  return (
    <Dialog open={!!wallet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Wallet Balance</DialogTitle>
          <DialogDescription>
            Wallet: {wallet.user?.firstName} {wallet.user?.lastName} · {wallet.currency}<br />
            Current balance: <span className="font-semibold">{formatMoney(wallet.balance, wallet.currency)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Direction</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={direction === "credit" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDirection("credit")}
              >Credit (+)</Button>
              <Button
                type="button"
                variant={direction === "debit" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setDirection("debit")}
              >Debit (−)</Button>
            </div>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Reason (recorded in audit trail)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="E.g., Customer dispute resolution, manual correction…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/wallets?action=adjust`, "PATCH", {
              walletId: wallet.id, amount: Number(amount), direction, reason,
            }, "Wallet adjusted");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Apply adjustment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
