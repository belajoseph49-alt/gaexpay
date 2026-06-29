"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight, ArrowDown, Check, Loader2, TrendingUp, Zap,
  Info, ChevronDown, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

export function ExchangeView() {
  const { t } = useTranslation();
  const { data: walletData, reload } = useFetch<{ wallets: any[] }>("/api/wallets");
  const { data: ratesData } = useFetch<{ rates: any[] }>("/api/exchange-rates");
  const wallets = walletData?.wallets ?? [];
  const [fromId, setFromId] = useState<string>("");
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [toId, setToId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<any>(null);
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
    const dbRate = ratesData?.rates?.find((r: any) => r.base === fromWallet.currency && r.quote === toWallet.currency);
    if (dbRate) return dbRate.rate;
    // Fallback via NGN
    const RATES: Record<string, number> = { NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12 };
    return (RATES[toWallet.currency] || 1) / (RATES[fromWallet.currency] || 1);
  };

  const rate = getRate();
  const fee = Number(amount || 0) * 0.005;
  const converted = Number(amount || 0) * rate;

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
    setAmount("");
    setPreview(null);
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
    setPreview(null);
    setDone(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("ex.title")}</h1>
        <p className="text-sm text-muted-foreground">Convert between your wallets at live rates</p>
      </div>

      {/* Rate ticker */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Live Exchange Rate</p>
            {fromWallet && toWallet ? (
              <p className="text-sm font-semibold tabular-nums">
                1 {fromWallet.currency} = {rate.toFixed(4)} {toWallet.currency}
              </p>
            ) : (
              <Skeleton className="h-4 w-32" />
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-violet-600 border-violet-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse mr-1.5" /> Live
        </Badge>
      </Card>

      {/* Exchange card */}
      <Card className="mx-auto max-w-xl p-6">
        {!done ? (
          <>
            {/* From */}
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">From</Label>
                {fromWallet && (
                  <span className="text-xs text-muted-foreground">
                    Balance: {formatMoney(fromWallet.balance, fromWallet.currency)}
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
                  className="flex-1 border-0 bg-transparent text-2xl font-bold tabular-nums focus-visible:ring-0"
                />
              </div>
              {fromWallet && Number(amount) > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setAmount(String((fromWallet.balance * pct).toFixed(2)))}
                      className="flex-1 rounded-md bg-background py-1 text-[10px] font-medium hover:bg-muted transition"
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
                className="relative mx-auto grid h-10 w-10 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition hover:scale-110"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            {/* To */}
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">To</Label>
                {toWallet && (
                  <span className="text-xs text-muted-foreground">
                    Balance: {formatMoney(toWallet.balance, toWallet.currency)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <WalletSelector wallets={wallets} selectedId={toId} onSelect={setToId} />
                <div className="flex-1 text-2xl font-bold tabular-nums text-violet-600">
                  {converted > 0 ? formatMoney(converted, toWallet?.currency || "NGN") : "0.00"}
                </div>
              </div>
            </div>

            {/* Summary */}
            {Number(amount) > 0 && fromWallet && toWallet && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-2 rounded-xl border bg-card p-4 text-sm">
                <Row label="You pay" value={formatMoney(Number(amount), fromWallet.currency)} />
                <Row label="Exchange rate" value={`1 ${fromWallet.currency} = ${rate.toFixed(4)} ${toWallet.currency}`} />
                <Row label="Fee (0.5%)" value={formatMoney(fee, fromWallet.currency)} />
                <div className="border-t pt-2">
                  <Row label="You receive" value={formatMoney(converted, toWallet.currency)} bold />
                </div>
              </motion.div>
            )}

            {/* Info note */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Conversions are instant and settle immediately in your destination wallet. Rates update every 30 seconds.</span>
            </div>

            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!amount || Number(amount) <= 0 || !fromId || !toId || fromId === toId || loading || (fromWallet ? Number(amount) + fee > fromWallet.balance : false)}
              onClick={execute}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Exchange Now</>
              )}
            </Button>
            {fromWallet && Number(amount) + fee > fromWallet.balance && Number(amount) > 0 && (
              <p className="mt-2 text-center text-xs text-rose-500">Insufficient balance (need {formatMoney(Number(amount) + fee, fromWallet.currency)})</p>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-violet-500 text-white pulse-glow"
            >
              <Check className="h-8 w-8" strokeWidth={3} />
            </motion.div>
            <h3 className="text-xl font-bold">Exchange Complete!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(Number(amount), done.debitTx.currency)} → {formatMoney(done.convertedAmount, done.creditTx.currency)}
            </p>
            <div className="my-5 space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
              <Row label="Rate" value={`1 ${done.debitTx.currency} = ${done.rate.toFixed(4)} ${done.creditTx.currency}`} />
              <Row label="Fee" value={formatMoney(done.fee, done.debitTx.currency)} />
              <Row label="Reference" value={done.debitTx.reference.slice(0, 16)} mono />
            </div>
            <Button className="w-full" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" /> New Exchange
            </Button>
          </motion.div>
        )}
      </Card>

      {/* Popular pairs */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Popular Currency Pairs</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ratesData?.rates?.slice(0, 6).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">{r.base}/{r.quote}</span>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{r.rate.toFixed(4)}</p>
                <p className="text-[10px] text-muted-foreground">Buy {r.buy.toFixed(2)} / Sell {r.sell.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", bold ? "font-bold" : "font-medium", mono && "font-mono text-xs")}>{value}</span>
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
        className="flex items-center gap-2 rounded-xl bg-background px-3 py-2.5 shadow-sm transition hover:shadow-md"
      >
        <span className="text-xl">{flag}</span>
        <div className="text-left">
          <p className="text-sm font-semibold">{selected?.currency}</p>
          <p className="text-[10px] text-muted-foreground">{selected?.label}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full min-w-[200px] rounded-lg border bg-popover p-1 shadow-lg">
            {wallets.map((w) => {
              const f = CURRENCIES.find((c) => c.code === w.currency)?.flag || "🌍";
              return (
                <button
                  key={w.id}
                  onClick={() => { onSelect(w.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-muted",
                    w.id === selectedId && "bg-primary/10",
                  )}
                >
                  <span className="text-lg">{f}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{w.currency}</p>
                    <p className="text-[10px] text-muted-foreground">{w.label}</p>
                  </div>
                  <span className="text-xs font-medium tabular-nums">{formatMoney(w.balance, w.currency)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
