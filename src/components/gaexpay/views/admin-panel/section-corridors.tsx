"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Globe, Plus, Edit3, Search, Plane, ArrowRight, Activity, CheckCircle2,
} from "lucide-react";
import { formatCompact, COUNTRIES } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, StatusBadge, apiAction, showError } from "./shared";

export function CorridorsSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/corridors");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const corridors = data?.corridors ?? [];
  const stats = data?.stats ?? { total: 0, active: 0, totalVolume30d: 0 };

  const filtered = corridors.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.fromCountryName?.toLowerCase().includes(q) ||
      c.toCountryName?.toLowerCase().includes(q) ||
      c.partnerBank?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <SectionHeader
        title="International Transfer Corridors"
        description="Manage cross-border transfer routes, fees & partner banks"
        icon={Globe}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Corridor
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <StatTile icon={Globe} label="Total Corridors" value={stats.total} color="bg-cyan-500/15 text-cyan-600" />
        <StatTile icon={CheckCircle2} label="Active Corridors" value={stats.active} color="bg-emerald-500/15 text-emerald-600" />
        <StatTile icon={Activity} label="30d Volume" value={formatCompact(stats.totalVolume30d || 0, "NGN")} color="bg-amber-500/15 text-amber-600" />
      </div>

      <Card className="p-3">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by country or partner bank…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
      </Card>

      {loading ? <LoadingTable rows={6} /> : (
        <Card className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-right">Min / Max</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-center">ETA</TableHead>
                  <TableHead>Partner Bank</TableHead>
                  <TableHead className="text-right">30d Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState message="No corridors configured" icon={Globe} /></TableCell></TableRow>}
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{c.fromFlag}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{c.fromCountryName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.fromCurrency}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                        <span className="text-lg">{c.toFlag}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{c.toCountryName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.toCurrency}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      <p>{formatCompact(c.minAmount, c.fromCurrency)}</p>
                      <p className="text-muted-foreground">{formatCompact(c.maxAmount, c.fromCurrency)}</p>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <p className="font-medium">{c.feePercent}%</p>
                      <p className="text-muted-foreground">+ {formatCompact(c.fixedFee, c.fromCurrency)}</p>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <Badge variant="outline" className="text-[10px]"><Plane className="h-2.5 w-2.5 mr-1" />{c.etaHours}h</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{c.partnerBank || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-medium">{formatCompact(c.volume30d ?? 0, c.fromCurrency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!c.enabled}
                          onCheckedChange={async (v) => {
                            const r = await apiAction(`/api/admin/corridors`, "PATCH", { id: c.id, enabled: v }, v ? "Corridor enabled" : "Corridor disabled");
                            if (!r.ok) showError(r.error || "Failed"); else reload();
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditTarget(c)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <EditCorridorDialog corridor={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); reload(); }} />
      <CreateCorridorDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); reload(); }} />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className="p-4">
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${color} mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </Card>
  );
}

function EditCorridorDialog({ corridor, onClose, onSaved }: { corridor: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [lastId, setLastId] = useState<string | null>(null);

  if (corridor && corridor.id !== lastId) {
    setForm({
      minAmount: corridor.minAmount, maxAmount: corridor.maxAmount,
      feePercent: corridor.feePercent, fixedFee: corridor.fixedFee,
      etaHours: corridor.etaHours, partnerBank: corridor.partnerBank,
    });
    setLastId(corridor.id);
  }
  if (!corridor) return null;

  return (
    <Dialog open={!!corridor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Corridor · {corridor.fromCountryName} → {corridor.toCountryName}</DialogTitle>
          <DialogDescription>Update limits, fees & partner</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Min Amount (${corridor.fromCurrency})`}>
            <Input type="number" value={form.minAmount ?? 0} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
          </Field>
          <Field label={`Max Amount (${corridor.fromCurrency})`}>
            <Input type="number" value={form.maxAmount ?? 0} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} />
          </Field>
          <Field label="Fee Percent (%)">
            <Input type="number" step="0.01" value={form.feePercent ?? 0} onChange={(e) => setForm({ ...form, feePercent: Number(e.target.value) })} />
          </Field>
          <Field label={`Fixed Fee (${corridor.fromCurrency})`}>
            <Input type="number" step="0.01" value={form.fixedFee ?? 0} onChange={(e) => setForm({ ...form, fixedFee: Number(e.target.value) })} />
          </Field>
          <Field label="ETA (hours)">
            <Input type="number" value={form.etaHours ?? 24} onChange={(e) => setForm({ ...form, etaHours: Number(e.target.value) })} />
          </Field>
          <Field label="Partner Bank">
            <Input value={form.partnerBank ?? ""} onChange={(e) => setForm({ ...form, partnerBank: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/corridors`, "PATCH", { id: corridor.id, updates: form }, "Corridor updated");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCorridorDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    fromCountry: "NG", toCountry: "GH", fromCurrency: "NGN", toCurrency: "GHS",
    minAmount: 1000, maxAmount: 5000000, feePercent: 1.5, fixedFee: 100, etaHours: 24, partnerBank: "",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Transfer Corridor</DialogTitle>
          <DialogDescription>Define a new international transfer route</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From Country">
            <CountrySelect value={form.fromCountry} onChange={(v) => setForm({ ...form, fromCountry: v, fromCurrency: COUNTRIES.find((c) => c.code === v)?.currency ?? "NGN" })} />
          </Field>
          <Field label="To Country">
            <CountrySelect value={form.toCountry} onChange={(v) => setForm({ ...form, toCountry: v, toCurrency: COUNTRIES.find((c) => c.code === v)?.currency ?? "GHS" })} />
          </Field>
          <Field label="From Currency">
            <Input value={form.fromCurrency} onChange={(e) => setForm({ ...form, fromCurrency: e.target.value.toUpperCase() })} className="font-mono" />
          </Field>
          <Field label="To Currency">
            <Input value={form.toCurrency} onChange={(e) => setForm({ ...form, toCurrency: e.target.value.toUpperCase() })} className="font-mono" />
          </Field>
          <Field label="Min Amount">
            <Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} />
          </Field>
          <Field label="Max Amount">
            <Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} />
          </Field>
          <Field label="Fee %">
            <Input type="number" step="0.01" value={form.feePercent} onChange={(e) => setForm({ ...form, feePercent: Number(e.target.value) })} />
          </Field>
          <Field label="Fixed Fee">
            <Input type="number" step="0.01" value={form.fixedFee} onChange={(e) => setForm({ ...form, fixedFee: Number(e.target.value) })} />
          </Field>
          <Field label="ETA (hours)">
            <Input type="number" value={form.etaHours} onChange={(e) => setForm({ ...form, etaHours: Number(e.target.value) })} />
          </Field>
          <Field label="Partner Bank">
            <Input value={form.partnerBank} onChange={(e) => setForm({ ...form, partnerBank: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/corridors`, "POST", form, "Corridor created");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
    >
      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
    </select>
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
