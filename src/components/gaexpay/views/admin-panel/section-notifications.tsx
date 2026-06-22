"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, Send, History, Mail, MessageSquare, Smartphone } from "lucide-react";
import { SectionHeader, LoadingTable, EmptyState, apiAction, showError } from "./shared";
import { toast } from "sonner";
import { timeAgo } from "@/lib/gaexpay";

export function NotificationsSection() {
  const [tab, setTab] = useState("compose");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [channel, setChannel] = useState("in_app");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);

  // History — fetch recent broadcast notifications
  const history = useFetch<{ notifications: any[] }>("/api/notifications");

  async function send() {
    if (!title || !message) return showError("Title and message are required");
    setSending(true);
    const r = await apiAction(`/api/admin/notifications/broadcast`, "POST", {
      title, message, type, channel, segment,
    });
    setSending(false);
    if (!r.ok) return showError(r.error || "Failed to send");
    toast.success(`Notification sent to ${r.data?.recipients ?? 0} recipients`);
    setTitle(""); setMessage("");
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Notification Management"
        description="Broadcast platform-wide or segment-targeted notifications"
        icon={Bell}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="compose"><Send className="h-4 w-4 mr-1.5" /> Compose</TabsTrigger>
          <TabsTrigger value="templates"><Mail className="h-4 w-4 mr-1.5" /> Templates</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <Card className="p-5 max-w-2xl">
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Scheduled maintenance window" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Notification body…" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="promo">Promo</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-App</SelectItem>
                      <SelectItem value="push">Push</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segment</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="personal">Personal accounts</SelectItem>
                      <SelectItem value="business">Business accounts</SelectItem>
                      <SelectItem value="unverified">Unverified</SelectItem>
                      <SelectItem value="pending_kyc">Pending KYC</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                {channel === "email" && <Mail className="h-4 w-4" />}
                {channel === "sms" && <Smartphone className="h-4 w-4" />}
                {channel === "push" && <Bell className="h-4 w-4" />}
                {channel === "in_app" && <MessageSquare className="h-4 w-4" />}
                The notification will be delivered to all matching active users.
              </div>
              <Button onClick={send} disabled={sending} className="w-full">
                {sending ? "Sending…" : "Send notification"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Notification Templates</h3>
            <div className="space-y-2">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.body}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{t.channel}</Badge>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setTitle(t.name); setMessage(t.body); setTab("compose"); }}>Use</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Notification History (recent)</h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {history.loading ? <LoadingTable rows={5} /> : (
                (history.data?.notifications ?? []).length === 0 ? <EmptyState message="No notifications sent" icon={History} /> :
                (history.data?.notifications ?? []).map((n: any) => (
                  <div key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary text-xs">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{n.channel}</Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TEMPLATES = [
  { id: 1, name: "Welcome to GaexPay", body: "Welcome to GaexPay! Your digital wallet is ready. Send, save & spend smarter.", channel: "in_app" },
  { id: 2, name: "Scheduled Maintenance", body: "GaexPay will undergo scheduled maintenance on Sunday from 2-4 AM. Service may be briefly interrupted.", channel: "email" },
  { id: 3, name: "New Feature: Crypto Swap", body: "You can now swap between 15+ cryptocurrencies instantly with 0 fees for the first month!", channel: "push" },
  { id: 4, name: "Security Alert", body: "We noticed a login from a new device. If this wasn't you, please secure your account immediately.", channel: "sms" },
  { id: 5, name: "Promo: Zero fees weekend", body: "Enjoy zero fees on all transfers this weekend! Up to ₦500,000 per transaction.", channel: "push" },
  { id: 6, name: "KYC Approval", body: "Congratulations! Your KYC verification has been approved. You now have access to higher limits.", channel: "in_app" },
];
