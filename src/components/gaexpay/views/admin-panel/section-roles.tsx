"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Shield, Users as UsersIcon, Grid, KeySquare } from "lucide-react";
import { ROLES } from "@/lib/rbac";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RolesSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/roles");
  const users = useFetch<{ users: any[] }>("/api/admin/users?limit=300");
  const [tab, setTab] = useState("roles");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("user");

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Roles & Permissions" description="RBAC matrix, role assignment" icon={Shield} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Roles & Permissions"
        description="9 roles · 60+ permissions · granular access control"
        icon={Shield}
        actions={
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            <KeySquare className="h-4 w-4 mr-1.5" /> Assign Role
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-1.5" /> Roles</TabsTrigger>
          <TabsTrigger value="matrix"><Grid className="h-4 w-4 mr-1.5" /> Permission Matrix</TabsTrigger>
          <TabsTrigger value="users"><UsersIcon className="h-4 w-4 mr-1.5" /> Users & Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.roles.map((r: any) => (
              <Card key={r.value} className="p-4 card-lift">
                <div className="flex items-start justify-between mb-2">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.userCount} users</Badge>
                </div>
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-xs text-muted-foreground mb-2">{r.description}</p>
                <div className="flex flex-wrap gap-1">
                  {r.value === "super_admin" ? (
                    <Badge className="bg-rose-500/15 text-rose-600 border-0 text-[9px]">Wildcard (*)</Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-[9px]">{r.permissions.length} perms</Badge>
                      {r.permissions.slice(0, 3).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-[9px] text-muted-foreground">{p}</Badge>
                      ))}
                      {r.permissions.length > 3 && <Badge variant="outline" className="text-[9px] text-muted-foreground">+{r.permissions.length - 3}</Badge>}
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card">Permission</TableHead>
                    {data.roles.map((r: any) => (
                      <TableHead key={r.value} className="text-center min-w-[80px]">{r.label.split(" ")[0]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.grouped).map(([domain, perms]: [string, any]) => (
                    <>
                      <TableRow key={domain} className="bg-muted/30">
                        <TableCell colSpan={data.roles.length + 1} className="text-xs font-semibold uppercase text-muted-foreground">
                          {domain}
                        </TableCell>
                      </TableRow>
                      {(perms as string[]).map((p) => {
                        const row = data.matrix.find((m: any) => m.permission === p);
                        return (
                          <TableRow key={p}>
                            <TableCell className="font-mono text-xs sticky left-0 bg-card">{p}</TableCell>
                            {data.roles.map((r: any) => {
                              const has = row?.roles?.[r.value];
                              return (
                                <TableCell key={r.value} className="text-center">
                                  {has ? (
                                    <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
                                  ) : (
                                    <span className="inline-block h-2 w-2 rounded-full bg-muted" />
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="p-0">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Change Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users.data?.users ?? []).length === 0 && <TableRow><TableCell colSpan={5}><EmptyState message="No users" /></TableCell></TableRow>}
                  {(users.data?.users ?? []).map((u: any) => (
                    <TableRow key={u.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium">{u.firstName} {u.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{u.role?.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{u.accountType}</TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={u.role}
                          onValueChange={async (v) => {
                            const r = await apiAction(`/api/admin/roles`, "PATCH", { userId: u.id, role: v }, "Role updated");
                            if (!r.ok) showError(r.error || "Failed"); else { users.reload(); reload(); }
                          }}
                        >
                          <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assign role dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>Choose a user and role to assign</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Select user…" /></SelectTrigger>
                <SelectContent>
                  {(users.data?.users ?? []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label} — {r.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              if (!selectedUser) return showError("Select a user first");
              const r = await apiAction(`/api/admin/roles`, "PATCH", { userId: selectedUser, role: selectedRole }, "Role assigned");
              if (!r.ok) showError(r.error || "Failed"); else { setAssignOpen(false); users.reload(); reload(); }
            }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
