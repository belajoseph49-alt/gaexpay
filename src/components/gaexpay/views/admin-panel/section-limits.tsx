"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Gauge, User, Building2, Edit3, Check, TrendingUp, Globe, CreditCard, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";

export function LimitsSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/limits");
  const [tab, setTab] = useState("personal");
  const [editTier, setEditTier] = useState<{ accountType: "personal" | "business"; tier: any } | null>(null);

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Limits & Tiers" description="KYC tier limits" icon={Gauge} />
        <LoadingTable rows={4} />
      </div>
    );
  }

  const personal = data.personal ?? [];
  const business = data.business ?? [];
  const userCounts = data.userCounts ?? {};

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Limits & Tiers"
        description="KYC/KYB tier limits — daily, monthly, single-transaction, withdrawal, international"
        icon={Gauge}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="personal"><User className="h-4 w-4 mr-1.5" /> Personal</TabsTrigger>
          <TabsTrigger value="business"><Building2 className="h-4 w-4 mr-1.5" /> Business</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <TiersGrid tiers={personal} accountType="personal" userCounts={userCounts} onEdit={(tier) => setEditTier({ accountType: "personal", tier })} />
        </TabsContent>
        <TabsContent value="business" className="mt-4">
          <TiersGrid tiers={business} accountType="business" userCounts={userCounts} onEdit={(tier) => setEditTier({ accountType: "business", tier })} />
        </TabsContent>
      </Tabs>

      <EditTierDialog
        target={editTier}
        onClose={() => setEditTier(null)}
        onSaved={() => { setEditTier(null); reload(); }}
      />
    </div>
  );
}

function TiersGrid({ tiers, accountType, userCounts, onEdit }: {
  tiers: any[];
  accountType: "personal" | "business";
  userCounts: Record<number, number>;
  onEdit: (tier: any) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {tiers.map((t, idx) => {
        const tierColor = ["bg-muted text-muted-foreground", "bg-sky-500/15 text-sky-600", "bg-violet-500/15 text-violet-600", "bg-violet-500/15 text-violet-600"][idx] ?? "bg-muted text-muted-foreground";
        return (
          <Card key={t.tier} className="p-5 flex flex-col">
            <header className="flex items-center justify-between mb-3">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${tierColor}`}>
                <span className="text-sm font-bold">T{t.tier}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {userCounts[t.tier] ?? 0} users
              </Badge>
            </header>
            <h3 className="font-semibold">{t.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">Tier {t.tier}</p>

            <div className="space-y-2 text-sm flex-1">
              <LimitRow icon={TrendingUp} label="Daily Transfer" value={formatMoney(t.dailyLimit, "NGN")} />
              <LimitRow icon={Gauge} label="Monthly Limit" value={formatMoney(t.monthlyLimit, "NGN")} />
              <LimitRow icon={CreditCard} label="Single Tx" value={formatMoney(t.singleTxLimit, "NGN")} />
              <LimitRow icon={Wallet} label="Max Balance" value={formatMoney(t.maxBalance, "NGN")} />
              <LimitRow icon={CreditCard} label="Withdrawal" value={formatMoney(t.withdrawalLimit, "NGN")} />
              <LimitRow icon={Globe} label="International" value={t.internationalLimit > 0 ? formatMoney(t.internationalLimit, "USD") : "—"} />
            </div>

            <div className="mt-3 pt-3 border-t">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Unlocks</p>
              <ul className="space-y-1">
                {(t.features ?? []).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <Check className="h-3 w-3 text-violet-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => onEdit(t)}>
              <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit Limits
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

function LimitRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className="font-medium tabular-nums text-xs">{value}</span>
    </div>
  );
}

function EditTierDialog({ target, onClose, onSaved }: {
  target: { accountType: "personal" | "business"; tier: any } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [lastId, setLastId] = useState<string | null>(null);

  if (target && `${target.accountType}-${target.tier.tier}` !== lastId) {
    setForm({ ...target.tier });
    setLastId(`${target.accountType}-${target.tier.tier}`);
  }
  if (!target) return null;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {target.accountType} · Tier {target.tier.tier} ({target.tier.name})</DialogTitle>
          <DialogDescription>Update the limits for this tier</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Daily Transfer Limit (NGN)">
            <Input type="number" value={form.dailyLimit ?? 0} onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Monthly Limit (NGN)">
            <Input type="number" value={form.monthlyLimit ?? 0} onChange={(e) => setForm({ ...form, monthlyLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Single Transaction Limit (NGN)">
            <Input type="number" value={form.singleTxLimit ?? 0} onChange={(e) => setForm({ ...form, singleTxLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Max Wallet Balance (NGN)">
            <Input type="number" value={form.maxBalance ?? 0} onChange={(e) => setForm({ ...form, maxBalance: Number(e.target.value) })} />
          </Field>
          <Field label="Withdrawal Limit (NGN)">
            <Input type="number" value={form.withdrawalLimit ?? 0} onChange={(e) => setForm({ ...form, withdrawalLimit: Number(e.target.value) })} />
          </Field>
          <Field label="International Transfer Limit (USD)">
            <Input type="number" value={form.internationalLimit ?? 0} onChange={(e) => setForm({ ...form, internationalLimit: Number(e.target.value) })} />
          </Field>
          <div className="col-span-2">
            <Label>Features (comma-separated)</Label>
            <Input
              value={(form.features ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/limits`, "PATCH", {
              accountType: target.accountType,
              tier: target.tier.tier,
              updates: form,
            }, "Tier limits updated");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
