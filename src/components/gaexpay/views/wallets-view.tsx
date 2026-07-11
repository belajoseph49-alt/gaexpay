"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, ArrowUpDown, Eye, EyeOff, TrendingUp, Download, ArrowRightLeft,
  Wallet as WalletIcon, ChevronRight, SendHorizontal, ArrowDownToLine,
  Bitcoin, Sparkles, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES, CRYPTOCURRENCIES } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

// Crypto currency codes that should use the violet/amber accent tile
const CRYPTO_CODES = new Set(CRYPTOCURRENCIES.map((c) => c.code));

// Conversion table for showing the NGN equivalent
const RATES_TO_NGN: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12,
  XAF: 2.55, XOF: 2.55, ZAR: 82, UGX: 0.42, TZS: 0.61, RWF: 1.28,
  ETB: 27.5, EGP: 32, MAD: 154, CNY: 213, AED: 419, INR: 18.5,
  USDT: 1540, USDC: 1540, BUSD: 1540, DAI: 1540,
  BTC: 154000000, ETH: 5300000, BNB: 980000, SOL: 350000,
  XRP: 3200, PI: 1500,
};

const TYPE_LABEL: Record<string, string> = {
  primary: "Primary",
  savings: "Savings",
  business: "Business",
  crypto: "Crypto",
};

// Mini sparkline data — deterministic per wallet id so it doesn't flicker
function makeSparkline(seed: string) {
  const points: number[] = [];
  let v = 50;
  for (let i = 0; i < 12; i++) {
    const k = (seed.charCodeAt(i % seed.length) || 65) * (i + 1);
    v += (k % 17) - 8;
    v = Math.max(20, Math.min(80, v));
    points.push(v);
  }
  return points;
}

