// @ts-nocheck
"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, QrCode,
  TrendingUp, TrendingDown, Wallet as WalletIcon, Plus, Download,
  ArrowDownRight, ArrowUpRight, Receipt, Smartphone, CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDateTime, timeAgo, CURRENCIES } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

const WALLET_GRADIENTS: Record<string, string> = {
  NGN: "from-violet-600 to-purple-700",
  USD: "from-slate-700 to-slate-900",
  EUR: "from-blue-600 to-indigo-800",
  GBP: "from-purple-700 to-fuchsia-900",
  GHS: "from-amber-600 to-orange-700",
  KES: "from-rose-600 to-pink-700",
};

const TYPE_ICONS: Record<string, any> = {
  transfer: ArrowLeftRight, deposit: ArrowDownRight, withdrawal: ArrowUpRight,
  payment: QrCode, bill: Receipt, airtime: Smartphone, card: CreditCard,
};

export function WalletDetailView() {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const { selectedWalletId, setView } = useApp();
  const { data } = useFetch<any>(selectedWalletId ? `/api/wallets/${selectedWalletId}` : null);

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setView("wallets")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Wallets
        </Button>
        <Skeleton className="h-48" />
        <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { wallet, transactions, stats, series } = data;
  const gradient = WALLET_GRADIENTS[wallet.currency] || "from-violet-600 to-purple-700";
  const flag = CURRENCIES.find((c) => c.code === wallet.currency)?.flag || "🌍";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setView("wallets")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Wallets
      </Button>

      {/* Wallet hero card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={cn("relative overflow-hidden border-0 bg-gradient-to-br p-6 text-white shadow-xl", gradient)}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{flag}</span>
                <span className="text-sm font-medium text-white/90">{wallet.label}</span>
                {wallet.isDefault && <Badge className="bg-white/20 text-white border-0">Default</Badge>}
              </div>
              <p className="text-xs text-white/70 mb-2">{wallet.currency} · {wallet.type} Wallet</p>
              <h2 className="text-4xl font-bold tabular-nums">
                <AnimatedNumber value={wallet.balance} prefix={CURRENCIES.find((c) => c.code === wallet.currency)?.symbol} decimals={2} />
              </h2>
              <p className="mt-1 text-xs text-white/70">Available balance · •••• {wallet.id.slice(-4)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30" onClick={() => setView("send")}>
                <ArrowUpFromLine className="h-4 w-4 mr-1.5" /> Send
              </Button>
              <Button variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30" onClick={() => setView("send")}>
                <ArrowDownToLine className="h-4 w-4 mr-1.5" /> Receive
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 card-lift">
          <div className="flex items-center justify-between mb-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-500">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs text-muted-foreground">This month</span>
          </div>
          <p className="text-xs text-muted-foreground">Money In</p>
          <p className="text-xl font-bold tabular-nums text-violet-600">{formatMoney(stats.monthIn, wallet.currency)}</p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="flex items-center justify-between mb-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
              <TrendingDown className="h-4 w-4" />
            </div>
            <span className="text-xs text-muted-foreground">This month</span>
          </div>
          <p className="text-xs text-muted-foreground">Money Out</p>
          <p className="text-xl font-bold tabular-nums text-rose-600">{formatMoney(stats.monthOut, wallet.currency)}</p>
        </Card>
        <Card className="p-5 card-lift">
          <div className="flex items-center justify-between mb-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <span className="text-xs text-muted-foreground">{stats.txCount} txns</span>
          </div>
          <p className="text-xs text-muted-foreground">Net Flow</p>
          <p className={cn("text-xl font-bold tabular-nums", stats.net >= 0 ? "text-violet-600" : "text-rose-600")}>
            {formatMoney(stats.net, wallet.currency)}
          </p>
        </Card>
      </div>

      {/* 7-day chart */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">7-Day Activity</h3>
            <p className="text-xs text-muted-foreground">Inflow vs outflow</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> In</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Out</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={series}>
            <defs>
              <linearGradient id="wIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: any) => formatMoney(Number(v), wallet.currency)} />
            <Area type="monotone" dataKey="in" stroke="#10b981" strokeWidth={2} fill="url(#wIn)" />
            <Area type="monotone" dataKey="out" stroke="#f43f5e" strokeWidth={2} fill="url(#wOut)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Transaction history */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Transaction History</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setView("transactions")}>
            View all <Download className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
        {transactions.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <WalletIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No transactions yet for this wallet</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setView("send")}>
              <Plus className="h-4 w-4 mr-1.5" /> Make first transaction
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.slice(0, 15).map((t: any) => {
              const Icon = TYPE_ICONS[t.type] || ArrowLeftRight;
              const isCredit = t.direction === "credit";
              return (
                <button
                  key={t.id}
                  onClick={() => setView("transactions")}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-muted/50"
                >
                  <div className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                    isCredit ? "bg-violet-500/15 text-violet-500" : "bg-rose-500/15 text-rose-500",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.counterpartyName || t.description}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.type} · {timeAgo(t.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold tabular-nums", isCredit ? "text-violet-600" : "")}>
                      {isCredit ? "+" : "-"}{formatMoney(t.amount, t.currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase">{t.status}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
