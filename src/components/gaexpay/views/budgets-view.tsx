"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, Wallet,
  PiggyBank, ShoppingBag, Utensils, Car, Film, Zap, Heart,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";

const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  "Food & Dining": { icon: Utensils, color: "bg-amber-500/15 text-amber-500" },
  "Transport": { icon: Car, color: "bg-sky-500/15 text-sky-500" },
  "Shopping": { icon: ShoppingBag, color: "bg-violet-500/15 text-violet-500" },
  "Bills & Utilities": { icon: Zap, color: "bg-emerald-500/15 text-emerald-500" },
  "Entertainment": { icon: Film, color: "bg-rose-500/15 text-rose-500" },
  "Health": { icon: Heart, color: "bg-teal-500/15 text-teal-500" },
  "general": { icon: Wallet, color: "bg-slate-500/15 text-slate-500" },
};

const CATEGORIES = ["Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Health"];

export function BudgetsView() {
  const { data, reload } = useFetch<{ budgets: any[]; totalLimit: number; totalSpent: number }>("/api/budgets");
  const [open, setOpen] = useState(false);
  const { fmt, symbol, currency: userCur } = useFormatMoney();

  const budgets = data?.budgets ?? [];
  const totalLimit = data?.totalLimit ?? 0;
  const totalSpent = data?.totalSpent ?? 0;
  const totalRemaining = totalLimit - totalSpent;
  const overallPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  const addBudget = async (form: any) => {
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.success(`Budget for ${form.category} created`);
    setOpen(false);
    reload();
  };

  const deleteBudget = async (id: string) => {
    await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
    toast.success("Budget deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">Track spending limits by category</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Budget</Button>
          </DialogTrigger>
          <NewBudgetDialog onSubmit={addBudget} />
        </Dialog>
      </div>

      {/* Overall budget hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5" />
              <span className="text-sm font-medium text-white/90">Total Monthly Budget</span>
            </div>
            <h2 className="text-3xl font-bold tabular-nums">
              <AnimatedNumber value={totalSpent} prefix={symbol} decimals={2} />
            </h2>
            <p className="mt-1 text-sm text-white/80">
              spent of <span className="font-semibold">{fmt(totalLimit)}</span> · {overallPct.toFixed(1)}% used
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Remaining</p>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedNumber value={Math.max(0, totalRemaining)} prefix={symbol} decimals={2} />
            </p>
            <p className="text-xs text-white/70 mt-1">{budgets.length} active budgets</p>
          </div>
        </div>
        <Progress value={overallPct} className="mt-4 h-2 bg-white/20" />
      </Card>

      {/* Insights */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InsightCard
          icon={TrendingUp}
          label="On Track"
          value={String(budgets.filter((b) => (b.spent / b.limit) * 100 < 80).length)}
          subtitle="budgets under 80%"
          color="bg-emerald-500/15 text-emerald-500"
        />
        <InsightCard
          icon={AlertTriangle}
          label="Near Limit"
          value={String(budgets.filter((b) => { const p = (b.spent / b.limit) * 100; return p >= 80 && p < 100; }).length)}
          subtitle="budgets at 80-100%"
          color="bg-amber-500/15 text-amber-500"
        />
        <InsightCard
          icon={TrendingDown}
          label="Over Budget"
          value={String(budgets.filter((b) => b.spent > b.limit).length)}
          subtitle="budgets exceeded"
          color="bg-rose-500/15 text-rose-500"
        />
      </div>

      {/* Budget cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {budgets.length === 0 && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
        {budgets.map((b, i) => {
          const pct = (b.spent / b.limit) * 100;
          const remaining = b.limit - b.spent;
          const meta = CATEGORY_META[b.category] || CATEGORY_META.general;
          const Icon = meta.icon;
          const isOver = pct > 100;
          const isWarning = pct >= 80 && pct < 100;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group p-5 card-lift">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("grid h-11 w-11 place-items-center rounded-lg", meta.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{b.category}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{b.period} budget</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOver && <Badge className="bg-rose-500/15 text-rose-600 border-0 text-[10px]">Over</Badge>}
                    {isWarning && <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Warning</Badge>}
                    {!isOver && !isWarning && <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">On Track</Badge>}
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition" onClick={() => deleteBudget(b.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-2xl font-bold tabular-nums">
                    <AnimatedNumber value={b.spent} prefix={symbol} decimals={2} />
                  </span>
                  <span className="text-sm text-muted-foreground">/ {fmt(b.limit)}</span>
                </div>

                <Progress
                  value={Math.min(pct, 100)}
                  className={cn("h-2.5", isOver && "[&>div]:bg-rose-500", isWarning && "[&>div]:bg-amber-500")}
                />

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={cn("font-medium", isOver ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600")}>
                    {pct.toFixed(1)}% used
                  </span>
                  <span className="text-muted-foreground">
                    {remaining >= 0 ? `${fmt(remaining)} left` : `${formatMoney(Math.abs(remaining), "NGN")} over`}
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tip */}
      <Card className="flex items-center gap-4 border-primary/30 bg-primary/5 p-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <PiggyBank className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Smart Budget Tip</h3>
          <p className="text-xs text-muted-foreground">
            You've spent {overallPct.toFixed(0)}% of your total monthly budget. Consider moving{" "}
            {formatMoney(Math.max(0, totalLimit * 0.1), "NGN")} to savings to stay on track.
          </p>
        </div>
        <Button size="sm" variant="outline">Apply</Button>
      </Card>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, subtitle, color }: any) {
  return (
    <Card className="p-5 card-lift">
      <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </Card>
  );
}

function NewBudgetDialog({ onSubmit }: { onSubmit: (f: any) => void }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [period, setPeriod] = useState("monthly");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create Budget</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Monthly Limit (₦)</Label>
          <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="50000" />
        </div>
        <div className="space-y-2">
          <Label>Period</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ category, limit: Number(limit), period })}>Create Budget</Button>
      </DialogFooter>
    </DialogContent>
  );
}
