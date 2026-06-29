"use client";

import { useState, useEffect } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Trophy, Plus, Pencil, Trash2, Sparkles, Award, TrendingUp, Star, Crown,
} from "lucide-react";
import { timeAgo } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, KpiCard, apiAction, showError } from "./shared";
import { cn } from "@/lib/utils";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rewardPoints: number;
  targetCount: number;
  rarity: string;
  enabled: boolean;
  unlockedCount: number;
  createdAt: string;
}

interface RecentUnlock {
  id: string;
  unlockedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  achievement: { id: string; name: string; icon: string; rewardPoints: number; category: string; rarity: string };
}

interface AchievementsData {
  achievements: Achievement[];
  mostPopular: Achievement[];
  recentUnlocks: RecentUnlock[];
  stats: {
    total: number;
    enabled: number;
    disabled: number;
    totalUnlocks: number;
    byRarity: { rarity: string; count: number }[];
    byCategory: { category: string; count: number }[];
  };
}

const RARITY_COLORS: Record<string, string> = {
  common: "bg-slate-500/15 text-slate-600 border-slate-500/20",
  rare: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  epic: "bg-violet-500/15 text-violet-600 border-violet-500/20",
  legendary: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  transactions: "Transactions",
  volume: "Volume",
  social: "Social",
  savings: "Savings",
  wallets: "Wallets",
  security: "Security",
  milestone: "Milestone",
  general: "General",
};

