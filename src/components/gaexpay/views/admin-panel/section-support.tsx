"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Headphones, Search, Eye, Send, AlertCircle, CheckCircle2, Clock,
  Smile, TrendingUp, UserCog, ChevronDown,
} from "lucide-react";
import { timeAgo } from "@/lib/gaexpay";
import { SectionHeader, StatusBadge, LoadingTable, EmptyState, KpiCard, apiAction, showError } from "./shared";
import { cn } from "@/lib/utils";

interface TicketMessage {
  id: string;
  senderType: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatar?: string | null; accountType?: string };
  messages: TicketMessage[];
}

interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar?: string | null;
}

interface SupportData {
  tickets: SupportTicket[];
  stats: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    avgResolutionHours: number;
    satisfactionRate: number;
    urgent: number;
  };
  agents: Agent[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-600",
  medium: "bg-sky-500/15 text-sky-600",
  high: "bg-amber-500/15 text-amber-600",
  urgent: "bg-rose-500/15 text-rose-600",
};

export function SupportSection() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [detail, setDetail] = useState<SupportTicket | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (status !== "all") p.set("status", status);
    if (priority !== "all") p.set("priority", priority);
    return `/api/admin/support?${p.toString()}&k=${reloadKey}`;
  }, [search, status, priority, reloadKey]);

  const { data, loading } = useFetch<SupportData>(url);
  const tickets = data?.tickets ?? [];
  const stats = data?.stats;
  const agents = data?.agents ?? [];

  async function refresh() {
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Support Tickets"
        description="Customer support center — ticket triage, assignment & replies"
        icon={Headphones}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={AlertCircle} label="Open Tickets" value={stats?.open ?? 0} color="bg-sky-500/15 text-sky-500" />
        <KpiCard icon={Clock} label="Avg Resolution" value={stats ? `${stats.avgResolutionHours}h` : "—"} color="bg-amber-500/15 text-amber-500" />
        <KpiCard icon={Smile} label="Satisfaction Rate" value={stats ? `${stats.satisfactionRate}%` : "—"} color="bg-violet-500/15 text-violet-500" />
        <KpiCard icon={TrendingUp} label="Urgent Tickets" value={stats?.urgent ?? 0} color="bg-rose-500/15 text-rose-500" />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subject, user, ticket ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
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
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.length === 0 && (
                  <TableRow><TableCell colSpan={9}><EmptyState message="No tickets found" icon={Headphones} /></TableCell></TableRow>
                )}
                {tickets.map((t) => {
                  const lastMsg = t.messages[t.messages.length - 1];
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(t)}>
                      <TableCell>
                        <span className="text-xs font-mono">#{t.id.slice(-6)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-sky-500/15 text-sky-600">
                              {t.user?.firstName?.[0]}{t.user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{t.user?.firstName} {t.user?.lastName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{t.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium truncate max-w-[200px]">{t.subject}</p>
                        <Badge variant="outline" className="text-[9px] capitalize mt-0.5">{t.category}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] capitalize border-0", PRIORITY_COLORS[t.priority])}>
                          {t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.assignedTo
                          ? (agents.find((a) => a.id === t.assignedTo)
                            ? <span>{agents.find((a) => a.id === t.assignedTo)!.firstName} {agents.find((a) => a.id === t.assignedTo)!.lastName?.[0]}.</span>
                            : <span className="text-muted-foreground">Assigned</span>)
                          : <Badge variant="outline" className="text-[10px] text-muted-foreground">Unassigned</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{lastMsg ? timeAgo(lastMsg.createdAt) : "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetail(t)} title="View conversation"><Eye className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <TicketDetailDialog
        ticket={detail}
        agents={agents}
        onClose={() => setDetail(null)}
        onUpdated={() => { setDetail(null); refresh(); }}
      />
    </div>
  );
}

function TicketDetailDialog({
  ticket, agents, onClose, onUpdated,
}: {
  ticket: SupportTicket | null;
  agents: Agent[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  if (!ticket) return null;

  async function submitReply() {
    if (!ticket || !reply) return;
    setSending(true);
    const r = await apiAction(`/api/admin/support?action=reply`, "PATCH", { ticketId: ticket.id, reply }, "Reply sent");
    setSending(false);
    if (!r.ok) return showError(r.error || "Failed to send reply");
    setReply("");
    onUpdated();
  }

  async function assign(agentId: string) {
    if (!ticket) return;
    const r = await apiAction(`/api/admin/support?action=assign`, "PATCH", { ticketId: ticket.id, agentId }, "Ticket assigned");
    if (!r.ok) showError(r.error || "Failed"); else onUpdated();
  }

  async function changeStatus(s: string) {
    if (!ticket) return;
    const r = await apiAction(`/api/admin/support?action=status`, "PATCH", { ticketId: ticket.id, status: s }, "Status updated");
    if (!r.ok) showError(r.error || "Failed"); else onUpdated();
  }

  async function changePriority(p: string) {
    if (!ticket) return;
    const r = await apiAction(`/api/admin/support?action=priority`, "PATCH", { ticketId: ticket.id, priority: p }, "Priority updated");
    if (!r.ok) showError(r.error || "Failed"); else onUpdated();
  }

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-mono">#{ticket.id.slice(-6)}</span>
            <span className="truncate">{ticket.subject}</span>
          </DialogTitle>
          <DialogDescription>
            Opened by {ticket.user?.firstName} {ticket.user?.lastName} ({ticket.user?.email}) · {timeAgo(ticket.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] capitalize">{ticket.category}</Badge>
          <StatusBadge status={ticket.status} />
          <Badge variant="outline" className={cn("text-[10px] capitalize border-0", PRIORITY_COLORS[ticket.priority])}>
            {ticket.priority}
          </Badge>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <UserCog className="h-3 w-3 mr-1" /> Assign <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Assign to agent</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {agents.length === 0 && <DropdownMenuItem disabled>No agents available</DropdownMenuItem>}
              {agents.map((a) => (
                <DropdownMenuItem key={a.id} onClick={() => assign(a.id)}>
                  <Avatar className="h-5 w-5 mr-2"><AvatarFallback className="text-[9px]">{a.firstName?.[0]}{a.lastName?.[0]}</AvatarFallback></Avatar>
                  {a.firstName} {a.lastName} <span className="text-[10px] text-muted-foreground ml-1">({a.role})</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Status <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => changeStatus("open")}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeStatus("in_progress")}>In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeStatus("resolved")}>
                <CheckCircle2 className="h-3 w-3 mr-2 text-violet-600" /> Resolved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeStatus("closed")}>Closed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Priority <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => changePriority("low")}>Low</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changePriority("medium")}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changePriority("high")}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changePriority("urgent")} className="text-rose-600">Urgent</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {ticket.assignedTo && (
            <Badge variant="outline" className="text-[10px]">
              Assigned to {agents.find((a) => a.id === ticket.assignedTo)?.firstName ?? "Agent"}
            </Badge>
          )}
        </div>

        {/* Conversation */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {ticket.messages.length === 0 && <EmptyState message="No messages yet — start the conversation below" icon={Headphones} />}
          {ticket.messages.map((m) => {
            const isAgent = m.senderType === "agent" || m.senderType === "system";
            const isAI = m.senderType === "ai";
            return (
              <div key={m.id} className={cn("flex gap-2", isAgent ? "flex-row-reverse" : "flex-row")}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className={cn(
                    "text-[10px]",
                    isAgent ? "bg-blue-500/15 text-blue-600" : isAI ? "bg-violet-500/15 text-violet-600" : "bg-sky-500/15 text-sky-600",
                  )}>
                    {isAgent ? "AG" : isAI ? "AI" : ticket.user?.firstName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "rounded-lg px-3 py-2 max-w-[80%]",
                  isAgent ? "bg-blue-500/10" : isAI ? "bg-violet-500/10" : "bg-muted",
                )}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase">
                      {isAgent ? "Agent" : isAI ? "Gaxie AI" : `${ticket.user?.firstName} ${ticket.user?.lastName}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        <div className="space-y-2 pt-3 border-t">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply to the user…" rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={submitReply} disabled={sending || !reply}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> {sending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
