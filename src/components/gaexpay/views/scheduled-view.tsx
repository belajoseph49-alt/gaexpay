"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Calendar, Clock, Repeat, Pause, Play, Trash2, ChevronRight,
  Landmark, Smartphone, Wallet as WalletIcon, CreditCard, Check, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDate, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const METHOD_ICONS: Record<string, any> = {
  bank: Landmark, momo: Smartphone, wallet: WalletIcon, card: CreditCard,
};

const FREQUENCY_LABELS: Record<string, string> = {
  once: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function ScheduledView() {
  const { data, reload } = useFetch<{ transfers: any[]; totalMonthly: number }>("/api/scheduled-transfers");
  const [open, setOpen] = useState(false);

  const transfers = data?.transfers ?? [];
  const totalMonthly = data?.totalMonthly ?? 0;
  const active = transfers.filter((t) => t.status === "active");

  const addTransfer = async (form: any) => {
    await fetch("/api/scheduled-transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.success("Scheduled transfer created");
    setOpen(false);
    reload();
  };

  const togglePause = async (t: any) => {
    const newStatus = t.status === "paused" ? "active" : "paused";
    await fetch("/api/scheduled-transfers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, status: newStatus }),
    });
    toast.success(newStatus === "paused" ? "Transfer paused" : "Transfer resumed");
    reload();
  };

  const deleteTransfer = async (id: string) => {
    await fetch(`/api/scheduled-transfers?id=${id}`, { method: "DELETE" });
    toast.success("Scheduled transfer deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scheduled Transfers</h1>
          <p className="text-sm text-muted-foreground">Automate recurring payments & transfers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> Schedule Transfer</Button>
          </DialogTrigger>
          <NewScheduleDialog onSubmit={addTransfer} />
        </Dialog>
      </div>

      {/* Hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="h-5 w-5" />
              <span className="text-sm font-medium text-white/90">Monthly Recurring</span>
            </div>
            <h2 className="text-3xl font-bold tabular-nums">
              <AnimatedNumber value={totalMonthly} prefix="₦" decimals={2} />
            </h2>
            <p className="mt-1 text-sm text-white/80">Total scheduled per month</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Active Schedules</p>
            <p className="text-3xl font-bold">{active.length}</p>
            <p className="text-xs text-white/70 mt-1">{transfers.length} total</p>
          </div>
        </div>
      </Card>

      {/* Next run banner */}
      {active.length > 0 && (
        <Card className="flex items-center gap-4 border-amber-500/30 bg-amber-500/5 p-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Next scheduled transfer</h3>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{active[0].recipientName}</span> ·{" "}
              {formatMoney(active[0].amount, active[0].currency)} ·{" "}
              {formatDate(active[0].nextRunAt)}
            </p>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-500/30">
            in {Math.ceil((new Date(active[0].nextRunAt).getTime() - Date.now()) / 86400000)} days
          </Badge>
        </Card>
      )}

      {/* List */}
      <Card className="p-3">
        <div className="px-2 py-1.5 flex items-center justify-between">
          <h3 className="font-semibold text-sm">All Scheduled Transfers</h3>
          <Badge variant="outline">{transfers.length}</Badge>
        </div>
        <div className="space-y-1">
          {transfers.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
          {transfers.map((t, i) => {
            const Icon = METHOD_ICONS[t.method] || WalletIcon;
            const daysToNext = Math.ceil((new Date(t.nextRunAt).getTime() - Date.now()) / 86400000);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/30",
                  t.status === "paused" && "opacity-60",
                )}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{t.recipientName}</p>
                    <Badge variant="outline" className="text-[10px]">{FREQUENCY_LABELS[t.frequency]}</Badge>
                    {t.status === "paused" && <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Paused</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.recipientBank} · {t.note}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Next: {formatDate(t.nextRunAt)} {t.status === "active" && daysToNext >= 0 && `(${daysToNext}d)`}
                    </span>
                    <span>Last: {t.lastRunAt ? timeAgo(t.lastRunAt) : "never"}</span>
                    <span>{t.totalRuns} runs</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums">{formatMoney(t.amount, t.currency)}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{t.method}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePause(t)}>
                    {t.status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10" onClick={() => deleteTransfer(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Info note */}
      <Card className="flex items-start gap-3 border-sky-500/30 bg-sky-500/5 p-4">
        <AlertCircle className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">How scheduled transfers work</p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll automatically process your transfer on the scheduled date. You'll receive a notification before each run.
            Funds must be available in your wallet. You can pause or cancel anytime.
          </p>
        </div>
      </Card>
    </div>
  );
}

function NewScheduleDialog({ onSubmit }: { onSubmit: (f: any) => void }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccount, setRecipientAccount] = useState("");
  const [recipientBank, setRecipientBank] = useState("Access Bank");
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextRunAt, setNextRunAt] = useState("");
  const [note, setNote] = useState("");

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Schedule New Transfer</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Recipient Name</Label>
          <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="e.g. John Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Account / Number</Label>
            <Input value={recipientAccount} onChange={(e) => setRecipientAccount(e.target.value)} placeholder="0123456789" />
          </div>
          <div className="space-y-2">
            <Label>Bank / Provider</Label>
            <Select value={recipientBank} onValueChange={setRecipientBank}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Access Bank", "GTBank", "Zenith Bank", "UBA", "First Bank", "MTN MoMo", "Orange Money", "Airtel Money", "GaexPay"].map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="momo">Mobile Money</SelectItem>
                <SelectItem value="wallet">GaexPay Wallet</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">One-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Amount (₦)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>First Run Date</Label>
            <Input type="date" value={nextRunAt} onChange={(e) => setNextRunAt(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Monthly rent" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ recipientName, recipientAccount, recipientBank, method, amount: Number(amount), frequency, nextRunAt, note })}>
          Schedule Transfer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
