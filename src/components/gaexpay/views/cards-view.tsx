"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Snowflake, Eye, EyeOff, Settings2, Wifi, Copy,
  Lock, ChevronLeft, ChevronRight, ShieldCheck, Wallet,
  TrendingUp, CreditCard, KeyRound, SlidersHorizontal, Info,
  ArrowUpRight, ArrowDownRight, Receipt,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

// Premium card gradients — emerald-forward, NO blue/indigo
const CARD_GRADIENTS: Record<string, string> = {
  emerald: "from-emerald-700 via-emerald-800 to-teal-900",
  midnight: "from-slate-800 via-slate-900 to-black",
  sunset: "from-orange-500 via-rose-500 to-fuchsia-600",
  gold: "from-amber-400 via-yellow-500 to-orange-600",
  teal: "from-teal-600 via-emerald-700 to-emerald-900",
};

export function CardsView() {
  const { t } = useTranslation();
  const { data, reload } = useFetch<{ cards: any[] }>("/api/cards");
  const { data: txData } = useFetch<{ transactions: any[] }>("/api/transactions?limit=10");
  const [active, setActive] = useState(0);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [reveal, setReveal] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const cards = data?.cards ?? [];
  const card = cards[active];
  const cardTxs = (txData?.transactions ?? []).filter(
    (tx) => tx.cardId === card?.id || tx.metadata?.cardId === card?.id,
  ).slice(0, 5);

  const toggleFreeze = async (c: any) => {
    const newStatus = c.status === "active" ? "frozen" : "active";
    await fetch("/api/cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, status: newStatus }),
    });
    toast.success(newStatus === "frozen" ? "Card frozen" : "Card unfrozen");
    reload();
  };

  const addCard = async (form: any) => {
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.success("Card created");
    setAddOpen(false);
    reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("cards.title")}</h1>
          <p className="text-sm text-muted-foreground">Virtual & physical cards for every need</p>
        </div>
        <Button size="sm" className="rounded-xl shadow-premium-sm h-10" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Order Card
        </Button>
      </div>

      {/* Hero: active card */}
      <div>
        {cards.length === 0 && data === undefined ? (
          <Skeleton className="h-56 w-full max-w-md mx-auto rounded-3xl" />
        ) : cards.length === 0 ? (
          <Card className="mx-auto max-w-md p-8 text-center card-premium border-border/60 shadow-premium-md">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <p className="font-semibold">No cards yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Order your first virtual or physical card.</p>
            <Button className="rounded-xl shadow-premium-sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Order Card
            </Button>
          </Card>
        ) : (
          <div className="flex items-center gap-2">
            {cards.length > 1 && (
              <Button variant="outline" size="icon" className="rounded-full shrink-0 shadow-premium-sm" onClick={() => setActive((a) => (a - 1 + cards.length) % cards.length)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 overflow-hidden">
              <motion.div
                key={card?.id}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-md"
              >
                <CardDisplay card={card} reveal={reveal} />
              </motion.div>
            </div>
            {cards.length > 1 && (
              <Button variant="outline" size="icon" className="rounded-full shrink-0 shadow-premium-sm" onClick={() => setActive((a) => (a + 1) % cards.length)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Card thumbnails carousel */}
      {cards.length > 1 && (
        <div className="-mx-1">
          <div className="flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar snap-x">
            {cards.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActive(i)}
                className={cn(
                  "shrink-0 snap-start transition",
                  i === active && "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background rounded-2xl",
                )}
              >
                <CardDisplay card={c} reveal={false} small />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      {card && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            icon={<Wallet className="h-4 w-4" />}
            label="Balance"
            value={formatMoney(Math.max(0, card.limit - card.spending), card.currency)}
            tone="emerald"
          />
          <KpiCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Monthly limit"
            value={formatMoney(card.limit, card.currency)}
            tone="amber"
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Spent (MTD)"
            value={formatMoney(card.spending, card.currency)}
            tone="rose"
          />
        </div>
      )}

      {/* Card controls grid */}
      {card && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ControlButton
            icon={reveal ? EyeOff : Eye}
            label={reveal ? "Hide" : "Reveal"}
            tone="emerald"
            onClick={() => setReveal(!reveal)}
          />
          <ControlButton
            icon={Snowflake}
            label={card.status === "active" ? "Freeze" : "Unfreeze"}
            tone={card.status === "active" ? "rose" : "emerald"}
            active={card.status === "frozen"}
            onClick={() => toggleFreeze(card)}
          />
          <ControlButton
            icon={KeyRound}
            label="Set PIN"
            tone="amber"
            onClick={() => toast.info("PIN change requires 3D Secure verification")}
          />
          <ControlButton
            icon={Copy}
            label="Details"
            tone="teal"
            onClick={() => { navigator.clipboard?.writeText(card.maskedNumber.slice(-4)); toast.success("Card number copied"); }}
          />
        </div>
      )}

      {/* Spending overview + card controls */}
      {card && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2 card-premium border-border/60 shadow-premium-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Spending Overview</h3>
              <Badge variant="outline" className="rounded-full text-[10px] capitalize">{card.nickname}</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Monthly limit</span>
                  <span className="text-xs font-medium tabular-nums">
                    {formatMoney(card.spending, card.currency)} / {formatMoney(card.limit, card.currency)}
                  </span>
                </div>
                <Progress
                  value={Math.min((card.spending / card.limit) * 100, 100)}
                  className="h-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent this month</p>
                  <p className="text-xl font-bold tabular-nums">{formatMoney(card.spending, card.currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Available</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatMoney(Math.max(0, card.limit - card.spending), card.currency)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 card-premium border-border/60 shadow-premium-sm">
            <h3 className="font-semibold mb-3">Card Controls</h3>
            <div className="space-y-2.5">
              {[
                { label: "Online payments", on: true },
                { label: "Contactless / NFC", on: true },
                { label: "ATM withdrawals", on: card.type === "physical" },
                { label: "International", on: card.currency !== "NGN" },
                { label: "Auto-renew subscriptions", on: true },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-sm">{c.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-[10px] border-0",
                      c.on ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {c.on ? "On" : "Off"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Recent transactions for this card */}
      {card && (
        <Card className="p-5 card-premium border-border/60 shadow-premium-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Transactions</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">{cardTxs.length} on this card</Badge>
          </div>
          {cardTxs.length === 0 ? (
            <div className="grid place-items-center py-6 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted mb-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions on this card yet</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {cardTxs.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Security note */}
      <Card className="flex items-center gap-4 border-emerald-500/30 bg-emerald-500/5 p-5 card-premium">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">PCI-DSS Compliant & 3D Secure</p>
          <p className="text-xs text-muted-foreground">All card data is tokenized and encrypted end-to-end. We never store raw card numbers.</p>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <NewCardDialog onSubmit={addCard} />
      </Dialog>
    </div>
  );
}

function CardDisplay({ card, reveal, small }: { card: any; reveal: boolean; small?: boolean }) {
  if (!card) return null;
  const gradient = CARD_GRADIENTS[card.color] || CARD_GRADIENTS.emerald;
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-premium-xl",
      gradient,
      small ? "h-36 w-56" : "h-56",
      // Subtle emerald accent edge
      "ring-1 ring-white/10",
    )}>
      {/* Emerald edge glow */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-emerald-400/20 pointer-events-none" />
      {/* Ambient blurs */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
      <div className="absolute right-10 top-12 h-16 w-16 rounded-full bg-white/5 blur-xl" />
      {/* Hologram shimmer */}
      <div className="absolute right-4 top-4 h-8 w-12 rounded-md bg-gradient-to-br from-emerald-300/40 via-transparent to-amber-300/30 backdrop-blur-sm" />
      {card.status === "frozen" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/40 backdrop-blur-sm rounded-3xl">
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur">
            <Snowflake className="h-4 w-4" /> Frozen
          </div>
        </div>
      )}
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn("font-semibold", small ? "text-xs" : "text-sm")}>{card.nickname}</p>
            <p className="text-[10px] text-white/60 capitalize">{card.type} · {card.brand}</p>
          </div>
          <Wifi className={cn("rotate-90 text-white/60", small ? "h-4 w-4" : "h-5 w-5")} />
        </div>
        {/* chip */}
        <div className={cn(
          "rounded-md bg-gradient-to-br from-amber-200 to-yellow-400 shadow-inner",
          small ? "h-5 w-7" : "h-7 w-10",
        )}>
          <div className="h-full w-full rounded-md bg-[linear-gradient(135deg,transparent_45%,rgba(255,255,255,0.4)_50%,transparent_55%)]" />
        </div>
        <div>
          <p className={cn("font-mono tracking-widest tabular-nums", small ? "text-sm" : "text-lg")}>
            {reveal ? `4827 3344 1290 ${card.maskedNumber.slice(-4)}` : card.maskedNumber}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div className="min-w-0">
              <p className="text-[10px] text-white/60 uppercase">Card Holder</p>
              <p className={cn("font-medium truncate", small ? "text-[10px]" : "text-xs")}>{card.holderName}</p>
            </div>
            <div className="px-2">
              <p className="text-[10px] text-white/60 uppercase">Expires</p>
              <p className={cn("font-medium tabular-nums", small ? "text-[10px]" : "text-xs")}>{card.expiryMonth}/{card.expiryYear}</p>
            </div>
            <span className={cn("font-bold italic tracking-tight", small ? "text-xs" : "text-base")}>
              {card.brand === "visa" ? "VISA" : card.brand === "mastercard" ? "Mastercard" : "verve"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "amber" | "rose" }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/15 text-rose-500",
  };
  return (
    <Card className="p-3 sm:p-4 card-premium border-border/60 shadow-premium-sm card-lift">
      <div className={cn("grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-lg mb-2", tones[tone])}>
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm sm:text-base font-bold tabular-nums truncate">{value}</p>
    </Card>
  );
}

function ControlButton({ icon: Icon, label, onClick, tone, active }: { icon: any; label: string; onClick: () => void; tone: "emerald" | "rose" | "amber" | "teal"; active?: boolean }) {
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/15 text-rose-500",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    teal: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-2xl border p-4 transition card-lift",
        active
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border/60 hover:border-primary/40 hover:bg-muted/30",
      )}
    >
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function TxRow({ tx }: { tx: any }) {
  const isCredit = tx.direction === "credit";
  const Icon = isCredit ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-muted/60">
      <div className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full",
        isCredit ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-500",
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{tx.counterpartyName || tx.description}</p>
        <p className="text-xs text-muted-foreground capitalize truncate">
          {tx.type} · {timeAgo(tx.createdAt)}
        </p>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-semibold tabular-nums", isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>
          {isCredit ? "+" : "-"}{formatMoney(tx.amount, tx.currency)}
        </p>
        <span className={cn(
          "inline-block rounded-full px-1.5 py-0.5 text-[9px] uppercase",
          tx.status === "completed" ? "pill-success" : tx.status === "pending" ? "pill-warning" : "pill-danger",
        )}>
          {tx.status}
        </span>
      </div>
    </div>
  );
}

function NewCardDialog({ onSubmit }: { onSubmit: (f: any) => void }) {
  const [type, setType] = useState("virtual");
  const [brand, setBrand] = useState("visa");
  const [color, setColor] = useState("emerald");
  const [nickname, setNickname] = useState("GaexPay Card");
  const [currency, setCurrency] = useState("NGN");
  const [limit, setLimit] = useState("200000");
  return (
    <DialogContent className="sm:rounded-3xl shadow-premium-xl">
      <DialogHeader>
        <DialogTitle>Issue New Card</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-2">
          <Label className="text-xs">Card Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Brand</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="visa">Visa</SelectItem>
              <SelectItem value="mastercard">Mastercard</SelectItem>
              <SelectItem value="verve">Verve</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">NGN</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Color</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="emerald">Emerald</SelectItem>
              <SelectItem value="midnight">Midnight</SelectItem>
              <SelectItem value="sunset">Sunset</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="teal">Teal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-xs">Nickname</Label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-2">
          <Label className="text-xs">Monthly Limit (₦)</Label>
          <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button className="rounded-xl shadow-premium-sm" onClick={() => onSubmit({ type, brand, color, nickname, currency, limit: Number(limit) })}>Issue Card</Button>
      </DialogFooter>
    </DialogContent>
  );
}
