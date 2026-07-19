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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard as CreditCardIcon, Search, Snowflake, Sun, Ban, Trash2,
  ArrowLeftRight, Eye,
} from "lucide-react";
import { formatMoney } from "@/lib/gaexpay";
import {
  SectionHeader, StatusBadge, LoadingTable, EmptyState, KpiCard, apiAction, showError,
} from "./shared";

export function CardsSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [adjustTarget, setAdjustTarget] = useState<any | null>(null);
  const [viewTarget, setViewTarget] = useState<any | null>(null);
  const [blockTarget, setBlockTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (status !== "all") p.set("status", status);
    if (type !== "all") p.set("type", type);
    return `/api/admin/cards?${p.toString()}&k=${reloadKey}`;
  }, [search, status, type, reloadKey]);

  const { data, loading } = useFetch<{ cards: any[] }>(url);
  const cards = data?.cards ?? [];

  const totalCards = cards.length;
  const totalActive = cards.filter((c) => c.status === "active").length;
  const totalFrozen = cards.filter((c) => c.status === "frozen").length;
  const totalBlocked = cards.filter((c) => c.status === "blocked").length;
  const totalBalance = cards.reduce((s, c) => s + (c.balance || 0), 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Card Management"
        description={`${totalCards} cards · ${totalActive} active · ${totalFrozen} frozen · ${totalBlocked} blocked`}
        icon={CreditCardIcon}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={CreditCardIcon} label="Total Cards" value={totalCards} color="bg-indigo-500/15 text-indigo-500" />
        <KpiCard icon={Sun} label="Active" value={totalActive} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Snowflake} label="Frozen / Blocked" value={totalFrozen + totalBlocked} color="bg-rose-500/15 text-rose-500" />
        <KpiCard icon={ArrowLeftRight} label="Total Balance" value={formatMoney(totalBalance, "NGN")} color="bg-amber-500/15 text-amber-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by user name, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.length === 0 && (
                  <TableRow><TableCell colSpan={9}><EmptyState message="No cards found" icon={CreditCardIcon} /></TableCell></TableRow>
                )}
                {cards.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{c.user?.firstName} {c.user?.lastName}</p>
                      <p className="text-muted-foreground">{c.user?.email}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs">{c.maskedNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{c.holderName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{c.type}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase">{c.brand}</Badge></TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatMoney(c.balance, c.currency)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatMoney(c.limit, c.currency)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{c.expiryMonth}/{c.expiryYear}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTarget(c)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAdjustTarget(c)} title="Adjust limit">
                          <ArrowLeftRight className="h-3.5 w-3.5 mr-1" /> Limit
                        </Button>
                        {c.status === "active" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-sky-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/cards?action=freeze`, "PATCH", { cardId: c.id }, "Card frozen");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Freeze"><Snowflake className="h-3.5 w-3.5" /></Button>
                        ) : c.status === "frozen" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/cards?action=unfreeze`, "PATCH", { cardId: c.id }, "Card unfrozen");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Unfreeze"><Sun className="h-3.5 w-3.5" /></Button>
                        ) : null}
                        {c.status !== "blocked" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setBlockTarget(c)} title="Block">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setDeleteTarget(c)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <AdjustLimitDialog card={adjustTarget} onClose={() => setAdjustTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
      <ViewCardDialog card={viewTarget} onClose={() => setViewTarget(null)} />
      <BlockCardDialog card={blockTarget} onClose={() => setBlockTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
      <DeleteCardDialog card={deleteTarget} onClose={() => setDeleteTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}

function AdjustLimitDialog({ card, onClose, onSaved }: { card: any; onClose: () => void; onSaved: () => void }) {
  const [limit, setLimit] = useState("");
  const [reason, setReason] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (card && card.id !== lastId) {
    setLimit(String(card.limit ?? ""));
    setReason("");
    setLastId(card.id);
  }
  if (!card) return null;

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Card Limit</DialogTitle>
          <DialogDescription>
            Card: <span className="font-mono">{card.maskedNumber}</span> · {card.user?.firstName} {card.user?.lastName}<br />
            Current limit: <span className="font-semibold">{formatMoney(card.limit, card.currency)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>New limit ({card.currency})</Label>
            <Input type="number" min="0" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div>
            <Label>Reason (audit trail)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="E.g., Customer tier upgrade, risk review…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/cards?action=adjust_limit`, "PATCH", {
              cardId: card.id, limit: Number(limit), reason,
            }, "Card limit updated");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Update limit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewCardDialog({ card, onClose }: { card: any; onClose: () => void }) {
  if (!card) return null;
  const rows: [string, string][] = [
    ["Holder", card.holderName],
    ["Masked number", card.maskedNumber],
    ["Brand", card.brand?.toUpperCase()],
    ["Type", card.type],
    ["Nickname", card.nickname],
    ["Currency", card.currency],
    ["Balance", formatMoney(card.balance, card.currency)],
    ["Spending (this cycle)", formatMoney(card.spending, card.currency)],
    ["Limit", formatMoney(card.limit, card.currency)],
    ["Expiry", `${card.expiryMonth}/${card.expiryYear}`],
    ["Color theme", card.color],
    ["Default", card.isDefault ? "Yes" : "No"],
    ["Created", new Date(card.createdAt).toLocaleString()],
  ];
  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Card details</DialogTitle>
          <DialogDescription>
            {card.user?.firstName} {card.user?.lastName} · {card.user?.email}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col rounded-md border bg-muted/30 p-2">
              <span className="text-[10px] uppercase text-muted-foreground">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlockCardDialog({ card, onClose, onSaved }: { card: any; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  if (!card) return null;
  return (
    <AlertDialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block this card?</AlertDialogTitle>
          <AlertDialogDescription>
            Blocking <span className="font-mono">{card.maskedNumber}</span> will permanently disable it for transactions. This action is logged as critical.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (recorded in audit trail)" />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={async () => {
            const r = await apiAction(`/api/admin/cards?action=block`, "PATCH", { cardId: card.id, reason }, "Card blocked");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Block card</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteCardDialog({ card, onClose, onSaved }: { card: any; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState("");
  if (!card) return null;
  return (
    <AlertDialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this card?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <span className="font-mono">{card.maskedNumber}</span> from the database. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (recorded in audit trail)" />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={async () => {
            const r = await apiAction(`/api/admin/cards?action=delete`, "PATCH", { cardId: card.id, reason }, "Card deleted");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Delete card</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
