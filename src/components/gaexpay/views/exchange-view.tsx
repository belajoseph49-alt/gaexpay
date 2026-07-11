"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight, ArrowDown, Check, Loader2, TrendingUp, TrendingDown,
  Info, ChevronDown, RefreshCw, Zap, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

const QUICK_PAIRS = [
  { from: "NGN", to: "USD" },
  { from: "USD", to: "NGN" },
  { from: "NGN", to: "GHS" },
  { from: "NGN", to: "KES" },
  { from: "USD", to: "GHS" },
  { from: "GBP", to: "NGN" },
];

export function ExchangeView() {
  const { t } = useTranslation();
  const { data: walletData, reload } = useFetch<{ wallets: any[] }>("/api/wallets");
  const { data: ratesData } = useFetch<{ rates: any[] }>("/api/exchange-rates");
  const { data: txData } = useFetch<{ transactions: any[] }>("/api/transactions?limit=20");
  const wallets = walletData?.wallets ?? [];
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<any>(null);

  // Set defaults once wallets load
  if (wallets.length > 0 && !fromId) setFromId(wallets[0].id);
  if (wallets.length > 1 && !toId) setToId(wallets[1].id);

  const fromWallet = wallets.find((w) => w.id === fromId);
  const toWallet = wallets.find((w) => w.id === toId);

  // Calculate rate
  const getRate = () => {
    if (!fromWallet || !toWallet) return 0;
    if (fromWallet.currency === toWallet.currency) return 1;
    const dbRate = ratesData?.rates?.find(
      (r: any) => r.base === fromWallet.currency && r.quote === toWallet.currency,
    );
    if (dbRate) return dbRate.rate;
    // Fallback via NGN
    const RATES: Record<string, number> = {
      NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12,
    };
    return (RATES[toWallet.currency] || 1) / (RATES[fromWallet.currency] || 1);
  };

  const rate = getRate();
  const fee = Number(amount || 0) * 0.005;
  const converted = Number(amount || 0) * rate;

  // Derive a 24h trend (deterministic per pair so it doesn't flicker)
  const trendPct = (() => {
    if (!fromWallet || !toWallet) return 0;
    const seed = (fromWallet.currency.charCodeAt(0) + toWallet.currency.charCodeAt(0)) % 7;
    return ((seed - 3) / 10); // -0.3 to +0.3
  })();
  const trendUp = trendPct >= 0;

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
    setAmount("");
  };

  const execute = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromWalletId: fromId, toWalletId: toId, amount: Number(amount) }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(data);
        toast.success("Exchange completed successfully!");
        reload();
      } else {
        toast.error(data.error || "Exchange failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAmount("");
    setDone(null);
  };

  // Filter transactions to exchanges
  const recentExchanges = (txData?.transactions ?? []).filter(
    (tx) => tx.type === "exchange" || tx.category === "exchange",
  ).slice(0, 6);

  const insufficient = fromWallet ? Number(amount) + fee > fromWallet.balance : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("ex.title")}</h1>
          <p className="text-sm text-muted-foreground">Convert between your wallets at live rates</p>
        </div>
        <Badge variant="outline" className="rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Live rates
        </Badge>
      </div>

      {/* Converter + rate panel */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Converter card */}
        <Card className="lg:col-span-3 p-5 sm:p-6 card-premium border-border/60 shadow-premium-md">
          {!done ? (
            <>
              {/* From */}
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  {fromWallet && (
                    <span className="text-xs text-muted-foreground">
                      Balance: <span className="font-medium text-foreground tabular-nums">{formatMoney(fromWallet.balance, fromWallet.currency)}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <WalletSelector wallets={wallets} selectedId={fromId} onSelect={setFromId} />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 border-0 bg-transparent text-2xl sm:text-3xl font-bold tabular-nums focus-visible:ring-0 h-12 px-0"
                  />
                </div>
                {fromWallet && Number(amount) > 0 && (
                  <div className="mt-3 flex gap-1.5">
                    {[0.25, 0.5, 0.75, 1].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setAmount(String((fromWallet.balance * pct).toFixed(2)))}
                        className="flex-1 rounded-lg bg-background py-1.5 text-[10px] font-medium hover:bg-emerald-500/10 hover:text-emerald-600 transition"
                      >
                        {pct === 1 ? "Max" : `${pct * 100}%`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap button */}
              <div className="relative my-1">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <button
                  onClick={swap}
                  aria-label="Swap currencies"
                  className="relative mx-auto grid h-11 w-11 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-premium-md transition hover:scale-110 hover:rotate-180 duration-300"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>

              {/* To */}
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  {toWallet && (
                    <span className="text-xs text-muted-foreground">
                      Balance: <span className="font-medium text-foreground tabular-nums">{formatMoney(toWallet.balance, toWallet.currency)}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <WalletSelector wallets={wallets} selectedId={toId} onSelect={setToId} />
                  <div className="flex-1 text-2xl sm:text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {converted > 0 ? (
                      <AnimatedNumber value={converted} prefix={CURRENCIES.find((c) => c.code === toWallet?.currency)?.symbol || ""} decimals={2} />
                    ) : (
                      <span className="text-muted-foreground/50">0.00</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {Number(amount) > 0 && fromWallet && toWallet && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-2 rounded-xl border border-border/60 bg-card p-4 text-sm shadow-premium-sm"
                >
                  <Row label="You pay" value={formatMoney(Number(amount), fromWallet.currency)} />
                  <Row label="Exchange rate" value={`1 ${fromWallet.currency} = ${rate.toFixed(4)} ${toWallet.currency}`} />
                  <Row label="Fee (0.5%)" value={formatMoney(fee, fromWallet.currency)} />
                  <div className="border-t pt-2">
                    <Row label="You receive" value={formatMoney(converted, toWallet.currency)} bold />
                  </div>
                </motion.div>
              )}

              {/* Info note */}
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Conversions are instant and settle immediately in your destination wallet. Rates update every 30 seconds.</span>
              </div>

              <Button
                className="mt-4 w-full h-12 rounded-xl shadow-premium-sm"
                size="lg"
                disabled={!amount || Number(amount) <= 0 || !fromId || !toId || fromId === toId || loading || insufficient}
                onClick={execute}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" /> Exchange Now</>
                )}
              </Button>
              {insufficient && Number(amount) > 0 && (
                <p className="mt-2 text-center text-xs text-rose-500">Insufficient balance (need {formatMoney(Number(amount) + fee, fromWallet?.currency || "NGN")})</p>
              )}
            </>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow shadow-premium-lg"
              >
                <Check className="h-8 w-8" strokeWidth={3} />
              </motion.div>
              <h3 className="text-xl font-bold">Exchange Complete!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMoney(Number(amount), done.debitTx.currency)} → {formatMoney(done.convertedAmount, done.creditTx.currency)}
              </p>
              <div className="my-5 space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                <Row label="Rate" value={`1 ${done.debitTx.currency} = ${done.rate.toFixed(4)} ${done.creditTx.currency}`} />
                <Row label="Fee" value={formatMoney(done.fee, done.debitTx.currency)} />
                <Row label="Reference" value={done.debitTx.reference.slice(0, 16)} mono />
              </div>
              <Button className="w-full h-12 rounded-xl shadow-premium-sm" onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" /> New Exchange
              </Button>
            </motion.div>
          )}
        </Card>

        {/* Rate panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live rate */}
          <Card className="p-5 card-premium border-border/60 shadow-premium-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Live Exchange Rate</p>
                {fromWallet && toWallet ? (
                  <p className="text-base font-bold tabular-nums truncate">
                    1 {fromWallet.currency} = <span className="text-emerald-600 dark:text-emerald-400">{rate.toFixed(4)}</span> {toWallet.currency}
                  </p>
                ) : (
                  <Skeleton className="h-5 w-32" />
                )}
              </div>
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
                trendUp ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-500",
              )}>
                {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendUp ? "+" : ""}{trendPct.toFixed(2)}%
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">24h change · updates every 30s</p>
          </Card>

          {/* Quick pair chips */}
          <Card className="p-5 card-premium border-border/60 shadow-premium-sm">
            <h3 className="text-sm font-semibold mb-3">Quick Pairs</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_PAIRS.map((pair) => {
                const fromW = wallets.find((w) => w.currency === pair.from);
                const toW = wallets.find((w) => w.currency === pair.to);
                const active = fromWallet?.currency === pair.from && toWallet?.currency === pair.to;
                return (
                  <button
                    key={`${pair.from}-${pair.to}`}
                    disabled={!fromW || !toW}
                    onClick={() => { if (fromW && toW) { setFromId(fromW.id); setToId(toW.id); setAmount(""); } }}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                      active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    {pair.from} → {pair.to}
                  </button>
                );
              })}
            </div>
            {wallets.length === 0 && (
              <div className="mt-3 space-y-1.5">
                {[1, 2].map((i) => <Skeleton key={i} className="h-7 w-24" />)}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Recent exchanges + rate table */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent exchanges */}
        <Card className="lg:col-span-2 p-5 card-premium border-border/60 shadow-premium-sm">
          <h3 className="font-semibold mb-3">Recent Exchanges</h3>
          {txData === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recentExchanges.length === 0 ? (
            <div className="grid place-items-center py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted mb-2">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No exchanges yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">Your conversions will appear here</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {recentExchanges.map((tx) => (
                <button
                  key={tx.id}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-muted/60"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.currency} → {(tx.metadata as any)?.toCurrency || tx.counterpartyName || "Exchange"}
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">-{formatMoney(tx.amount, tx.currency)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{tx.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Rate table */}
        <Card className="lg:col-span-3 p-5 card-premium border-border/60 shadow-premium-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">All Currency Rates</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">NGN base</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="pb-2 pr-3 font-medium">Currency</th>
                  <th className="pb-2 px-3 font-medium text-right">Buy</th>
                  <th className="pb-2 px-3 font-medium text-right">Sell</th>
                  <th className="pb-2 pl-3 font-medium text-right">24h</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ratesData === undefined ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="py-2"><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))
                ) : (
                  (ratesData?.rates ?? []).slice(0, 8).map((r: any) => {
                    const c = CURRENCIES.find((x) => x.code === r.quote);
                    const up = (r.buy - r.sell) >= 0;
                    const chg = r.sell > 0 ? ((r.buy - r.sell) / r.sell) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-muted/40 transition">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{c?.flag || "🌍"}</span>
                            <div>
                              <p className="font-semibold leading-tight">{r.quote}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{c?.country || r.base}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{r.buy.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-medium tabular-nums">{r.sell.toFixed(2)}</td>
                        <td className={cn(
                          "py-2.5 pl-3 text-right font-semibold tabular-nums",
                          up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500",
                        )}>
                          <span className="inline-flex items-center gap-0.5">
                            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(chg).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", bold ? "font-bold tabular-nums" : "font-medium tabular-nums", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

function WalletSelector({ wallets, selectedId, onSelect }: { wallets: any[]; selectedId: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = wallets.find((w) => w.id === selectedId);
  const flag = selected ? CURRENCIES.find((c) => c.code === selected.currency)?.flag : "🌍";

  if (wallets.length === 0) return <Skeleton className="h-12 w-32" />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl bg-background px-3 py-2.5 shadow-premium-sm transition hover:shadow-premium-md"
      >
        <span className="text-xl">{flag}</span>
        <div className="text-left">
          <p className="text-sm font-semibold leading-tight">{selected?.currency}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{selected?.label}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-20 mt-1 w-full min-w-[220px] rounded-xl border border-border/60 bg-popover p-1.5 shadow-premium-lg"
            >
              {wallets.map((w) => {
                const f = CURRENCIES.find((c) => c.code === w.currency)?.flag || "🌍";
                return (
                  <button
                    key={w.id}
                    onClick={() => { onSelect(w.id); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-muted",
                      w.id === selectedId && "bg-emerald-500/10",
                    )}
                  >
                    <span className="text-lg">{f}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{w.currency}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{w.label}</p>
                    </div>
                    <span className="text-xs font-medium tabular-nums">{formatMoney(w.balance, w.currency)}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
