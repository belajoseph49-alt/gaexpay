"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plane, Plus, Globe, Loader2, Lock, Unlock, ArrowRight, Trash2,
  Wallet, TrendingUp, MapPin, Sparkles, Check, Copy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

export function TravelWalletView() {
  const { t } = useTranslation();
  const { fmtRaw } = useFormatMoney();
  const { data, reload, loading } = useFetch<{
    destinations: any[];
    supportedCountries: any[];
  }>("/api/travel-wallet");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [budget, setBudget] = useState("");
  const [convertDialog, setConvertDialog] = useState<any>(null);
  const [convertAmount, setConvertAmount] = useState("");
  const [converting, setConverting] = useState(false);

  const destinations = data?.destinations ?? [];
  const supported = data?.supportedCountries ?? [];

  const addDestination = async () => {
    if (!selectedCountry) {
      toast.error("Select a destination");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/travel-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", countryCode: selectedCountry, budget: budget ? Number(budget) : undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add destination");
        return;
      }
      toast.success("Destination added");
      setOpen(false);
      setSelectedCountry("");
      setBudget("");
      reload();
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  };

  const lockRate = async (id: string) => {
    try {
      const res = await fetch("/api/travel-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock", destinationId: id }),
      });
      if (res.ok) {
        toast.success("Rate locked for 24 hours 🔒");
        reload();
      } else {
        const j = await res.json();
        toast.error(j.error || "Failed to lock rate");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const convert = async () => {
    const amt = Number(convertAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setConverting(true);
    try {
      const res = await fetch("/api/travel-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convert", destinationId: convertDialog.id, amount: amt }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Conversion failed");
        return;
      }
      toast.success(`Converted ${formatMoney(amt, "USD")} → ${formatMoney(json.convertedAmount, convertDialog.currency)}`);
      setConvertDialog(null);
      setConvertAmount("");
      reload();
    } catch {
      toast.error("Network error");
    } finally {
      setConverting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch("/api/travel-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", destinationId: id }),
      });
      toast.success("Destination removed");
      reload();
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Travel Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Spend in local currency anywhere — auto-converted from your stablecoins.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Destination
        </Button>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 text-3xl backdrop-blur">
              ✈️
            </div>
            <div>
              <h3 className="font-bold">One wallet. Every country.</h3>
              <p className="text-xs text-white/70">
                Add a destination, lock the rate, and spend like a local — no foreign-transaction fees.
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-0 hidden sm:inline-flex">
            <Globe className="h-3 w-3 mr-1" /> {supported.length} countries
          </Badge>
        </div>
      </Card>

      {/* Destinations */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : destinations.length === 0 ? (
        <Card className="p-10 text-center">
          <Plane className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold mb-1">No destinations yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first destination to start spending in local currency.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Destination
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {destinations.map((d, i) => {
            const rate = d.lockedRate ?? d.exchangeRate;
            const budgetProgress = d.budget ? Math.min(100, (d.spent / d.budget) * 100) : 0;
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="relative overflow-hidden p-5 card-lift">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{d.flag}</span>
                      <div>
                        <h3 className="font-semibold">{d.countryName}</h3>
                        <p className="text-xs text-muted-foreground">
                          1 USD = {rate.toFixed(rate < 10 ? 4 : 2)} {d.currency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {d.lockedRate ? (
                        <Badge className="bg-violet-500/15 text-violet-600 border-0">
                          <Lock className="h-3 w-3 mr-1" /> Rate locked
                        </Badge>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => lockRate(d.id)} className="h-7 text-xs">
                          <Unlock className="h-3 w-3 mr-1" /> Lock rate
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(d.id)} className="h-7 w-7 p-0">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {/* Budget tracker */}
                  {d.budget ? (
                    <div className="mb-3 rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">Budget used</span>
                        <span className="text-xs font-medium tabular-nums">
                          {formatMoney(d.spent, "USD")} / {formatMoney(d.budget, "USD")}
                        </span>
                      </div>
                      <Progress value={budgetProgress} className="h-2" />
                    </div>
                  ) : (
                    <div className="mb-3 rounded-lg bg-muted/40 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Spent so far</p>
                      <p className="text-lg font-bold tabular-nums">{formatMoney(d.spent, "USD")}</p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600"
                    onClick={() => setConvertDialog(d)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-1" /> Convert to {d.currency}
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Supported countries table */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Supported Countries & Rates</h3>
            <p className="text-xs text-muted-foreground">Live USD → local currency exchange rates</p>
          </div>
          <Badge variant="outline" className="text-violet-600 border-violet-500/30">
            <TrendingUp className="h-3 w-3 mr-1" /> {supported.length} currencies
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto pr-2">
          {supported.map((c) => (
            <div key={c.code} className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.currency}</p>
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {c.exchangeRate.toFixed(c.exchangeRate < 10 ? 4 : 2)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Add destination dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Travel Destination</DialogTitle>
            <DialogDescription>
              Pick a country to enable spending in its local currency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {supported.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name} · {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Travel budget (USD, optional)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="1000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="rounded-lg bg-violet-500/10 p-3 text-xs text-violet-700 dark:text-violet-300 flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Lock your exchange rate for 24 hours to protect against FX volatility while traveling.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addDestination} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Add Destination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={!!convertDialog} onOpenChange={(o) => !o && setConvertDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convert USD → {convertDialog?.currency}</DialogTitle>
            <DialogDescription>
              Auto-convert from your USD stablecoin balance. Rate: 1 USD = {(convertDialog?.lockedRate ?? convertDialog?.exchangeRate).toFixed(4)} {convertDialog?.currency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount in USD</Label>
              <Input
                type="number"
                placeholder="100"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
              />
            </div>
            {convertAmount && convertDialog && (
              <div className="rounded-lg bg-violet-500/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">You'll receive</p>
                <p className="text-xl font-bold tabular-nums">
                  {formatMoney(Number(convertAmount) * (convertDialog.lockedRate ?? convertDialog.exchangeRate), convertDialog.currency)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialog(null)}>Cancel</Button>
            <Button onClick={convert} disabled={converting}>
              {converting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1.5" />}
              Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
