"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Target, TrendingUp, Wallet, PiggyBank, Calendar, ChevronRight,
  Pause, Play, Check, X, ArrowDownToLine, ArrowUpFromLine, Sparkles, Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFetch } from "@/hooks/use-fetch";
import { formatMoney, formatDate, timeAgo } from "@/lib/gaexpay";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedNumber } from "@/components/gaexpay/animated-number";
import { Confetti } from "@/components/gaexpay/confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOAL_ICONS = ["🎯", "✈️", "💻", "🏠", "🚗", "💍", "🎓", "🛡️", "📱", "🎁", "🏖️", "💼"];
const GOAL_COLORS = [
  { id: "emerald", class: "from-emerald-500 to-teal-600" },
  { id: "sky", class: "from-sky-500 to-blue-600" },
  { id: "violet", class: "from-violet-500 to-purple-600" },
  { id: "rose", class: "from-rose-500 to-pink-600" },
  { id: "amber", class: "from-amber-500 to-orange-600" },
  { id: "teal", class: "from-teal-500 to-cyan-600" },
];

export function SavingsView() {
  const { data, reload } = useFetch<{ goals: any[]; totalSaved: number; totalTarget: number }>("/api/savings-goals");
  const [open, setOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<any>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  const goals = data?.goals ?? [];
  const totalSaved = data?.totalSaved ?? 0;
  const totalTarget = data?.totalTarget ?? 0;
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const addGoal = async (form: any) => {
    await fetch("/api/savings-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.success(`Goal "${form.name}" created`);
    setOpen(false);
    reload();
  };

  const contribute = async (goalId: string, amount: number, type: "deposit" | "withdrawal") => {
    const goal = goals.find((g) => g.id === goalId);
    const res = await fetch("/api/savings-goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contribution: true, goalId, amount, type }),
    });
    const data2 = await res.json();
    if (type === "deposit" && goal && data2.goal?.status === "completed" && goal.status !== "completed") {
      setCelebration(goal.name);
      setTimeout(() => setCelebration(null), 4000);
      toast.success(`🎉 Goal "${goal.name}" completed! Congratulations!`);
    } else {
      toast.success(type === "deposit" ? `Added ${formatMoney(amount, "NGN")}` : `Withdrew ${formatMoney(amount, "NGN")}`);
    }
    setContributeGoal(null);
    reload();
  };

  const togglePause = async (g: any) => {
    const newStatus = g.status === "paused" ? "active" : "paused";
    await fetch("/api/savings-goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: g.id, status: newStatus }),
    });
    toast.success(newStatus === "paused" ? "Goal paused" : "Goal resumed");
    reload();
  };

  return (
    <div className="space-y-6">
      <Confetti trigger={!!celebration} count={120} />
      {celebration && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-1/2 left-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-0 bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-center text-white shadow-2xl"
        >
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold">Goal Completed!</h2>
          <p className="mt-1 text-white/80">You've reached your "{celebration}" target!</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-amber-300">
            <Award className="h-5 w-5" />
            <span className="text-sm font-medium">Achievement Unlocked</span>
          </div>
        </motion.div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Savings Goals</h1>
          <p className="text-sm text-muted-foreground">Save towards your dreams, automatically</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Goal</Button>
          </DialogTrigger>
          <NewGoalDialog onSubmit={addGoal} />
        </Dialog>
      </div>

      {/* Total saved hero */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-5 w-5" />
              <span className="text-sm font-medium text-white/90">Total Saved</span>
            </div>
            <h2 className="text-3xl font-bold tabular-nums">
              <AnimatedNumber value={totalSaved} prefix="₦" decimals={2} />
            </h2>
            <p className="mt-1 text-sm text-white/80">
              of <span className="font-semibold">{formatMoney(totalTarget, "NGN")}</span> target · {overallProgress.toFixed(1)}% complete
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Active Goals</p>
            <p className="text-3xl font-bold">{goals.filter((g) => g.status === "active").length}</p>
            <p className="text-xs text-white/70 mt-1">Completed: {goals.filter((g) => g.status === "completed").length}</p>
          </div>
        </div>
        <Progress value={overallProgress} className="mt-4 h-2 bg-white/20" />
      </Card>

      {/* Auto-save promo */}
      <Card className="flex flex-wrap items-center gap-4 border-primary/30 bg-primary/5 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Auto-Save is ON</h3>
          <p className="text-sm text-muted-foreground">
            We automatically move money to your goals every month. You've saved{" "}
            <span className="font-semibold text-emerald-600">{formatMoney(245000, "NGN")}</span> via auto-save this year.
          </p>
        </div>
        <Button variant="outline" size="sm">Manage Auto-Save</Button>
      </Card>

      {/* Goals grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 && [1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
        {goals.map((g, i) => {
          const progress = (g.currentAmount / g.targetAmount) * 100;
          const colorClass = GOAL_COLORS.find((c) => c.id === g.color)?.class || GOAL_COLORS[0].class;
          const remaining = g.targetAmount - g.currentAmount;
          const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000) : null;
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group relative overflow-hidden p-5 card-lift">
                {g.status === "paused" && (
                  <div className="absolute right-3 top-3 z-10">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Paused</Badge>
                  </div>
                )}
                {g.status === "completed" && (
                  <div className="absolute right-3 top-3 z-10">
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                      <Award className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl shadow-lg", colorClass)}>
                    <span>{g.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{g.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {daysLeft !== null ? `${daysLeft} days left` : "No deadline"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xl font-bold tabular-nums">
                      <AnimatedNumber value={g.currentAmount} prefix="₦" decimals={2} />
                    </span>
                    <span className="text-xs text-muted-foreground">/ {formatMoney(g.targetAmount, "NGN")}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{progress.toFixed(1)}% complete</span>
                    {remaining > 0 && <span className="font-medium">{formatMoney(remaining, "NGN")} to go</span>}
                  </div>
                </div>

                {g.autoSaveAmount && g.status === "active" && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>Auto-save {formatMoney(g.autoSaveAmount, "NGN")} on day {g.autoSaveDay}</span>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8"
                    variant={g.status === "completed" ? "outline" : "default"}
                    disabled={g.status === "completed"}
                    onClick={() => setContributeGoal(g)}
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setContributeGoal({ ...g, _withdraw: true })}
                    disabled={g.currentAmount <= 0}
                  >
                    <ArrowUpFromLine className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => togglePause(g)}
                    disabled={g.status === "completed"}
                  >
                    {g.status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent contributions */}
      {goals.some((g) => g.contributions?.length > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Recent Contributions</h3>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {goals.flatMap((g) =>
              (g.contributions || []).map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-sm">{g.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{c.note || c.type} · {timeAgo(c.createdAt)}</p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", c.type === "deposit" ? "text-emerald-600" : "text-rose-600")}>
                    {c.type === "deposit" ? "+" : "-"}{formatMoney(c.amount, "NGN")}
                  </span>
                </div>
              ))
            ).slice(0, 15)}
          </div>
        </Card>
      )}

      {/* Contribute dialog */}
      <Dialog open={!!contributeGoal} onOpenChange={(o) => !o && setContributeGoal(null)}>
        <ContributeDialog goal={contributeGoal} onSubmit={contribute} />
      </Dialog>
    </div>
  );
}

