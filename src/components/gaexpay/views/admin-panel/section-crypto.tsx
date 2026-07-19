"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Bitcoin, Search, Settings, Save, ArrowLeftRight,
} from "lucide-react";
import { formatMoney } from "@/lib/gaexpay";
import {
  SectionHeader, StatusBadge, LoadingTable, EmptyState, KpiCard, apiAction, showError,
} from "./shared";

type Tab = "wallets" | "trades" | "swaps" | "settings";

export function CryptoSection() {
  const [tab, setTab] = useState<Tab>("wallets");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    p.set("tab", tab);
    return `/api/admin/crypto?${p.toString()}&k=${reloadKey}`;
  }, [search, tab, reloadKey]);

  const { data, loading } = useFetch<any>(url);
  const wallets: any[] = data?.wallets ?? [];
  const trades: any[] = data?.trades ?? [];
  const swaps: any[] = data?.swaps ?? [];

  const totalWallets = wallets.length;
  const totalTrades = trades.length;
  const totalSwaps = swaps.length;
  const totalWalletValue = wallets.reduce((s, w) => s + (w.balance || 0), 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Crypto Management"
        description={`${totalWallets} wallets · ${totalTrades} trades · ${totalSwaps} swaps · ${formatMoney(totalWalletValue, "USD")} held`}
        icon={Bitcoin}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Bitcoin} label="Crypto Wallets" value={totalWallets} color="bg-orange-500/15 text-orange-500" />
        <KpiCard icon={ArrowLeftRight} label="Trades" value={totalTrades} color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={ArrowLeftRight} label="Swaps" value={totalSwaps} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Settings} label="Wallet Balance (sum)" value={formatMoney(totalWalletValue, "USD")} color="bg-violet-500/15 text-violet-500" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={tab === "wallets" ? "default" : "outline"} onClick={() => setTab("wallets")}>
          <Bitcoin className="h-4 w-4 mr-1.5" /> Wallets ({totalWallets})
        </Button>
        <Button size="sm" variant={tab === "trades" ? "default" : "outline"} onClick={() => setTab("trades")}>
          <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Trades ({totalTrades})
        </Button>
        <Button size="sm" variant={tab === "swaps" ? "default" : "outline"} onClick={() => setTab("swaps")}>
          <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Swaps ({totalSwaps})
        </Button>
        <Button size="sm" variant={tab === "settings" ? "default" : "outline"} onClick={() => setTab("settings")}>
          <Settings className="h-4 w-4 mr-1.5" /> Settings
        </Button>
        {tab !== "settings" && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by user, reference…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        )}
      </div>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : tab === "wallets" ? (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Coin</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.length === 0 && (
                  <TableRow><TableCell colSpan={7}><EmptyState message="No crypto wallets found" icon={Bitcoin} /></TableCell></TableRow>
                )}
                {wallets.map((w) => (
                  <TableRow key={w.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{w.user?.firstName} {w.user?.lastName}</p>
                      <p className="text-muted-foreground">{w.user?.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{w.icon}</span>
                        <div>
                          <p className="text-sm font-mono font-semibold">{w.currency}</p>
                          <p className="text-[10px] text-muted-foreground">{w.coinName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatMoney(w.balance, w.currency)}</TableCell>
                    <TableCell className="text-xs capitalize">{w.type}</TableCell>
                    <TableCell className="text-xs">{w.network}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell className="text-xs">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : tab === "trades" ? (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Coin</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Fiat</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.length === 0 && (
                  <TableRow><TableCell colSpan={10}><EmptyState message="No trades found" icon={ArrowLeftRight} /></TableCell></TableRow>
                )}
                {trades.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{t.user?.firstName} {t.user?.lastName}</p>
                      <p className="text-muted-foreground">{t.user?.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        t.action === "buy"
                          ? "text-[10px] bg-violet-500/15 text-violet-600 border-violet-500/20 capitalize"
                          : "text-[10px] bg-rose-500/15 text-rose-600 border-rose-500/20 capitalize"
                      }>
                        {t.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-mono font-semibold">{t.crypto}</p>
                      <p className="text-[10px] text-muted-foreground">{t.cryptoName}</p>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{t.amount?.toFixed(6)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatMoney(t.fiatAmount, t.fiatCurrency)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{t.marketRate?.toFixed(4)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatMoney(t.fee, t.fiatCurrency)}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">{t.reference}</TableCell>
                    <TableCell className="text-xs">{new Date(t.createdAt).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : tab === "swaps" ? (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {swaps.length === 0 && (
                  <TableRow><TableCell colSpan={10}><EmptyState message="No swaps found" icon={ArrowLeftRight} /></TableCell></TableRow>
                )}
                {swaps.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{s.user?.firstName} {s.user?.lastName}</p>
                      <p className="text-muted-foreground">{s.user?.email}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{s.from}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-mono">{s.to}</Badge></TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{s.amount?.toFixed(6)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{s.rate?.toFixed(6)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{s.convertedAmount?.toFixed(6)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatMoney(s.fee, "USD")}</TableCell>
                    <TableCell className="text-[10px] font-mono text-muted-foreground">{s.reference}</TableCell>
                    <TableCell className="text-xs">{new Date(s.createdAt).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <CryptoSettingsPanel onSaved={() => setReloadKey((k) => k + 1)} />
        )}
      </Card>
    </div>
  );
}

function CryptoSettingsPanel({ onSaved }: { onSaved: () => void }) {
  const { data, loading } = useFetch<any>("/api/admin/crypto?tab=settings");
  const [minTrade, setMinTrade] = useState("");
  const [maxTrade, setMaxTrade] = useState("");
  const [swapFee, setSwapFee] = useState("");
  const [coins, setCoins] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!data || hydrated) return;
    setMinTrade(String(data.settings?.min_trade_amount ?? ""));
    setMaxTrade(String(data.settings?.max_trade_amount ?? ""));
    setSwapFee(String(data.settings?.swap_fee_override ?? ""));
    setCoins(data.coins ?? []);
    setHydrated(true);
  }, [data, hydrated]);

  if (loading && !data) {
    return <div className="p-4"><LoadingTable rows={4} /></div>;
  }

  async function toggleCoin(code: string, enabled: boolean) {
    const r = await apiAction(`/api/admin/crypto?action=toggle_coin`, "PATCH", { code, enabled }, `${code} ${enabled ? "enabled" : "disabled"}`);
    if (!r.ok) {
      showError(r.error || "Failed");
      // revert UI
      setCoins((prev) => prev.map((c) => (c.code === code ? { ...c, enabled: !enabled } : c)));
    } else {
      setCoins((prev) => prev.map((c) => (c.code === code ? { ...c, enabled } : c)));
      onSaved();
    }
  }

  async function saveSettings() {
    setSaving(true);
    const r = await apiAction(`/api/admin/crypto?action=settings`, "PATCH", {
      min_trade_amount: Number(minTrade),
      max_trade_amount: Number(maxTrade),
      swap_fee_override: Number(swapFee),
    }, "Crypto settings saved");
    setSaving(false);
    if (!r.ok) showError(r.error || "Failed"); else onSaved();
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold">Trading Limits & Fees</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>Min trade amount (USD)</Label>
            <Input type="number" min="0" step="0.01" value={minTrade} onChange={(e) => setMinTrade(e.target.value)} />
          </div>
          <div>
            <Label>Max trade amount (USD)</Label>
            <Input type="number" min="0" step="0.01" value={maxTrade} onChange={(e) => setMaxTrade(e.target.value)} />
          </div>
          <div>
            <Label>Swap fee override (%)</Label>
            <Input type="number" min="0" max="100" step="0.01" value={swapFee} onChange={(e) => setSwapFee(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bitcoin className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold">Supported Coins ({coins.length})</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {coins.map((c) => (
            <div key={c.code} className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{c.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-mono font-semibold truncate">{c.code}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{c.name}</p>
                </div>
              </div>
              <Switch checked={c.enabled} onCheckedChange={(v) => toggleCoin(c.code, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
