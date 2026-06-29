"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Snowflake, Eye, EyeOff, Settings2, Trash2, Wifi, Copy, Check,
  Lock, ChevronLeft, ChevronRight, ShoppingCart, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/gaexpay";
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

const CARD_GRADIENTS: Record<string, string> = {
  emerald: "from-violet-600 via-purple-600 to-violet-800",
  midnight: "from-slate-800 via-slate-900 to-black",
  sunset: "from-orange-500 via-rose-500 to-fuchsia-600",
  ocean: "from-purple-500 via-blue-600 to-indigo-700",
  gold: "from-amber-400 via-yellow-500 to-orange-600",
};

export function CardsView() {
  const { t } = useTranslation();
  const { data, reload } = useFetch<{ cards: any[] }>("/api/cards");
  const [active, setActive] = useState(0);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [reveal, setReveal] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const cards = data?.cards ?? [];
  const card = cards[active];

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("cards.title")}</h1>
          <p className="text-sm text-muted-foreground">Virtual & physical cards for every need</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Card</Button>
      </div>

      {/* Card carousel */}
      <div className="relative">
        {cards.length === 0 ? (
          <Skeleton className="h-56 w-full max-w-md" />
        ) : (
          <div className="flex items-center gap-2">
            {cards.length > 1 && (
              <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setActive((a) => (a - 1 + cards.length) % cards.length)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1 overflow-hidden">
              <motion.div
                key={card?.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto max-w-md"
              >
                <CardDisplay card={card} reveal={reveal} />
              </motion.div>
            </div>
            {cards.length > 1 && (
              <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setActive((a) => (a + 1) % cards.length)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Card selector dots */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActive(i)}
              className={cn("h-2 rounded-full transition-all", i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30")}
            />
          ))}
        </div>
      )}

      {/* Card actions */}
      {card && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ActionButton icon={reveal ? EyeOff : Eye} label={reveal ? "Hide" : "Reveal"} onClick={() => setReveal(!reveal)} />
          <ActionButton icon={Snowflake} label={card.status === "active" ? "Freeze" : "Unfreeze"} onClick={() => toggleFreeze(card)} danger={card.status === "active"} />
          <ActionButton icon={Settings2} label="Settings" onClick={() => toast.info("Card settings coming soon")} />
          <ActionButton icon={Copy} label="Details" onClick={() => { navigator.clipboard?.writeText(card.maskedNumber.slice(-4)); toast.success("Card number copied"); }} />
        </div>
      )}

      {/* Spending & limits */}
      {card && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold mb-4">Spending Overview — {card.nickname}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">Monthly limit</span>
                  <span className="text-sm font-medium tabular-nums">{formatMoney(card.spending, card.currency)} / {formatMoney(card.limit, card.currency)}</span>
                </div>
                <Progress value={(card.spending / card.limit) * 100} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Spent this month</p>
                  <p className="text-xl font-bold tabular-nums">{formatMoney(card.spending, card.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-xl font-bold tabular-nums text-violet-600">{formatMoney(Math.max(0, card.limit - card.spending), card.currency)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
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
                  <Badge variant={c.on ? "default" : "secondary"} className="text-[10px]">
                    {c.on ? "On" : "Off"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* All cards grid */}
      <div>
        <h3 className="font-semibold mb-3">All Cards ({cards.length})</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <button key={c.id} onClick={() => setActive(i)} className="text-left">
              <CardDisplay card={c} reveal={false} small />
            </button>
          ))}
        </div>
      </div>

      {/* Security note */}
      <Card className="flex items-center gap-4 border-violet-500/30 bg-violet-500/5 p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-500">
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
      "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-xl",
      gradient,
      small ? "h-36" : "h-52",
    )}>
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute right-10 top-12 h-16 w-16 rounded-full bg-white/5 blur-xl" />
      {card.status === "frozen" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur">
            <Snowflake className="h-4 w-4" /> Frozen
          </div>
        </div>
      )}
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn("font-semibold", small ? "text-xs" : "text-sm")}>{card.nickname}</p>
            <p className="text-xs text-white/60 capitalize">{card.type} · {card.brand}</p>
          </div>
          <Wifi className={cn("rotate-90 text-white/60", small ? "h-4 w-4" : "h-5 w-5")} />
        </div>
        {/* chip */}
        <div className={cn("rounded-md bg-gradient-to-br from-amber-200 to-yellow-400", small ? "h-5 w-7" : "h-7 w-10")} />
        <div>
          <p className={cn("font-mono tracking-widest", small ? "text-sm" : "text-lg")}>
            {reveal ? `4827 3344 1290 ${card.maskedNumber.slice(-4)}` : card.maskedNumber}
          </p>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="text-[10px] text-white/60 uppercase">Card Holder</p>
              <p className={cn("font-medium", small ? "text-[10px]" : "text-xs")}>{card.holderName}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/60 uppercase">Expires</p>
              <p className={cn("font-medium", small ? "text-[10px]" : "text-xs")}>{card.expiryMonth}/{card.expiryYear}</p>
            </div>
            <span className={cn("font-bold italic", small ? "text-xs" : "text-sm")}>{card.brand === "visa" ? "VISA" : card.brand === "mastercard" ? "Mastercard" : "verve"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 transition hover:bg-muted/50",
        danger && "hover:border-rose-500/40 hover:bg-rose-500/5",
      )}
    >
      <Icon className={cn("h-5 w-5", danger ? "text-rose-500" : "text-primary")} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function NewCardDialog({ onSubmit }: { onSubmit: (f: any) => void }) {
  const [type, setType] = useState("virtual");
  const [brand, setBrand] = useState("visa");
  const [color, setColor] = useState("violet");
  const [nickname, setNickname] = useState("GaexPay Card");
  const [currency, setCurrency] = useState("NGN");
  const [limit, setLimit] = useState("200000");
  return (
    <DialogContent>
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
              <SelectItem value="violet">Emerald</SelectItem>
              <SelectItem value="midnight">Midnight</SelectItem>
              <SelectItem value="sunset">Sunset</SelectItem>
              <SelectItem value="ocean">Ocean</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
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
        <Button onClick={() => onSubmit({ type, brand, color, nickname, currency, limit: Number(limit) })}>Issue Card</Button>
      </DialogFooter>
    </DialogContent>
  );
}