export function WalletsView() {
  const { t } = useTranslation();
  const { data, reload } = useFetch<{ wallets: any[]; totalNGN: number }>("/api/wallets");
  const { data: ratesData } = useFetch<{ rates: any[] }>("/api/exchange-rates");
  const { setView, setSelectedWalletId } = useApp();
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  const openWallet = (id: string) => {
    setSelectedWalletId(id);
    setView("wallet-detail");
  };

  const wallets = data?.wallets ?? [];
  const totalNGN = data?.totalNGN ?? 0;
  const loading = !data;

  const addWallet = async (form: any) => {
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(`${form.currency} wallet created`);
      setOpen(false);
      reload();
    }
  };

  // Top portfolio sparkline
  const portfolioSpark = makeSparkline("portfolio-total");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("wallets.title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your multi-currency balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl"
            onClick={() => setView("analytics")}
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Exchange
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 rounded-xl shadow-premium-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Add Wallet
              </Button>
            </DialogTrigger>
            <AddWalletDialog onSubmit={addWallet} />
          </Dialog>
        </div>
      </div>

      {/* Total balance hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 sm:p-7 text-white shadow-premium-lg">
          <div className="absolute inset-0 opacity-30 mesh-bg" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-6 top-10 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-white/80">Total Portfolio Value (NGN)</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums truncate">
                  {hidden ? "₦ • • • •" : fmt(totalNGN)}
                </h2>
                <button
                  onClick={() => setHidden(!hidden)}
                  className="text-white/70 hover:text-white shrink-0"
                  aria-label={hidden ? "Show balance" : "Hide balance"}
                >
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
                <Badge className="bg-white/20 text-white border-0 backdrop-blur text-[10px]">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> +12.4%
                </Badge>
                <span className="text-xs text-white/70">this month · across {wallets.length} wallets</span>
              </div>
            </div>
            {/* Mini sparkline */}
            <div className="hidden sm:block">
              <Sparkline points={portfolioSpark} className="h-14 w-36 text-white" />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30 rounded-xl"
                onClick={() => setView("send")}
              >
                <Download className="h-4 w-4 mr-1.5" /> Top Up
              </Button>
              <Button
                variant="secondary"
                className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30 rounded-xl"
                onClick={() => setView("send")}
              >
                <ArrowUpDown className="h-4 w-4 mr-1.5" /> Transfer
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Wallet cards grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : wallets.length === 0 ? (
        <Card className="p-10 sm:p-16 border-border/60 shadow-premium-sm">
          <div className="grid place-items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary mb-4">
              <WalletIcon className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold">No wallets yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Create your first wallet to start sending, receiving and exchanging money.
            </p>
            <Button className="mt-5 h-10 rounded-xl shadow-premium-sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Wallet
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w, i) => (
            <WalletCard
              key={w.id}
              wallet={w}
              index={i}
              onOpen={() => openWallet(w.id)}
              onSend={() => setView("send")}
              onExchange={() => setView("analytics")}
            />
          ))}
        </div>
      )}

      {/* Exchange rates table */}
      <Card className="p-5 border-border/60 shadow-premium-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Live Exchange Rates</h3>
            <p className="text-xs text-muted-foreground">Updated in real time</p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Live
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Pair</th>
                <th className="pb-2 font-medium text-right">Buy</th>
                <th className="pb-2 font-medium text-right">Sell</th>
                <th className="pb-2 font-medium text-right">Rate</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {ratesData?.rates?.slice(0, 8).map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 font-medium">{r.base}/{r.quote}</td>
                  <td className="py-2.5 text-right tabular-nums text-emerald-600">{r.buy.toFixed(4)}</td>
                  <td className="py-2.5 text-right tabular-nums text-rose-600">{r.sell.toFixed(4)}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.rate.toFixed(4)}</td>
                  <td className="py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setView("analytics")}
                    >
                      Convert <ChevronRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!ratesData && [1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-2.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="py-2.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="py-2.5 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="py-2.5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function WalletCard({
  wallet,
  index,
  onOpen,
  onSend,
  onExchange,
}: {
  wallet: any;
  index: number;
  onOpen: () => void;
  onSend: () => void;
  onExchange: () => void;
}) {
  const isCrypto = CRYPTO_CODES.has(wallet.currency);
  const currencyMeta = CURRENCIES.find((c) => c.code === wallet.currency);
  const flag = currencyMeta?.flag || (isCrypto ? "🪙" : "🌍");
  const typeLabel = isCrypto ? "Crypto" : (TYPE_LABEL[wallet.type] || wallet.type);

  // NGN equivalent
  const rate = RATES_TO_NGN[wallet.currency] || 1;
  const ngnEquivalent = wallet.balance * rate;

  // Sparkline per wallet
  const spark = makeSparkline(wallet.id);

  // Accent: crypto = violet/amber tonal; fiat = emerald/teal tonal
  const accentTile = isCrypto
    ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  const sparkColor = isCrypto ? "#8b5cf6" : "#10b981";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
    >
      <Card
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-premium-sm card-lift hover:shadow-premium-md"
        onClick={onOpen}
      >
        {/* Top: currency badge + type label */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("grid h-11 w-11 place-items-center rounded-xl text-sm font-bold", accentTile)}>
              {wallet.currency}
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">{wallet.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span className="text-sm leading-none">{flag}</span>
                <span>{wallet.currency}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="capitalize">{typeLabel}</span>
              </p>
            </div>
          </div>
          {wallet.isDefault && (
            <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/15 rounded-full text-[10px]">
              Default
            </Badge>
          )}
        </div>

        {/* Middle: balance */}
        <div className="mt-5">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums truncate">
            {formatMoney(wallet.balance, wallet.currency)}
          </p>
          {wallet.currency !== "NGN" && (
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              ≈ {formatMoney(ngnEquivalent, "NGN")}
            </p>
          )}
        </div>

        {/* Sparkline */}
        <div className="mt-3 -mx-1">
          <Sparkline points={spark} className="h-8 w-full" stroke={sparkColor} />
        </div>

        {/* Bottom: quick actions */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5">
            <QuickAction
              icon={SendHorizontal}
              label="Send"
              onClick={(e) => { e.stopPropagation(); onSend(); }}
            />
            <QuickAction
              icon={ArrowDownToLine}
              label="Receive"
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
            />
            <QuickAction
              icon={RefreshCw}
              label="Exchange"
              onClick={(e) => { e.stopPropagation(); onExchange(); }}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Open wallet"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </motion.div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group/action flex flex-col items-center gap-1"
      aria-label={label}
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-muted/60 text-muted-foreground transition group-hover/action:bg-primary/10 group-hover/action:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[10px] text-muted-foreground group-hover/action:text-primary">{label}</span>
    </button>
  );
}

function Sparkline({
  points,
  className,
  stroke = "currentColor",
}: {
  points: number[];
  className?: string;
  stroke?: string;
}) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  const gradId = `spark-${stroke.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("block", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AddWalletDialog({ onSubmit }: { onSubmit: (form: any) => void }) {
  const [currency, setCurrency] = useState("USD");
  const [label, setLabel] = useState("USD Wallet");
  const [type, setType] = useState("primary");
  return (
    <DialogContent className="rounded-2xl">
      <DialogHeader>
        <DialogTitle>Create New Wallet</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => { setCurrency(v); setLabel(`${v} Wallet`); }}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Wallet Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button className="rounded-xl shadow-premium-sm" onClick={() => onSubmit({ currency, label, type })}>
          Create Wallet
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
