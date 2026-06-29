"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Smartphone, Bell, Plus, Search, Edit3, Variable } from "lucide-react";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";

const CHANNELS = [
  { id: "email", label: "Email Templates", icon: Mail, color: "bg-indigo-500/15 text-indigo-600" },
  { id: "sms", label: "SMS Templates", icon: Smartphone, color: "bg-violet-500/15 text-violet-600" },
  { id: "push", label: "Push Templates", icon: Bell, color: "bg-amber-500/15 text-amber-600" },
];

export function TemplatesSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/templates");
  const [tab, setTab] = useState("email");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<{ channel: string; tpl: any } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const email = data?.email ?? [];
  const sms = data?.sms ?? [];
  const push = data?.push ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Communication Templates"
        description="Email, SMS & push notification templates with variable substitution"
        icon={Mail}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Template
          </Button>
        }
      />

      {loading ? <LoadingTable rows={6} /> : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1.5" /> Email ({email.length})</TabsTrigger>
            <TabsTrigger value="sms"><Smartphone className="h-4 w-4 mr-1.5" /> SMS ({sms.length})</TabsTrigger>
            <TabsTrigger value="push"><Bell className="h-4 w-4 mr-1.5" /> Push ({push.length})</TabsTrigger>
          </TabsList>

          <div className="mt-3">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <TabsContent value="email" className="mt-3">
            <Card className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Body Preview</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {email.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState message="No email templates" icon={Mail} /></TableCell></TableRow>}
                    {email
                      .filter((t: any) => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()))
                      .map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setEditTarget({ channel: "email", tpl: t })}>
                          <TableCell className="font-medium text-sm">{t.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">{t.subject}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{t.body?.slice(0, 80)}…</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(t.variables ?? []).map((v: string) => (
                                <Badge key={v} variant="outline" className="text-[9px] font-mono">{`{{${v}}}`}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${t.status === "active" ? "text-violet-600 bg-violet-500/15" : "text-muted-foreground"}`}>
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditTarget({ channel: "email", tpl: t }); }}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sms" className="mt-3">
            <Card className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Body</TableHead>
                      <TableHead className="text-center">Chars</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sms.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState message="No SMS templates" icon={Smartphone} /></TableCell></TableRow>}
                    {sms
                      .filter((t: any) => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.body?.toLowerCase().includes(search.toLowerCase()))
                      .map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setEditTarget({ channel: "sms", tpl: t })}>
                          <TableCell className="font-medium text-sm">{t.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">{t.body}</TableCell>
                          <TableCell className="text-center tabular-nums text-xs">{t.body?.length ?? 0}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(t.variables ?? []).map((v: string) => (
                                <Badge key={v} variant="outline" className="text-[9px] font-mono">{`{{${v}}}`}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${t.status === "active" ? "text-violet-600 bg-violet-500/15" : "text-muted-foreground"}`}>
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditTarget({ channel: "sms", tpl: t }); }}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="push" className="mt-3">
            <Card className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Body</TableHead>
                      <TableHead>Icon</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {push.length === 0 && <TableRow><TableCell colSpan={7}><EmptyState message="No push templates" icon={Bell} /></TableCell></TableRow>}
                    {push
                      .filter((t: any) => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.title?.toLowerCase().includes(search.toLowerCase()))
                      .map((t: any) => (
                        <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setEditTarget({ channel: "push", tpl: t })}>
                          <TableCell className="font-medium text-sm">{t.name}</TableCell>
                          <TableCell className="text-sm">{t.title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{t.body}</TableCell>
                          <TableCell className="text-lg">{t.icon}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(t.variables ?? []).map((v: string) => (
                                <Badge key={v} variant="outline" className="text-[9px] font-mono">{`{{${v}}}`}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${t.status === "active" ? "text-violet-600 bg-violet-500/15" : "text-muted-foreground"}`}>
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditTarget({ channel: "push", tpl: t }); }}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <EditTemplateDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); reload(); }}
      />

      <CreateTemplateDialog
        open={createOpen}
        defaultChannel={tab}
        onClose={() => setCreateOpen(false)}
        onSaved={() => { setCreateOpen(false); reload(); }}
      />
    </div>
  );
}

function EditTemplateDialog({ target, onClose, onSaved }: { target: { channel: string; tpl: any } | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  const [lastId, setLastId] = useState<string | null>(null);

  if (target && target.tpl.id !== lastId) {
    setForm({ ...target.tpl });
    setLastId(target.tpl.id);
  }
  if (!target) return null;

  const channel = target.channel;
  const isEmail = channel === "email";
  const isSms = channel === "sms";
  const isPush = channel === "push";

  function insertVar(variable: string) {
    if (isEmail) {
      setForm({ ...form, body: `${form.body ?? ""}{{${variable}}}` });
    } else if (isSms) {
      setForm({ ...form, body: `${form.body ?? ""}{{${variable}}}` });
    } else {
      setForm({ ...form, body: `${form.body ?? ""}{{${variable}}}` });
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {channel} template</DialogTitle>
          <DialogDescription>{form.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label>Name</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          {isEmail && (
            <div>
              <Label>Subject</Label>
              <Input value={form.subject ?? ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          )}
          {isPush && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Icon (emoji)</Label>
                <Input value={form.icon ?? ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
          )}
          <div>
            <Label>Body</Label>
            <Textarea
              value={form.body ?? ""}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={isSms ? 3 : 8}
              className="font-mono text-xs"
            />
            {isSms && <p className="text-[10px] text-muted-foreground mt-1">{(form.body ?? "").length} characters ({Math.ceil((form.body ?? "").length / 160)} SMS)</p>}
          </div>

          {/* Variable insertion helper */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Variable className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold">Variables</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(form.variables ?? []).map((v: string) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVar(v)}
                  className="rounded-md border bg-card px-2 py-1 text-[10px] font-mono hover:bg-primary/10"
                >
                  {`{{${v}}}`}
                </button>
              ))}
              {(form.variables ?? []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">No variables defined for this template.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="text-sm">Active</Label>
            <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            const r = await apiAction(`/api/admin/templates`, "PATCH", { channel, id: form.id, updates: form }, "Template saved");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTemplateDialog({ open, defaultChannel, onClose, onSaved }: { open: boolean; defaultChannel: string; onClose: () => void; onSaved: () => void }) {
  const [channel, setChannel] = useState(defaultChannel);
  const [form, setForm] = useState<any>({ name: "", subject: "", title: "", body: "", icon: "🔔", status: "active", variables: [] });
  const [varInput, setVarInput] = useState("");

  if (open && channel !== defaultChannel) {
    setChannel(defaultChannel);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Template</DialogTitle>
          <DialogDescription>Create a new communication template</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Channel</Label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Welcome Email" />
            </div>
          </div>
          {channel === "email" && (
            <div>
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Welcome to GaexPay, {{firstName}}!" />
            </div>
          )}
          {channel === "push" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Icon (emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
          )}
          <div>
            <Label>Body</Label>
            <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} className="font-mono text-xs" />
          </div>
          <div>
            <Label>Variables (add one at a time)</Label>
            <div className="flex gap-2">
              <Input value={varInput} onChange={(e) => setVarInput(e.target.value)} placeholder="e.g., firstName" />
              <Button type="button" size="sm" variant="outline" onClick={() => {
                if (varInput.trim()) {
                  setForm({ ...form, variables: [...(form.variables ?? []), varInput.trim()] });
                  setVarInput("");
                }
              }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(form.variables ?? []).map((v: string) => (
                <Badge key={v} variant="outline" className="text-[10px] font-mono">{`{{${v}}}`}</Badge>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            if (!form.name) { showError("Name is required"); return; }
            const r = await apiAction(`/api/admin/templates`, "POST", { channel, ...form }, "Template created");
            if (!r.ok) showError(r.error || "Failed"); else onSaved();
          }}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
