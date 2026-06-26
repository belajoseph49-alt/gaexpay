"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  LifeBuoy, MessageSquare, Plus, Bot, User, Send, Loader2, Headphones,
  Mail, Phone, Clock, CheckCircle2, Sparkles, ChevronRight, Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { timeAgo, formatDateTime } from "@/lib/gaexpay";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

const FAQS = [
  { q: "How do I verify my identity (KYC)?", a: "Go to Identity (KYC) section, upload a valid government-issued ID and take a selfie. Verification usually completes within 1-2 hours." },
  { q: "What are the transfer limits?", a: "Limits depend on your KYC tier: check your KYC tier for limits. Upgrade your tier for higher limits." },
  { q: "How long do transfers take?", a: "GaexPay-to-GaexPay transfers are instant. Bank transfers typically take 1-5 minutes. International transfers may take 1-3 business days." },
  { q: "How do I freeze my card?", a: "Go to Cards, select the card, and tap 'Freeze'. You can unfreeze it anytime. Your card details remain secure." },
  { q: "What are the fees?", a: "GaexPay-to-GaexPay is free. Bank transfers have a small fee (small fee). Mobile money has a 1% fee. Bills and airtime are free." },
  { q: "Is my money safe?", a: "Yes. GaexPay uses end-to-end encryption, is PCI-DSS compliant, and funds are held in regulated partner banks. We also offer 2FA and biometric security." },
];

export function SupportView() {
  const { t } = useTranslation();
  const { data } = useFetch<{ tickets: any[] }>("/api/support");
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const { setAiOpen } = useApp();
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const tickets = data?.tickets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("support.title")}</h1>
        <p className="text-sm text-muted-foreground">We're here to help — chat with AI, browse FAQs or contact us</p>
      </div>

      {/* Help options */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer card-lift p-5" onClick={() => setAiOpen(true)}>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Ask Gaxie AI</h3>
          <p className="text-sm text-muted-foreground mt-1">Instant answers 24/7 with our AI assistant</p>
          <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto">Start chatting <ChevronRight className="h-4 w-4" /></Button>
        </Card>
        <Card className="cursor-pointer card-lift p-5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-3">
            <Headphones className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Live Agent</h3>
          <p className="text-sm text-muted-foreground mt-1">Talk to a human support agent</p>
          <Button variant="ghost" size="sm" className="mt-3 p-0 h-auto">Open ticket <ChevronRight className="h-4 w-4" /></Button>
        </Card>
        <Card className="p-5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 text-amber-500 mb-3">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="font-semibold">Email Us</h3>
          <p className="text-sm text-muted-foreground mt-1">help@gaexpay.com</p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Reply within 4 hrs</p>
        </Card>
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets"><MessageSquare className="h-4 w-4 mr-1.5" /> My Tickets</TabsTrigger>
          <TabsTrigger value="faq"><Search className="h-4 w-4 mr-1.5" /> FAQs</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Ticket list */}
            <Card className="p-3 lg:col-span-1">
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 className="font-semibold text-sm">Conversations</h3>
                <Button size="sm" variant="ghost" className="h-7 text-xs"><Plus className="h-3.5 w-3.5" /> New</Button>
              </div>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {tickets.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">No tickets yet</div>
                )}
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={cn(
                      "w-full rounded-lg p-3 text-left transition",
                      activeTicket?.id === t.id ? "bg-primary/10" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate flex-1">{t.subject}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.messages?.[0]?.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(t.updatedAt)}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Chat */}
            <Card className="lg:col-span-2 flex flex-col h-[560px]">
              {activeTicket ? (
                <ChatPanel ticket={activeTicket} />
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <LifeBuoy className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Select a conversation or start a new one</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="faq" className="mt-4">
          <div className="grid gap-3">
            {FAQS.map((f, i) => (
              <details key={i} className="group rounded-xl border bg-card p-4">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-sm list-none">
                  {f.q}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, any> = {
    open: "bg-sky-500/15 text-sky-600",
    in_progress: "bg-amber-500/15 text-amber-600",
    resolved: "bg-emerald-500/15 text-emerald-600",
    closed: "bg-muted text-muted-foreground",
  };
  return <Badge className={cn("border-0 text-[10px]", map[status])}>{status.replace("_", " ")}</Badge>;
}

function ChatPanel({ ticket }: { ticket: any }) {
  const [messages, setMessages] = useState(ticket.messages || []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages(ticket.messages || []); }, [ticket.id]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const content = input;
    setMessages((m) => [...m, { senderType: "user", content, createdAt: new Date().toISOString() }]);
    setInput("");
    setSending(true);
    try {
      await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, content }),
      });
      // simulate agent reply
      setTimeout(() => {
        setMessages((m) => [...m, {
          senderType: "agent",
          content: "Thanks for your message. I've noted this and will get back to you shortly. In the meantime, you can also ask Gaxie AI for instant help.",
          createdAt: new Date().toISOString(),
        }]);
        setSending(false);
      }, 1500);
    } catch {
      setSending(false);
      toast.error("Failed to send");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <p className="font-semibold text-sm">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground">Ticket #{ticket.id.slice(-8)} · {ticket.priority} priority</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        <div className="space-y-3">
          {messages.map((m: any, i: number) => (
            <div key={i} className={cn("flex gap-2.5", m.senderType === "user" && "flex-row-reverse")}>
              <div className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                m.senderType === "user" ? "bg-primary text-primary-foreground" : m.senderType === "agent" ? "bg-emerald-500/15 text-emerald-500" : "bg-muted",
              )}>
                {m.senderType === "user" ? <User className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
              </div>
              <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm", m.senderType === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm")}>
                <p>{m.content}</p>
                <p className={cn("mt-1 text-[10px]", m.senderType === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button size="icon" onClick={send} disabled={!input.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