export function AchievementsSection() {
  const { data, loading, reload } = useFetch<AchievementsData>("/api/admin/achievements");
  const [editTarget, setEditTarget] = useState<Achievement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Achievement | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Achievements & Gamification" description="Badges & gamification" icon={Trophy} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Achievements & Gamification"
        description="Manage badges, reward points & user unlocks"
        icon={Trophy}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Achievement
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Trophy} label="Total Achievements" value={data.stats.total} color="bg-yellow-500/15 text-yellow-500" />
        <KpiCard icon={Award} label="Total Unlocked" value={data.stats.totalUnlocks} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Sparkles} label="Enabled" value={data.stats.enabled} color="bg-sky-500/15 text-sky-500" />
        <KpiCard icon={Crown} label="Most Popular" value={data.mostPopular[0]?.unlockedCount ?? 0} color="bg-violet-500/15 text-violet-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Achievements table */}
        <Card className="p-0 lg:col-span-2">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Achievement</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Rarity</TableHead>
                  <TableHead className="text-center">Reward</TableHead>
                  <TableHead className="text-center">Unlocked</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.achievements.length === 0 && (
                  <TableRow><TableCell colSpan={7}><EmptyState message="No achievements yet" icon={Trophy} /></TableCell></TableRow>
                )}
                {data.achievements.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-yellow-500/10 text-lg shrink-0">
                          {a.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[a.category] || a.category}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[10px] capitalize", RARITY_COLORS[a.rarity])}>
                        {a.rarity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {a.rewardPoints}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold tabular-nums">{a.unlockedCount}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={a.enabled}
                        onCheckedChange={async (v) => {
                          const r = await apiAction(`/api/admin/achievements?action=toggle`, "PATCH", { achievementId: a.id }, v ? "Achievement enabled" : "Achievement disabled");
                          if (!r.ok) showError(r.error || "Failed"); else reload();
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(a)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setDeleteTarget(a)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-4">
          {/* Most popular */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-violet-600" /> Most Popular
            </h3>
            <div className="space-y-2">
              {data.mostPopular.length === 0 && <EmptyState message="No unlocks yet" icon={Award} />}
              {data.mostPopular.map((a, i) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shrink-0",
                    i === 0 ? "bg-yellow-500/20 text-yellow-600" : i === 1 ? "bg-slate-400/20 text-slate-500" : i === 2 ? "bg-orange-500/20 text-orange-600" : "bg-muted text-muted-foreground",
                  )}>{i + 1}</div>
                  <div className="text-lg shrink-0">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.unlockedCount} unlocks</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent unlocks feed */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" /> Recent Unlocks
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {data.recentUnlocks.length === 0 && <EmptyState message="No recent unlocks" icon={Sparkles} />}
              {data.recentUnlocks.map((u) => (
                <div key={u.id} className="flex items-start gap-2 rounded-lg border p-2">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="text-[10px] bg-violet-500/15 text-violet-600">
                      {u.user.firstName?.[0]}{u.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {u.user.firstName} {u.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="text-sm">{u.achievement.icon}</span>
                      <span className="truncate">unlocked {u.achievement.name}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(u.unlockedAt)}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] capitalize shrink-0">{u.achievement.rarity}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit dialog */}
      <EditDialog
        achievement={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); reload(); }}
      />

      {/* Create dialog */}
      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); reload(); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete achievement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot; and remove all {deleteTarget?.unlockedCount ?? 0} user unlocks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                if (!deleteTarget) return;
                const r = await apiAction(`/api/admin/achievements?action=delete`, "PATCH", { achievementId: deleteTarget.id }, "Achievement deleted");
                if (!r.ok) showError(r.error || "Failed"); else { setDeleteTarget(null); reload(); }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  return (
    <AchievementFormDialog
      title="New Achievement"
      description="Create a new badge that users can unlock"
      achievement={null}
      open={open}
      onClose={onClose}
      onSaved={onCreated}
    />
  );
}

function EditDialog({ achievement, open, onClose, onSaved }: {
  achievement: Achievement | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!achievement) return null;
  return (
    <AchievementFormDialog
      title="Edit Achievement"
      description="Update badge details, reward & rarity"
      achievement={achievement}
      open={open}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function AchievementFormDialog({
  title, description, achievement, open, onClose, onSaved,
}: {
  title: string;
  description: string;
  achievement: Achievement | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!achievement;
  const [code, setCode] = useState(achievement?.code || "");
  const [name, setName] = useState(achievement?.name || "");
  const [desc, setDesc] = useState(achievement?.description || "");
  const [icon, setIcon] = useState(achievement?.icon || "🏆");
  const [category, setCategory] = useState(achievement?.category || "onboarding");
  const [rewardPoints, setRewardPoints] = useState(String(achievement?.rewardPoints ?? 10));
  const [targetCount, setTargetCount] = useState(String(achievement?.targetCount ?? 1));
  const [rarity, setRarity] = useState(achievement?.rarity || "common");
  const [saving, setSaving] = useState(false);

  // Reset form when target achievement changes
  useEffect(() => {
    setCode(achievement?.code || "");
    setName(achievement?.name || "");
    setDesc(achievement?.description || "");
    setIcon(achievement?.icon || "🏆");
    setCategory(achievement?.category || "onboarding");
    setRewardPoints(String(achievement?.rewardPoints ?? 10));
    setTargetCount(String(achievement?.targetCount ?? 1));
    setRarity(achievement?.rarity || "common");
  }, [achievement]);

  async function submit() {
    if (!name) return showError("Name is required");
    if (!isEdit && !code) return showError("Code is required");
    setSaving(true);
    const payload = {
      code, name, description: desc, icon, category,
      rewardPoints: Number(rewardPoints),
      targetCount: Number(targetCount),
      rarity,
    };
    const r = isEdit
      ? await apiAction(`/api/admin/achievements?action=update`, "PATCH", { achievementId: achievement!.id, ...payload }, "Achievement updated")
      : await apiAction(`/api/admin/achievements`, "POST", payload, "Achievement created");
    setSaving(false);
    if (!r.ok) return showError(r.error || "Failed");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., tx_100" disabled={isEdit} />
          </div>
          <div>
            <Label>Icon (emoji)</Label>
            <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏆" maxLength={4} />
          </div>
          <div className="col-span-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Achievement name" />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What must the user do to unlock this?" rows={2} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rarity</Label>
            <Select value={rarity} onValueChange={setRarity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="epic">Epic</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reward points</Label>
            <Input type="number" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} />
          </div>
          <div>
            <Label>Target count</Label>
            <Input type="number" value={targetCount} onChange={(e) => setTargetCount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
