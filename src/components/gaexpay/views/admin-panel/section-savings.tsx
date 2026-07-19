"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PiggyBank, Search, Edit3, Trash2, Eye } from "lucide-react";
import { formatMoney } from "@/lib/gaexpay";
import {
  SectionHeader, StatusBadge, LoadingTable, EmptyState, KpiCard, apiAction, showError,
} from "./shared";

export function SavingsSection() {
  const [tab, setTab] = useState<"goals" | "budgets">("goals");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);
  const [viewTarget, setViewTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    p.set("tab", tab);
    return `/api/admin/savings?${p.toString()}&k=${reloadKey}`;
  }, [search, tab, reloadKey]);

  const { data, loading } = useFetch<any>(url);
  const goals: any[] = data?.goals ?? [];
  const budgets: any[] = data?.budgets ?? [];

  const totalGoals = goals.length;
  const totalBudgets = budgets.length;
  const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || 0), 0);
  const totalBudgeted = budgets.reduce((s, b) => s + (b.limit || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Savings & Budgets"
        description={
          tab === "goals"
            ? `${totalGoals} savings goals · ${formatMoney(totalSaved, "NGN")} saved across users`
            : `${totalBudgets} budgets · ${formatMoney(totalSpent, "NGN")} of ${formatMoney(totalBudgeted, "NGN")} spent`
        }
        icon={PiggyBank}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={PiggyBank} label="Savings Goals" value={totalGoals} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={PiggyBank} label="Total Saved" value={formatMoney(totalSaved, "NGN")} color="bg-purple-500/15 text-purple-500" />
        <KpiCard icon={Edit3} label="Budgets" value={totalBudgets} color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={Edit3} label="Budget Utilization" value={totalBudgeted > 0 ? `${Math.round((totalSpent / totalBudgeted) * 100)}%` : "—"} color="bg-rose-500/15 text-rose-500" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={tab === "goals" ? "default" : "outline"} onClick={() => setTab("goals")}>
          <PiggyBank className="h-4 w-4 mr-1.5" /> Savings Goals ({totalGoals})
        </Button>
        <Button size="sm" variant={tab === "budgets" ? "default" : "outline"} onClick={() => setTab("budgets")}>
          <Edit3 className="h-4 w-4 mr-1.5" /> Budgets ({totalBudgets})
        </Button>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tab === "goals" ? "Search by user, goal name…" : "Search by user, category…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : tab === "goals" ? (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.length === 0 && (
                  <TableRow><TableCell colSpan={8}><EmptyState message="No savings goals found" icon={PiggyBank} /></TableCell></TableRow>
                )}
                {goals.map((g) => {
                  const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
                  return (
                    <TableRow key={g.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs">
                        <p className="font-medium text-sm">{g.user?.firstName} {g.user?.lastName}</p>
                        <p className="text-muted-foreground">{g.user?.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{g.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{g.name}</p>
                            <p className="text-[10px] text-muted-foreground">{g.currency}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{formatMoney(g.targetAmount, g.currency)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatMoney(g.currentAmount, g.currency)}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{pct.toFixed(1)}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{g.deadline ? new Date(g.deadline).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><StatusBadge status={g.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTarget(g)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdjustTarget(g)} title="Adjust">
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Adjust
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setDeleteTarget({ ...g, kind: "goal" })} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.length === 0 && (
                  <TableRow><TableCell colSpan={9}><EmptyState message="No budgets found" icon={Edit3} /></TableCell></TableRow>
                )}
                {budgets.map((b) => {
                  const pct = b.limit > 0 ? Math.min(100, (b.spent / b.limit) * 100) : 0;
                  const over = b.spent > b.limit;
                  return (
                    <TableRow key={b.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs">
                        <p className="font-medium text-sm">{b.user?.firstName} {b.user?.lastName}</p>
                        <p className="text-muted-foreground">{b.user?.email}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{b.category}</Badge></TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{formatMoney(b.limit, b.currency)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatMoney(b.spent, b.currency)}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={over ? "h-full bg-rose-500" : "h-full bg-amber-500"} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{pct.toFixed(1)}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{b.period}</TableCell>
                      <TableCell className="text-xs">{b.alertThreshold}%</TableCell>
                      <TableCell>
                        {over ? <StatusBadge status="warning" /> : <StatusBadge status="active" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdjustTarget({ ...b, kind: "budget" })} title="Adjust">
                            <Edit3 className="h-3.5 w-3.5 mr-1" /> Adjust
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setDeleteTarget({ ...b, kind: "budget" })} title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AdjustDialog target={adjustTarget} onClose={() => setAdjustTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
      <ViewGoalDialog goal={viewTarget} onClose={() => setViewTarget(null)} />
      <DeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}

function AdjustDialog({ target, onClose, onSaved }: { target: any; onClose: () => void; onSaved: () => void }) {
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [reason, setReason] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (target && target.id !== lastId) {
    if (target.kind === "budget") {
      setV1(String(target.limit ?? ""));
      setV2(String(target.spent ?? ""));
    } else {
      setV1(String(target.targetAmount ?? ""));
      setV2(String(target.currentAmount ?? ""));
    }
    setReason("");
    setLastId(target.id);
  }
  if (!target) return null;
  const isBudget = target.kind === "budget";

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBudget ? "Adjust Budget" : "Adjust Savings Goal"}</DialogTitle>
          <DialogDescription>
            {target.user?.firstName} {target.user?.lastName} · {isBudget ? target.category : target.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{isBudget ? "Limit" : "Target amount"} ({target.currency})</Label>
            <Input type="number" min="0" step="0.01" value={v1} onChange={(e) => setV1(e.target.value)} />
          </div>
          <div>
            <Label>{isBudget ? "Spent" : "Current amount"} ({target.currency})</Label>
            <Input type="number" min="0" step="0.01" value={v2} onChange={(e) => setV2(e.target.value)} />
          </div>
          <div>
            <Label>Reason (audit trail)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason for adjustment…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const action = isBudget ? "adjust_budget" : "adjust_goal";
            const body: any = { reason };
            if (isBudget) {
              body.budgetId = target.id;
              body.limit = Number(v1);
              body.spent = Number(v2);
            } else {
              body.goalId = target.id;
              body.targetAmount = Number(v1);
              body.currentAmount = Number(v2);
            }
            const r = await apiAction(`/api/admin/savings?action=${action}`, "PATCH", body, isBudget ? "Budget adjusted" : "Goal adjusted");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewGoalDialog({ goal, onClose }: { goal: any; onClose: () => void }) {
  if (!goal) return null;
  const recent = (goal.contributions ?? []).slice(0, 5);
  return (
    <Dialog open={!!goal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal.icon} {goal.name}</DialogTitle>
          <DialogDescription>
            {goal.user?.firstName} {goal.user?.lastName} · {goal.user?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label="Target" value={formatMoney(goal.targetAmount, goal.currency)} />
          <Info label="Current" value={formatMoney(goal.currentAmount, goal.currency)} />
          <Info label="Currency" value={goal.currency} />
          <Info label="Status" value={goal.status} />
          <Info label="Deadline" value={goal.deadline ? new Date(goal.deadline).toLocaleDateString() : "—"} />
          <Info label="Auto-save" value={goal.autoSaveAmount ? `${formatMoney(goal.autoSaveAmount, goal.currency)} on day ${goal.autoSaveDay}` : "—"} />
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground mb-1">Recent contributions</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contributions yet.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {recent.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-xs rounded-md border p-2">
                  <span className="capitalize">{c.type}</span>
                  <span className="font-semibold tabular-nums">{c.type === "deposit" ? "+" : "−"}{formatMoney(c.amount, goal.currency)}</span>
                  <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md border bg-muted/30 p-2">
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DeleteDialog({ target, onClose, onSaved }: { target: any; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  if (!target) return null;
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {target.kind === "budget" ? "budget" : "savings goal"}?</AlertDialogTitle>
          <AlertDialogDescription>
            {target.kind === "budget"
              ? `Budget for ${target.category} (${target.user?.firstName} ${target.user?.lastName}) will be permanently removed.`
              : `Goal "${target.name}" (${target.user?.firstName} ${target.user?.lastName}) will be permanently removed.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (audit trail)" />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={async () => {
            const action = target.kind === "budget" ? "delete_budget" : "delete_goal";
            const body: any = { reason };
            if (target.kind === "budget") body.budgetId = target.id;
            else body.goalId = target.id;
            const r = await apiAction(`/api/admin/savings?action=${action}`, "PATCH", body, target.kind === "budget" ? "Budget deleted" : "Goal deleted");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
