"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Crown, Shield, Mail, Trash2, MoreVertical,
  Loader2, Check, X, Briefcase, Eye, Pencil, ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BusinessUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  businessProfile: { companyName: string; kybStatus: string } | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "invited" | "suspended";
  permissions: string[];
  lastActive?: string;
  you?: boolean;
}

const ROLES = [
  { id: "owner", label: "Owner", desc: "Full access · all permissions", icon: Crown, color: "amber" },
  { id: "admin", label: "Admin", desc: "Manage team, transactions, settings", icon: ShieldCheck, color: "primary" },
  { id: "accountant", label: "Accountant", desc: "View & export transactions, invoices", icon: Briefcase, color: "violet" },
  { id: "viewer", label: "Viewer", desc: "Read-only access to dashboard", icon: Eye, color: "muted" },
];

// Mocked team data — in production this would come from /api/business/team
function buildTeam(user?: BusinessUser): TeamMember[] {
  const owner = user
    ? { name: `${user.firstName} ${user.lastName}`, email: user.email }
    : { name: "Owner", email: "owner@business.com" };
  return [
    {
      id: "1",
      name: owner.name,
      email: owner.email,
      role: "owner",
      status: "active",
      permissions: ["*"],
      lastActive: "now",
      you: true,
    },
    {
      id: "2",
      name: "Adaeze Okonkwo",
      email: "adaeze@business.com",
      role: "admin",
      status: "active",
      permissions: ["team.manage", "transactions.view", "invoices.manage"],
      lastActive: "2h ago",
    },
    {
      id: "3",
      name: "Tunde Bello",
      email: "tunde@business.com",
      role: "accountant",
      status: "active",
      permissions: ["transactions.view", "statements.view"],
      lastActive: "1d ago",
    },
    {
      id: "4",
      name: "Mariam Yusuf",
      email: "mariam@business.com",
      role: "viewer",
      status: "invited",
      permissions: ["dashboard.view"],
    },
  ];
}

export function TeamView() {
  const { data: meData } = useFetch<{ user: BusinessUser }>("/api/auth/me");
  const [members, setMembers] = useState<TeamMember[]>(buildTeam(meData?.user));
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "viewer", name: "" });

  // Re-sync when /me loads
  if (meData?.user && members[0]?.email !== meData.user.email) {
    setMembers(buildTeam(meData.user));
  }

  const sendInvite = async () => {
    if (!invite.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setInviteOpen(false);
    const newMember: TeamMember = {
      id: String(Date.now()),
      name: invite.name || invite.email.split("@")[0],
      email: invite.email,
      role: invite.role,
      status: "invited",
      permissions: ["dashboard.view"],
    };
    setMembers((m) => [...m, newMember]);
    toast.success(`Invitation sent to ${invite.email}`);
    setInvite({ email: "", role: "viewer", name: "" });
  };

  const removeMember = (id: string) => {
    setMembers((m) => m.filter((x) => x.id !== id));
    toast.success("Member removed");
  };

  const updateRole = (id: string, role: string) => {
    setMembers((m) =>
      m.map((x) => (x.id === id ? { ...x, role } : x)),
    );
    toast.success("Role updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-sm text-muted-foreground">
            Invite team members, assign roles & manage permissions
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite Member
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const count = members.filter((m) => m.role === r.id).length;
          return (
            <Card key={r.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg",
                    r.color === "amber" && "bg-amber-500/15 text-amber-600",
                    r.color === "primary" && "bg-primary/10 text-primary",
                    r.color === "violet" && "bg-violet-500/15 text-violet-600",
                    r.color === "muted" && "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-[10px]">{count}</Badge>
              </div>
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
            </Card>
          );
        })}
      </div>

      {/* Members table */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Team Members</h3>
          <Badge variant="outline" className="text-[10px]">
            {members.length} total · {members.filter((m) => m.status === "active").length} active
          </Badge>
        </div>

        <div className="space-y-2">
          {members.map((m) => {
            const roleDef = ROLES.find((r) => r.id === m.role);
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-[11px] font-bold text-primary-foreground">
                    {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {m.name}
                    {m.you && <Badge variant="outline" className="text-[9px] py-0">You</Badge>}
                    {m.role === "owner" && <Crown className="h-3 w-3 text-amber-500" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>

                <div className="hidden sm:block text-right text-xs">
                  <p className="text-muted-foreground">Last active</p>
                  <p className="font-medium">{m.lastActive || "—"}</p>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    m.status === "active" && "border-violet-500/40 text-violet-600",
                    m.status === "invited" && "border-amber-500/40 text-amber-600",
                    m.status === "suspended" && "border-rose-500/40 text-rose-600",
                  )}
                >
                  {m.status === "active" && <Check className="mr-1 h-3 w-3" />}
                  {m.status === "invited" && <Mail className="mr-1 h-3 w-3" />}
                  {m.status === "suspended" && <X className="mr-1 h-3 w-3" />}
                  {m.status}
                </Badge>

                <Select
                  value={m.role}
                  onValueChange={(v) => updateRole(m.id, v)}
                  disabled={m.role === "owner"}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem
                        key={r.id}
                        value={r.id}
                        disabled={r.id === "owner" && m.role !== "owner"}
                      >
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={m.role === "owner"}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => toast.info("Permission editor coming soon")}
                    >
                      <Shield className="mr-2 h-3.5 w-3.5" />
                      <span>Permissions</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => toast.info("Edit profile coming soon")}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onSelect={() => removeMember(m.id)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      <span>Remove</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              They&apos;ll receive an email invitation to join your business workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Full name (optional)</Label>
              <Input
                value={invite.name}
                onChange={(e) => setInvite((i) => ({ ...i, name: e.target.value }))}
                placeholder="Jane Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={invite.email}
                onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))}
                placeholder="jane@business.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select
                value={invite.role}
                onValueChange={(v) => setInvite((i) => ({ ...i, role: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r.id !== "owner").map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label} — {r.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite}>
              <Mail className="mr-1.5 h-4 w-4" /> Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