function NewGoalDialog({ onSubmit }: { onSubmit: (f: any) => void }) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState("emerald");
  const [autoSave, setAutoSave] = useState(false);
  const [autoSaveAmount, setAutoSaveAmount] = useState("");
  const [autoSaveDay, setAutoSaveDay] = useState("1");

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Savings Goal</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Goal Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dream Vacation" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Target Amount</Label>
            <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">₦ NGN</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
                <SelectItem value="GBP">£ GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Target Date (optional)</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-lg border text-lg transition",
                  icon === ic ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "hover:bg-muted",
                )}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={cn(
                  "h-9 w-9 rounded-lg bg-gradient-to-br transition",
                  c.class,
                  color === c.id ? "ring-2 ring-offset-2 ring-primary scale-110" : "",
                )}
              />
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="rounded" />
            <span className="text-sm font-medium">Enable Auto-Save</span>
          </label>
          {autoSave && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Amount per month</Label>
                <Input type="number" value={autoSaveAmount} onChange={(e) => setAutoSaveAmount(e.target.value)} placeholder="10000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Day of month</Label>
                <Select value={autoSaveDay} onValueChange={setAutoSaveDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit({ name, targetAmount: Number(targetAmount), currency, deadline, icon, color, autoSaveAmount: autoSave ? Number(autoSaveAmount) : undefined, autoSaveDay: autoSave ? Number(autoSaveDay) : undefined })}>
          Create Goal
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ContributeDialog({ goal, onSubmit }: { goal: any; onSubmit: (id: string, amount: number, type: "deposit" | "withdrawal") => void }) {
  const [amount, setAmount] = useState("");
  if (!goal) return null;
  const isWithdraw = goal._withdraw;
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isWithdraw ? "Withdraw from" : "Add to"} {goal.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="rounded-lg bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current balance</span>
            <span className="font-semibold">{formatMoney(goal.currentAmount, "NGN")}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-muted-foreground">Target</span>
            <span className="font-semibold">{formatMoney(goal.targetAmount, "NGN")}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Amount (₦)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="text-lg font-semibold" />
          <div className="flex gap-2">
            {[5000, 10000, 25000, 50000].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className="flex-1 rounded-lg border py-1.5 text-xs font-medium hover:bg-muted">
                ₦{v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(goal.id, Number(amount), isWithdraw ? "withdrawal" : "deposit")} disabled={!amount}>
          {isWithdraw ? "Withdraw" : "Add Money"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
