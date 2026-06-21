"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Percent, Plus, Edit3 } from "lucide-react";
import { formatMoney } from "@/lib/gaexpay";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";

const FEE_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed amount" },
  { value: "mixed", label: "Mixed (% + fixed)" },
];

const ACCOUNT_TYPES = [
  { value: "all", label: "All accounts" },
  { value: "personal", label: "Personal only" },
  { value: "business", label: "Business only" },
];

export function FeesSection() {
  const { data, loading, reload } = useFetch<{ fees: any[] }>("/api/admin/fees");
  const [edit, setEdit] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fees = data?.fees ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Fee & Commission Management"
        description={`${fees.length} fee configurations`}
        icon={Percent}
        actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Fee</Button>}
      />

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Fixed</TableHead>
                  <TableHead className="text-right">Min/Max</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.length === 0 && <TableRow><TableCell colSpan={8}><EmptyState message="No fee configs" icon={Percent} /></TableCell></TableRow>}
                {fees.map((f) => (
                  <TableRow key={f.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.description || f.transactionType || "—"}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{f.feeType}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {f.feeType === "percentage" || f.feeType === "mixed" ? `${f.feeValue}%` : formatMoney(f.feeValue, f.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {f.feeType === "fixed" || f.feeType === "mixed" ? formatMoney(f.fixedFee, f.currency) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <p>Min: {formatMoney(f.minFee, f.currency)}</p>
                      <p className="text-muted-foreground">Max: {f.maxFee ? formatMoney(f.maxFee, f.currency) : "—"}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{f.accountType}</Badge></TableCell>
                    <TableCell>
                      <Switch checked={f.enabled} onCheckedChange={async (v) => {
                        const r = await apiAction(`/api/admin/fees`, "PATCH", { id: f.id, enabled: v }, v ? "Fee enabled" : "Fee disabled");
                        if (!r.ok) showError(r.error || "Failed"); else reload();
                      }} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEdit(f)}><Edit3 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <FeeEditDialog fee={edit} onClose={() => setEdit(null)} onSaved={() => { reload(); setEdit(null); }} />

      <FeeCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { reload(); setCreateOpen(false); }} />
    </div>
  );
}

function FeeEditDialog({ fee, onClose, onSaved }: { fee: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [lastId, setLastId] = useState<string | null>(null);
  if (fee && fee.id !== lastId) {
    setForm({
      feeType: fee.feeType, feeValue: fee.feeValue, fixedFee: fee.fixedFee,
      minFee: fee.minFee, maxFee: fee.maxFee ?? "",
      accountType: fee.accountType, description: fee.description || "",
    });
    setLastId(fee.id);
  }
  if (!fee) return null;

  return (
    <Dialog open={!!fee} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {fee.name}</DialogTitle>
          <DialogDescription>Adjust fee structure</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Description</Label>
            <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Fee type</Label>
            <Select value={form.feeType} onValueChange={(v) => setForm({ ...form, feeType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{form.feeType === "fixed" ? "Fixed amount" : "Percentage (%)"}</Label>
            <Input type="number" step="0.01" value={form.feeValue ?? 0} onChange={(e) => setForm({ ...form, feeValue: Number(e.target.value) })} />
          </div>
          {(form.feeType === "fixed" || form.feeType === "mixed") && (
            <div>
              <Label>Fixed fee ({fee.currency})</Label>
              <Input type="number" step="0.01" value={form.fixedFee ?? 0} onChange={(e) => setForm({ ...form, fixedFee: Number(e.target.value) })} />
            </div>
          )}
          <div>
            <Label>Min fee ({fee.currency})</Label>
            <Input type="number" step="0.01" value={form.minFee ?? 0} onChange={(e) => setForm({ ...form, minFee: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Max fee ({fee.currency})</Label>
            <Input type="number" step="0.01" value={form.maxFee ?? ""} onChange={(e) => setForm({ ...form, maxFee: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <Label>Applies to</Label>
            <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/fees`, "PATCH", { id: fee.id, ...form }, "Fee updated");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeeCreateDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({
    name: "", description: "", feeType: "percentage", feeValue: 0, fixedFee: 0,
    minFee: 0, maxFee: "", currency: "NGN", accountType: "all", transactionType: "", enabled: true,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Fee Configuration</DialogTitle>
          <DialogDescription>Define a new fee for a transaction type</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Name (unique)</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., international_transfer_fee" />
          </div>
          <div>
            <Label>Transaction type</Label>
            <Input value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })} placeholder="transfer | bill | card…" />
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="font-mono" />
          </div>
          <div>
            <Label>Fee type</Label>
            <Select value={form.feeType} onValueChange={(v) => setForm({ ...form, feeType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Value (% or amount)</Label>
            <Input type="number" step="0.01" value={form.feeValue} onChange={(e) => setForm({ ...form, feeValue: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Fixed fee</Label>
            <Input type="number" step="0.01" value={form.fixedFee} onChange={(e) => setForm({ ...form, fixedFee: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Min fee</Label>
            <Input type="number" step="0.01" value={form.minFee} onChange={(e) => setForm({ ...form, minFee: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <Label>Applies to</Label>
            <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const payload = { ...form, maxFee: form.maxFee === "" ? null : Number(form.maxFee) };
            const r = await apiAction(`/api/admin/fees`, "POST", payload, "Fee created");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
