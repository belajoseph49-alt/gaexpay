"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, ArrowUpDown, Eye, EyeOff, TrendingUp, Download, ArrowRightLeft,
  Wallet as WalletIcon, ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, CURRENCIES } from "@/lib/gaexpay";
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

const WALLET_GRADIENTS: Record<string, string> = {
  NGN: "from-emerald-600 to-teal-700",
  USD: "from-slate-700 to-slate-900",
  EUR: "from-blue-600 to-indigo-800",
  GBP: "from-purple-700 to-fuchsia-900",
  GHS: "from-amber-600 to-orange-700",
  KES: "from-rose-600 to-pink-700",
};

export function WalletsView() {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
          <p className="text-sm text-muted-foreground">Manage your multi-currency balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("analytics")}>
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Exchange
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Add Wallet</Button>
            </DialogTrigger>
            <AddWalletDialog onSubmit={addWallet} />
          </Dialog>
        </div>
      </div>

      {/* Total balance banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">Total Portfolio Value</p>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-3xl font-bold tabular-nums">{hidden ? "₦ • • • •" : fmt(totalNGN)}</h2>
              <button onClick={() => setHidden(!hidden)} className="text-white/70 hover:text-white">
                {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
              <TrendingUp className="h-4 w-4" /> +12.4% this month
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30" onClick={() => setView("send")}>
              <Download className="h-4 w-4 mr-1.5" /> Top Up
            </Button>
            <Button variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur hover:bg-white/30" onClick={() => setView("send")}>
              <ArrowUpDown className="h-4 w-4 mr-1.5" /> Transfer
            </Button>
          </div>
        </div>
      </Card>

      {/* Wallet cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        {wallets.map((w, i) => {
          const gradient = WALLET_GRADIENTS[w.currency] || "from-emerald-600 to-teal-700";
          const flag = CURRENCIES.find((c) => c.code === w.currency)?.flag || "🌍";
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={cn("group relative h-48 cursor-pointer overflow-hidden border-0 bg-gradient-to-br p-5 text-white shadow-lg card-lift", gradient)}
                onClick={() => openWallet(w.id)}
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{flag}</span>
                      <div>
                        <p className="font-semibold leading-tight">{w.label}</p>
                        <p className="text-xs text-white/70">{w.currency} · {w.type}</p>
                      </div>
                    </div>
                    {w.isDefault && <Badge className="bg-white/20 text-white border-0">Default</Badge>}
                  </div>
                  <div>
                    <p className="text-xs text-white/70">Available balance</p>
                    <p className="text-2xl font-bold tabular-nums">{formatMoney(w.balance, w.currency)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">•••• {w.id.slice(-4)}</span>
                    <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/20 border-0 backdrop-blur hover:bg-white/30" onClick={(e) => { e.stopPropagation(); setView("send"); }}>
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/20 border-0 backdrop-blur hover:bg-white/30" onClick={(e) => { e.stopPropagation(); openWallet(w.id); }}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Exchange rates table */}
      <Card className="p-5">
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
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Pair</th>
                <th className="pb-2 font-medium text-right">Buy</th>
                <th className="pb-2 font-medium text-right">Sell</th>
                <th className="pb-2 font-medium text-right">Rate</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {ratesData?.rates?.slice(0, 8).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{r.base}/{r.quote}</td>
                  <td className="py-2.5 text-right tabular-nums text-emerald-600">{r.buy.toFixed(4)}</td>
                  <td className="py-2.5 text-right tabular-nums text-rose-600">{r.sell.toFixed(4)}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.rate.toFixed(4)}</td>
                  <td className="py-2.5 text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setView("analytics")}>
                      Convert <ChevronRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AddWalletDialog({ onSubmit }: { onSubmit: (form: any) => void }) {
  const [currency, setCurrency] = useState("USD");
  const [label, setLabel] = useState("USD Wallet");
  const [type, setType] = useState("primary");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Wallet</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => { setCurrency(v); setLabel(`${v} Wallet`); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ currency, label, type })}>Create Wallet</Button>
      </DialogFooter>
    </DialogContent>
  );
}
