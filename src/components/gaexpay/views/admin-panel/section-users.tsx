"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  Users as UsersIcon, Search, Eye, Ban, CheckCircle2, KeyRound, Trash2, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import { timeAgo } from "@/lib/gaexpay";
import { ROLES } from "@/lib/rbac";
import { SectionHeader, StatusBadge, AccountTypeBadge, LoadingTable, EmptyState, apiAction, showError } from "./shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

export function UsersSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [accountType, setAccountType] = useState("all");
  const [kycStatus, setKycStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [roleUser, setRoleUser] = useState<any | null>(null);
  const [pwUser, setPwUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<any | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (role !== "all") params.set("role", role);
    if (accountType !== "all") params.set("accountType", accountType);
    if (kycStatus !== "all") params.set("kycStatus", kycStatus);
    params.set("limit", "300");
    return `/api/admin/users?${params.toString()}&k=${reloadKey}`;
  }, [search, status, role, accountType, kycStatus, reloadKey]);

  const { data, loading } = useFetch<{ users: any[] }>(url);

  const users = data?.users ?? [];
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paged = users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function toggleSelectAll() {
    setSelected((s) => (s.length === paged.length ? [] : paged.map((u) => u.id)));
  }

  function exportCSV() {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Country", "Account Type", "Role", "KYC", "Status", "Joined"];
    const rows = users.map((u) => [
      u.firstName, u.lastName, u.email, u.phone, u.country, u.accountType, u.role, u.kycStatus, u.status,
      new Date(u.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gaexpay-users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${users.length} users`);
  }

  async function bulkAction(action: "suspend" | "activate") {
    for (const id of selected) {
      await apiAction(`/api/admin/users?action=${action}`, "PATCH", { userId: id });
    }
    toast.success(`${action === "suspend" ? "Suspended" : "Activated"} ${selected.length} users`);
    setSelected([]);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="User Management"
        description={`${users.length} users · filters, search, bulk actions`}
        icon={UsersIcon}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email, phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={accountType} onValueChange={(v) => { setAccountType(v); setPage(0); }}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kycStatus} onValueChange={(v) => { setKycStatus(v); setPage(0); }}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="KYC" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selected.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-primary/5 p-2">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bulkAction("suspend")}>
              <Ban className="h-3 w-3 mr-1" /> Suspend
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => bulkAction("activate")}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Activate
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelected([])}>Clear</Button>
          </div>
        )}
      </Card>

      <Card className="p-0">
        {loading ? (
          <div className="p-4"><LoadingTable rows={6} /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={selected.length === paged.length && paged.length > 0} onChange={toggleSelectAll} className="rounded" />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 && (
                  <TableRow><TableCell colSpan={8}><EmptyState message="No users match your filters" icon={UsersIcon} /></TableCell></TableRow>
                )}
                {paged.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell>
                      <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} className="rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><AccountTypeBadge type={u.accountType} /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{u.role?.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">Tier {u.kycTier}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailUser(u)} title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRoleUser(u)} title="Change role">
                          <Badge className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPwUser(u)} title="Reset password">
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        {u.status === "active" ? (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/users?action=suspend`, "PATCH", { userId: u.id }, "User suspended");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Suspend">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-violet-600" onClick={async () => {
                            const r = await apiAction(`/api/admin/users?action=activate`, "PATCH", { userId: u.id }, "User activated");
                            if (!r.ok) showError(r.error || "Failed"); else setReloadKey((k) => k + 1);
                          }} title="Activate">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600" onClick={() => setDeleteUser(u)} title="Delete">
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

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, users.length)} of {users.length}
            </p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2">Page {page + 1} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">{detailUser.firstName?.[0]}{detailUser.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{detailUser.firstName} {detailUser.lastName}</p>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Phone" value={detailUser.phone} />
                <Info label="Country" value={detailUser.country} />
                <Info label="Account Type" value={<AccountTypeBadge type={detailUser.accountType} />} />
                <Info label="Role" value={<Badge variant="outline" className="text-[10px] capitalize">{detailUser.role}</Badge>} />
                <Info label="KYC" value={<StatusBadge status={detailUser.kycStatus} />} />
                <Info label="Tier" value={`Tier ${detailUser.kycTier}`} />
                <Info label="Status" value={<StatusBadge status={detailUser.status} />} />
                <Info label="Joined" value={timeAgo(detailUser.createdAt)} />
                <Info label="Last login" value={detailUser.lastLoginAt ? timeAgo(detailUser.lastLoginAt) : "Never"} />
                <Info label="Reward Points" value={String(detailUser.rewardPoints ?? 0)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setEditUser(detailUser); setDetailUser(null); }}>Edit</Button>
                <Button onClick={() => setDetailUser(null)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <EditUserDialog user={editUser} onClose={() => setEditUser(null)} onSaved={() => setReloadKey((k) => k + 1)} />

      {/* Role dialog */}
      <ChangeRoleDialog user={roleUser} onClose={() => setRoleUser(null)} onSaved={() => setReloadKey((k) => k + 1)} />

      {/* Reset password dialog */}
      <ResetPasswordDialog user={pwUser} onClose={() => setPwUser(null)} />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently close {deleteUser?.firstName} {deleteUser?.lastName}&apos;s account ({deleteUser?.email}). Their data will be retained for audit purposes but the account will be marked as closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                const r = await apiAction(`/api/admin/users?userId=${deleteUser.id}`, "DELETE", undefined, "User deleted");
                if (!r.ok) showError(r.error || "Failed");
                else setReloadKey((k) => k + 1);
                setDeleteUser(null);
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function EditUserDialog({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  // Sync form when user changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (user && user.id !== lastId) {
    setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, country: user.country, accountType: user.accountType, kycStatus: user.kycStatus, kycTier: user.kycTier });
    setLastId(user.id);
  }
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update profile information</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First name</Label><Input value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
          <div><Label>Last name</Label><Input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Country</Label><Input value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div>
            <Label>Account type</Label>
            <Select value={form.accountType || "personal"} onValueChange={(v) => setForm({ ...form, accountType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>KYC status</Label>
            <Select value={form.kycStatus || "unverified"} onValueChange={(v) => setForm({ ...form, kycStatus: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>KYC tier</Label><Input type="number" min={0} max={3} value={form.kycTier ?? 0} onChange={(e) => setForm({ ...form, kycTier: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/users?action=edit`, "PATCH", { userId: user.id, ...form }, "User updated");
            if (!r.ok) return showError(r.error || "Failed");
            onClose(); onSaved();
          }}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleDialog({ user, onClose, onSaved }: { user: any; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<string>("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (user && user.id !== lastId) { setRole(user.role); setLastId(user.id); }
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>Assign a new role to {user.firstName} {user.lastName}</DialogDescription>
        </DialogHeader>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label} — {r.description}</SelectItem>)}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/users?action=role`, "PATCH", { userId: user.id, role }, "Role updated");
            if (!r.ok) return showError(r.error || "Failed");
            onClose(); onSaved();
          }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  if (user && user.id !== lastId) { setPw(""); setLastId(user.id); }
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>Set a new password for {user.firstName} {user.lastName}</DialogDescription>
        </DialogHeader>
        <div>
          <Label>New password (min 8 chars)</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/users?action=password`, "PATCH", { userId: user.id, newPassword: pw }, "Password reset");
            if (!r.ok) return showError(r.error || "Failed");
            onClose();
          }}>Reset password</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
