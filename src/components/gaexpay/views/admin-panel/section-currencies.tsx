"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Coins, Plus, Edit3 } from "lucide-react";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";
import { CURRENCIES, CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { cn } from "@/lib/utils";

export function CurrenciesSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/currencies");
  const [tab, setTab] = useState<"fiat" | "crypto">("fiat");
  const [addOpen, setAddOpen] = useState(false);
  const [editRate, setEditRate] = useState<any | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Currency Management" description="Fiat & crypto currencies, exchange rates" icon={Coins} />
        <LoadingTable rows={6} />
      </div>
    );
  }

  const list = tab === "fiat" ? data.fiat : data.crypto;

  async function toggle(code: string, enabled: boolean) {
    const r = await apiAction(`/api/admin/currencies`, "PATCH", { code, enabled: !enabled }, enabled ? "Currency disabled" : "Currency enabled");
    if (!r.ok) showError(r.error || "Failed"); else reload();
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Currency Management"
        description="Fiat & crypto currencies, exchange rates"
        icon={Coins}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Rate</Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "fiat" ? "default" : "outline"} onClick={() => setTab("fiat")}>
          Fiat ({data.fiat.length})
        </Button>
        <Button size="sm" variant={tab === "crypto" ? "default" : "outline"} onClick={() => setTab("crypto")}>
          Crypto ({data.crypto.length})
        </Button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country / Network</TableHead>
                <TableHead className="text-right">Rate (USD)</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState message="No currencies" icon={Coins} /></TableCell></TableRow>}
              {list.map((c: any) => (
                <TableRow key={c.code} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.flag || c.icon}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{c.code}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{c.name}</TableCell>
                  <TableCell className="text-xs">{tab === "fiat" ? c.country : c.network}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {c.rateUSD ? `$${c.rateUSD.toFixed(4)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={c.enabled} onCheckedChange={() => toggle(c.code, c.enabled)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditRate({ ...c, base: "USD", quote: c.code, rate: c.rateUSD ?? 1 })}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Rate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Exchange rates table */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Exchange Rates (USD base)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[300px] overflow-y-auto">
          {(data.rates ?? []).map((r: any) => (
            <div key={r.id ?? `${r.base}-${r.quote}`} className="flex items-center justify-between rounded-lg border p-2.5">
              <div>
                <p className="text-sm font-mono font-semibold">{r.base}/{r.quote}</p>
                <p className="text-xs text-muted-foreground">Buy {r.buy?.toFixed(4)} · Sell {r.sell?.toFixed(4)}</p>
              </div>
              <Badge variant="outline" className="text-xs tabular-nums">{r.rate.toFixed(4)}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Add rate dialog */}
      <AddRateDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => { reload(); setAddOpen(false); }} />

      {/* Edit rate dialog */}
      <EditRateDialog rate={editRate} onClose={() => setEditRate(null)} onSaved={() => { reload(); setEditRate(null); }} />
    </div>
  );
}

function AddRateDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("");
  const [rate, setRate] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Exchange Rate</DialogTitle>
          <DialogDescription>Create or update a currency pair rate</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Base currency</Label>
            <Input value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} placeholder="USD" className="font-mono" />
          </div>
          <div>
            <Label>Quote currency</Label>
            <Input value={quote} onChange={(e) => setQuote(e.target.value.toUpperCase())} placeholder="NGN" className="font-mono" />
          </div>
          <div>
            <Label>Rate (1 base = ? quote)</Label>
            <Input type="number" step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="1540.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/currencies`, "POST", {
              base, quote, rate: Number(rate),
            }, "Exchange rate added");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Add rate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRateDialog({ rate, onClose, onSaved }: { rate: any; onClose: () => void; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (rate && rate.quote !== lastKey) { setValue(String(rate.rate ?? "")); setLastKey(rate.quote); }
  if (!rate) return null;

  return (
    <Dialog open={!!rate} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {rate.base}/{rate.quote} Rate</DialogTitle>
          <DialogDescription>Update the conversion rate</DialogDescription>
        </DialogHeader>
        <div>
          <Label>Rate (1 {rate.base} = ? {rate.quote})</Label>
          <Input type="number" step="0.0001" value={value} onChange={(e) => setValue(e.target.value)} className="font-mono" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/currencies`, "PATCH", {
              base: rate.base, quote: rate.quote, rate: Number(value),
            }, "Rate updated");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
