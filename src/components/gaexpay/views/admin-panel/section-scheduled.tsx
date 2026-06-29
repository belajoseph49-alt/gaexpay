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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarClock, Search, Pause, Play, Ban, Zap, Eye,
} from "lucide-react";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import {
  SectionHeader, StatusBadge, LoadingTable, EmptyState, KpiCard, apiAction, showError,
} from "./shared";

export function ScheduledSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [frequency, setFrequency] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [viewTarget, setViewTarget] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (status !== "all") p.set("status", status);
    if (frequency !== "all") p.set("frequency", frequency);
    return `/api/admin/scheduled?${p.toString()}&k=${reloadKey}`;
  }, [search, status, frequency, reloadKey]);

  const { data, loading } = useFetch<{ scheduled: any[] }>(url);
  const items = data?.scheduled ?? [];

  const totalActive = items.filter((i) => i.status === "active").length;
  const totalPaused = items.filter((i) => i.status === "paused").length;
  const totalCancelled = items.filter((i) => i.status === "cancelled").length;
  const totalVolume = items
    .filter((i) => i.status === "active")
    .reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Scheduled Transfers"
        description={`${items.length} schedules · ${totalActive} active · ${totalPaused} paused · ${formatMoney(totalVolume, "NGN")} pending volume`}
        icon={CalendarClock}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={CalendarClock} label="Total Schedules" value={items.length} color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={Play} label="Active" value={totalActive} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Pause} label="Paused" value={totalPaused} color="bg-sky-500/15 text-sky-500" />
        <KpiCard icon={Ban} label="Cancelled" value={totalCancelled} color="bg-rose-500/15 text-rose-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by recipient, user, note…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Frequency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frequencies</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="once">Once</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
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
                  <TableHead>Recipient</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={10}><EmptyState message="No scheduled transfers found" icon={CalendarClock} /></TableCell></TableRow>
                )}
                {items.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{s.user?.firstName} {s.user?.lastName}</p>
                      <p className="text-muted-foreground">{s.user?.email}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="font-medium text-sm">{s.recipientName}</p>
                      <p className="text-muted-foreground">{s.recipientAccount} {s.recipientBank && `· ${s.recipientBank}`}</p>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatMoney(s.amount, s.currency)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{s.method}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{s.frequency}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(s.nextRunAt).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{s.lastRunAt ? timeAgo(s.lastRunAt) : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">{s.totalRuns}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewTarget(s)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {s.status === "active" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-sky-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/scheduled?action=pause`, "PATCH", { transferId: s.id }, "Transfer paused");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Pause"><Pause className="h-3.5 w-3.5" /></Button>
                        ) : s.status === "paused" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/scheduled?action=resume`, "PATCH", { transferId: s.id }, "Transfer resumed");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Resume"><Play className="h-3.5 w-3.5" /></Button>
                        ) : null}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={async () => {
                          const r = await apiAction(`/api/admin/scheduled?action=execute`, "PATCH", { transferId: s.id }, "Execution triggered");
                          if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                        }} title="Execute now" disabled={s.status === "cancelled" || s.status === "completed"}>
                          <Zap className="h-3.5 w-3.5" />
                        </Button>
                        {s.status !== "cancelled" && s.status !== "completed" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setCancelTarget(s)} title="Cancel">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ViewDialog transfer={viewTarget} onClose={() => setViewTarget(null)} />
      <CancelDialog transfer={cancelTarget} onClose={() => setCancelTarget(null)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}

function ViewDialog({ transfer, onClose }: { transfer: any; onClose: () => void }) {
  if (!transfer) return null;
  const rows: [string, string][] = [
    ["User", `${transfer.user?.firstName} ${transfer.user?.lastName} (${transfer.user?.email})`],
    ["Recipient", transfer.recipientName],
    ["Account", transfer.recipientAccount || "—"],
    ["Bank / Provider", transfer.recipientBank || transfer.provider || "—"],
    ["Method", transfer.method],
    ["Amount", formatMoney(transfer.amount, transfer.currency)],
    ["Currency", transfer.currency],
    ["Frequency", transfer.frequency],
    ["Note", transfer.note || "—"],
    ["Next run", new Date(transfer.nextRunAt).toLocaleString()],
    ["Last run", transfer.lastRunAt ? new Date(transfer.lastRunAt).toLocaleString() : "—"],
    ["Total runs", String(transfer.totalRuns)],
    ["Status", transfer.status],
    ["Created", new Date(transfer.createdAt).toLocaleString()],
  ];
  return (
    <Dialog open={!!transfer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scheduled transfer details</DialogTitle>
          <DialogDescription>Reference ID: {transfer.id}</DialogDescription>
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

function CancelDialog({ transfer, onClose, onSaved }: { transfer: any; onClose: () => void; onSaved: () => void }) {
  if (!transfer) return null;
  return (
    <AlertDialog open={!!transfer} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this scheduled transfer?</AlertDialogTitle>
          <AlertDialogDescription>
            The scheduled transfer of <strong>{formatMoney(transfer.amount, transfer.currency)}</strong> to{" "}
            <strong>{transfer.recipientName}</strong> will be permanently cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={async () => {
            const r = await apiAction(`/api/admin/scheduled?action=cancel`, "PATCH", { transferId: transfer.id }, "Transfer cancelled");
            if (!r.ok) showError(r.error || "Failed"); else { onSaved(); onClose(); }
          }}>Cancel transfer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
