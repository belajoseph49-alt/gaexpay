"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Store, Search, Eye, CheckCircle2, XCircle, Ban, QrCode, MoreVertical,
  Plus, TrendingUp, Clock, Star, ArrowLeftRight, ShieldCheck,
} from "lucide-react";
import { timeAgo, formatMoney } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, KpiCard, apiAction, showError } from "./shared";
import { toast } from "sonner";

interface Merchant {
  id: string;
  name: string;
  category: string;
  logo: string | null;
  qrCode: string;
  account: string;
  phone: string | null;
  email: string | null;
  status: string;
  rating: number;
  ownerName: string | null;
  volume: number;
  qrCount: number;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface MerchantStats {
  total: number;
  pending: number;
  approved: number;
  suspended: number;
  rejected: number;
  totalQrCodes: number;
  totalVolume: number;
  avgRating: number;
}

export function MerchantsSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [detail, setDetail] = useState<Merchant | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Merchant | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (status !== "all") p.set("status", status);
    if (category !== "all") p.set("category", category);
    return `/api/admin/merchants?${p.toString()}&k=${reloadKey}`;
  }, [search, status, category, reloadKey]);

  const { data, loading } = useFetch<{ merchants: Merchant[]; stats: MerchantStats }>(url);
  const merchants = data?.merchants ?? [];
  const stats = data?.stats;

  async function refresh() {
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Merchant Management"
        description="Approvals, QR codes, monitoring & analytics"
        icon={Store}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Merchant
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Store} label="Total Merchants" value={stats?.total ?? 0} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Clock} label="Pending Approval" value={stats?.pending ?? 0} color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={TrendingUp} label="Total Volume" value={stats ? formatMoney(stats.totalVolume, "NGN") : "—"} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={Star} label="Avg Rating" value={stats ? stats.avgRating.toFixed(2) : "—"} color="bg-yellow-500/15 text-yellow-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search business name, owner, account, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="food">Food & Drink</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="health">Health</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? <div className="p-4"><LoadingTable rows={6} /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">QR Codes</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.length === 0 && (
                  <TableRow><TableCell colSpan={8}><EmptyState message="No merchants found" icon={Store} /></TableCell></TableRow>
                )}
                {merchants.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-violet-500/15 text-violet-600 text-[10px] font-semibold">
                            {m.name?.[0] ?? "S"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground truncate font-mono">{m.account}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{m.ownerName || m.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] capitalize">{m.category}</Badge></TableCell>
                    <TableCell><MerchantStatusBadge status={m.status} /></TableCell>
                    <TableCell className="text-center text-sm">{m.qrCount}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatMoney(m.volume, "NGN")}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {m.rating.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetail(m)} title="View details"><Eye className="h-3.5 w-3.5" /></Button>
                        {(m.status !== "approved" && m.status !== "active") && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/merchants?action=approve`, "PATCH", { merchantId: m.id }, "Merchant approved");
                            if (!r.ok) showError(r.error || "Failed"); else refresh();
                          }} title="Approve"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {m.status !== "rejected" && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => { setRejectTarget(m); setRejectReason(""); }} title="Reject"><XCircle className="h-3.5 w-3.5" /></Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreVertical className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => {
                              const r = await apiAction(`/api/admin/merchants?action=qrcode`, "PATCH", { merchantId: m.id }, "New QR code generated");
                              if (!r.ok) showError(r.error || "Failed"); else refresh();
                            }}>
                              <QrCode className="h-3.5 w-3.5 mr-2" /> Generate QR code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setDetail(m); }}>
                              <ArrowLeftRight className="h-3.5 w-3.5 mr-2" /> View transactions
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {m.status === "suspended" ? (
                              <DropdownMenuItem onClick={async () => {
                                const r = await apiAction(`/api/admin/merchants?action=unsuspend`, "PATCH", { merchantId: m.id }, "Merchant reinstated");
                                if (!r.ok) showError(r.error || "Failed"); else refresh();
                              }}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Reinstate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-rose-600" onClick={async () => {
                                const r = await apiAction(`/api/admin/merchants?action=suspend`, "PATCH", { merchantId: m.id }, "Merchant suspended");
                                if (!r.ok) showError(r.error || "Failed"); else refresh();
                              }}>
                                <Ban className="h-3.5 w-3.5 mr-2" /> Suspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-violet-600" />
              {detail?.name}
            </DialogTitle>
            <DialogDescription>Merchant profile, QR codes & recent activity</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Business Name" value={detail.name} />
                <Info label="Owner" value={detail.ownerName || "—"} />
                <Info label="Category" value={<Badge variant="outline" className="text-[10px] capitalize">{detail.category}</Badge>} />
                <Info label="Status" value={<MerchantStatusBadge status={detail.status} />} />
                <Info label="Account" value={<span className="font-mono text-xs">{detail.account}</span>} />
                <Info label="Phone" value={detail.phone || "—"} />
                <Info label="Email" value={detail.email || "—"} />
                <Info label="Rating" value={
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    {detail.rating.toFixed(2)}
                  </span>
                } />
                <Info label="QR Codes Issued" value={detail.qrCount} />
                <Info label="Total Volume" value={formatMoney(detail.volume, "NGN")} />
                <Info label="Joined" value={timeAgo(detail.createdAt)} />
                <Info label="Approved" value={detail.approvedAt ? timeAgo(detail.approvedAt) : "—"} />
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5"><QrCode className="h-4 w-4 text-violet-600" /> Active QR Code</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                    const r = await apiAction(`/api/admin/merchants?action=qrcode`, "PATCH", { merchantId: detail.id }, "New QR code generated");
                    if (!r.ok) showError(r.error || "Failed"); else { setDetail(null); refresh(); }
                  }}>
                    <QrCode className="h-3 w-3 mr-1" /> Regenerate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground break-all font-mono bg-muted/30 p-2 rounded">{detail.qrCode}</p>
              </div>

              {detail.rejectionReason && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                  <p className="text-xs font-medium text-rose-600">Rejection Reason:</p>
                  <p className="text-sm mt-1">{detail.rejectionReason}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
                {detail.status !== "approved" && detail.status !== "active" && (
                  <Button onClick={async () => {
                    const r = await apiAction(`/api/admin/merchants?action=approve`, "PATCH", { merchantId: detail.id }, "Merchant approved");
                    if (!r.ok) showError(r.error || "Failed"); else { setDetail(null); refresh(); }
                  }}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Merchant Application</DialogTitle>
            <DialogDescription>Provide a reason for rejecting {rejectTarget?.name}&apos;s application</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Rejection reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="E.g., Business registration not found, invalid documentation…" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              const r = await apiAction(`/api/admin/merchants?action=reject`, "PATCH", { merchantId: rejectTarget!.id, reason: rejectReason || "Documentation insufficient" }, "Merchant rejected");
              if (!r.ok) showError(r.error || "Failed"); else { setRejectTarget(null); refresh(); }
            }}>Reject application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateMerchantDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refresh(); }}
      />
    </div>
  );
}

function MerchantStatusBadge({ status }: { status: string }) {
  // Map "active" legacy to "approved" for display
  const display = status === "active" ? "approved" : status;
  return <StatusBadge status={display} />;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function CreateMerchantDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [category, setCategory] = useState("retail");
  const [account, setAccount] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name || !account) return showError("Business name and account are required");
    setSaving(true);
    const r = await apiAction(`/api/admin/merchants`, "POST", {
      name, ownerName, category, account, phone, email,
    }, "Merchant created");
    setSaving(false);
    if (!r.ok) return showError(r.error || "Failed to create merchant");
    toast.success("Merchant created with status pending");
    setName(""); setOwnerName(""); setAccount(""); setPhone(""); setEmail("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-violet-600" /> Create Merchant</DialogTitle>
          <DialogDescription>New merchant will start with status &quot;pending&quot; awaiting approval.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Business Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Kemi Supermarket" />
          </div>
          <div>
            <Label>Owner Name</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="food">Food &amp; Drink</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="health">Health</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Settlement Account *</Label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Bank account / mobile money" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@business.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create merchant"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
