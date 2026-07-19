"use client";

import { useState, useMemo } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  TrendingUp, Search, Edit3, RefreshCw, Zap,
} from "lucide-react";
import {
  SectionHeader, LoadingTable, EmptyState, KpiCard, apiAction, showError,
} from "./shared";
import { cn } from "@/lib/utils";

export function ExchangeRatesSection() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    return `/api/admin/exchange-rates?${p.toString()}&k=${reloadKey}`;
  }, [search, reloadKey]);

  const { data, loading } = useFetch<{ rates: any[] }>(url);
  const rates = data?.rates ?? [];

  const filtered = useMemo(() => {
    let list = rates;
    if (source !== "all") list = list.filter((r) => r.source === source);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.base.toLowerCase().includes(q) || r.quote.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rates, source, search]);

  const totalPairs = rates.length;
  const manualPairs = rates.filter((r) => r.source === "manual").length;
  const autoPairs = rates.filter((r) => r.source === "auto").length;
  const stalePairs = rates.filter(
    (r) => typeof r.deviationPct === "number" && Math.abs(r.deviationPct) > 5,
  ).length;

  async function refresh() {
    setRefreshing(true);
    const r = await apiAction(`/api/admin/exchange-rates?action=refresh`, "PATCH", {}, "Rates refreshed from CoinGecko");
    setRefreshing(false);
    if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Exchange Rates Management"
        description={`${totalPairs} pairs · ${autoPairs} auto · ${manualPairs} manual · ${stalePairs} deviating >5%`}
        icon={TrendingUp}
        actions={
          <Button size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh from CoinGecko"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={TrendingUp} label="Total Pairs" value={totalPairs} color="bg-purple-500/15 text-purple-500" />
        <KpiCard icon={Zap} label="Auto (CoinGecko)" value={autoPairs} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Edit3} label="Manual" value={manualPairs} color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={RefreshCw} label="Stale (>5% drift)" value={stalePairs} color="bg-rose-500/15 text-rose-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by currency code (USD, NGN, BTC)…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="auto">Auto (CoinGecko)</SelectItem>
              <SelectItem value="manual">Manual override</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={8} /></div> : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Buy</TableHead>
                  <TableHead className="text-right">Sell</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Live</TableHead>
                  <TableHead className="text-right">Deviation</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Auto</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10}><EmptyState message="No exchange rates found" icon={TrendingUp} /></TableCell></TableRow>
                )}
                {filtered.map((r) => {
                  const isManual = r.source === "manual";
                  const dev = r.deviationPct;
                  const devCls =
                    dev == null ? "text-muted-foreground"
                    : Math.abs(dev) > 5 ? "text-rose-600 font-semibold"
                    : Math.abs(dev) > 1 ? "text-amber-600"
                    : "text-violet-600";
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono">{r.base}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{r.quote}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{r.rate?.toFixed(6)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{r.buy?.toFixed(6)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{r.sell?.toFixed(6)}</TableCell>
                      <TableCell>
                        {isManual ? (
                          <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border-0">Manual</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-violet-500/15 text-violet-600 border-0">Auto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {r.liveRate != null ? r.liveRate.toFixed(6) : "—"}
                      </TableCell>
                      <TableCell className={cn("text-right text-xs tabular-nums", devCls)}>
                        {dev != null ? `${dev > 0 ? "+" : ""}${dev.toFixed(2)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.updatedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!isManual}
                          onCheckedChange={async (auto) => {
                            const r2 = await apiAction(`/api/admin/exchange-rates?action=toggle_auto`, "PATCH", {
                              base: r.base, quote: r.quote, auto,
                            }, auto ? "Switched to auto" : "Switched to manual");
                            if (!r2.ok) showError(r2.error || "Failed"); else setReloadKey((k) => k + 1);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditTarget(r)} title="Edit rate">
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <EditRateDialog rate={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setReloadKey((k) => k + 1); setEditTarget(null); }} />
    </div>
  );
}

function EditRateDialog({ rate, onClose, onSaved }: { rate: any; onClose: () => void; onSaved: () => void }) {
  const [value, setvalue] = useState("");
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (rate && rate.id !== lastId) {
    setvalue(String(rate.rate ?? ""));
    setBuy(rate.buy != null ? String(rate.buy) : "");
    setSell(rate.sell != null ? String(rate.sell) : "");
    setLastId(rate.id);
  }
  if (!rate) return null;

  return (
    <Dialog open={!!rate} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {rate.base}/{rate.quote} rate</DialogTitle>
          <DialogDescription>
            Manually override the conversion rate. This will mark the pair as manual
            (CoinGecko auto-refresh will skip it until you toggle auto back on).
            {rate.liveRate != null && (
              <span className="block mt-1">Live rate: <strong>{rate.liveRate.toFixed(6)}</strong></span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Rate (1 {rate.base} = ? {rate.quote})</Label>
            <Input type="number" step="0.000001" value={value} onChange={(e) => setvalue(e.target.value)} className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Buy rate (optional)</Label>
              <Input type="number" step="0.000001" value={buy} onChange={(e) => setBuy(e.target.value)} className="font-mono" placeholder="auto" />
            </div>
            <div>
              <Label>Sell rate (optional)</Label>
              <Input type="number" step="0.000001" value={sell} onChange={(e) => setSell(e.target.value)} className="font-mono" placeholder="auto" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const body: any = {
              base: rate.base,
              quote: rate.quote,
              rate: Number(value),
            };
            if (buy) body.buy = Number(buy);
            if (sell) body.sell = Number(sell);
            const r = await apiAction(`/api/admin/exchange-rates?action=update`, "PATCH", body, "Rate updated");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save override</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
