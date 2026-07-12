"use client";

/**
 * src/components/gaexpay/views/gaex-chat-view.tsx — Task 21 (GaexChat)
 *
 * WhatsApp-style social chat with integrated fintech. Users can:
 *   - Browse conversations, send/receive text messages
 *   - Open a quick-action (+) menu inside any chat to:
 *       • Send money to the contact (native payment card in thread)
 *       • Request money from the contact (request card w/ Accept/Pay + Decline)
 *       • Pay a bill and share it (bill split card w/ Pay my share)
 *   - Every financial action creates a transaction card rendered inline as a
 *     native chat message (no popups, no redirects). Real-time wallet balance
 *     is checked inside the API's db.$transaction.
 *   - All chat-initiated transactions also appear in the main wallet history.
 *
 * Three-pane layout:
 *   - Desktop (lg+): conversation list | chat thread
 *   - Mobile: list ↔ thread toggle (selected conversation hides the list)
 *
 * Tabs: Chats | Stories | Calls (Stories/Calls are presentational for now).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, MessageSquarePlus, ArrowLeft, Check, CheckCheck,
  BadgeCheck, Wallet, X, Loader2, Phone, Video, Plus, ArrowDownToLine,
  ArrowUpRight, ArrowDownRight, Receipt, Users, Clock, MoreVertical,
  Camera, Mic, Image as ImageIcon, Circle, CheckCircle2, XCircle,
  Sparkles, Phone as PhoneIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timeAgo, formatMoney, CURRENCY_SYMBOL } from "@/lib/gaexpay";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { useFetch } from "@/hooks/use-fetch";

// ============================================================================
// Types
// ============================================================================

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  avatar?: string | null;
  kycStatus?: string | null;
  status?: string | null;
}

interface ConversationListItem {
  id: string;
  user: Participant;
  lastMessage: {
    id: string;
    content: string;
    kind?: string;
    metadata?: string | null;
    senderId: string;
    status: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  kind: string;
  metadata?: string | null;
  status: string;
  createdAt: string;
}

interface ConversationsResponse {
  conversations: ConversationListItem[];
}
interface MessagesResponse {
  messages: MessageItem[];
}
interface NewConversationResponse {
  conversation: { id: string; user: Participant };
}
interface WalletsResponse {
  wallets: { id: string; currency: string; balance: number; isDefault: boolean }[];
  totalNGN: number;
}

// ============================================================================
// Helpers
// ============================================================================

function initials(p: { firstName?: string; lastName?: string }) {
  const f = p?.firstName?.trim() ?? "";
  const l = p?.lastName?.trim() ?? "";
  return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "U";
}
function fullName(p: Participant) {
  return `${p.firstName} ${p.lastName}`.trim();
}
function parseMeta(m?: string | null): any {
  if (!m) return {};
  try { return JSON.parse(m); } catch { return {}; }
}
/** A short preview string for the conversation list, accounting for financial message kinds. */
function previewFor(last: ConversationListItem["lastMessage"], isMine: boolean): string {
  if (!last) return "";
  const meta = parseMeta(last.metadata);
  const prefix = isMine ? "You: " : "";
  switch (last.kind) {
    case "payment":
      return `${prefix}${meta.direction === "in" ? "Received" : "Paid"} ${CURRENCY_SYMBOL[meta.currency] || ""}${meta.amount?.toLocaleString() ?? ""}`;
    case "request":
      return `${prefix}Requested ${CURRENCY_SYMBOL[meta.currency] || ""}${meta.amount?.toLocaleString() ?? ""}`;
    case "split":
      return `${prefix}Split ${CURRENCY_SYMBOL[meta.currency] || ""}${meta.totalAmount?.toLocaleString() ?? ""} — ${meta.billerName}`;
    case "system":
      return `${prefix}${last.content}`;
    default:
      return `${prefix}${last.content}`;
  }
}

const POLL_MS = 5000;

// ============================================================================
// Main view
// ============================================================================

export function GaexChatView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"chats" | "stories" | "calls">("chats");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
            GaexChat
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 rounded-full">New</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chat with contacts & send money without leaving the conversation.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 w-full max-w-xs">
        {([
          { id: "chats", label: "Chats" },
          { id: "stories", label: "Stories" },
          { id: "calls", label: "Calls" },
        ] as const).map((it) => (
          <button
            key={it.id}
            onClick={() => setTab(it.id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition",
              tab === it.id
                ? "bg-background text-foreground shadow-premium-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "chats" && (
        <ChatsTab selectedConvId={selectedConvId} onSelect={setSelectedConvId} />
      )}
      {tab === "stories" && <StoriesTab />}
      {tab === "calls" && <CallsTab />}
    </div>
  );
}

// ============================================================================
// ChatsTab — conversation list + chat thread
// ============================================================================

function ChatsTab({
  selectedConvId,
  onSelect,
}: {
  selectedConvId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data, loading, refetch } = useFetch<ConversationsResponse>("/api/messaging/conversations");
  const conversations = data?.conversations ?? [];

  // Poll for new conversations/messages
  useEffect(() => {
    const t = setInterval(refetch, POLL_MS);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4 lg:h-[calc(100vh-220px)]">
      {/* Conversation list */}
      <Card
        className={cn(
          "overflow-hidden p-0 flex flex-col",
          selectedConvId && "hidden lg:flex",
        )}
      >
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations…"
              className="h-9 rounded-xl pl-9 text-sm bg-muted/40 border-border/60"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : conversations.length === 0 ? (
            <EmptyConversations />
          ) : (
            conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={selectedConvId === c.id}
                onClick={() => onSelect(c.id)}
              />
            ))
          )}
        </div>
      </Card>

      {/* Chat thread / empty state */}
      <Card className={cn("overflow-hidden p-0 flex flex-col", !selectedConvId && "hidden lg:flex")}>
        {selectedConvId ? (
          <ChatThread
            convId={selectedConvId}
            onBack={() => onSelect(null)}
          />
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 mb-3">
                <MessageSquarePlus className="h-8 w-8" />
              </div>
              <p className="font-semibold">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Pick a contact on the left to start chatting — or send money, request payment, and split bills right inside the chat.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyConversations() {
  return (
    <div className="grid place-items-center px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted/60 text-muted-foreground mb-3">
        <MessageSquarePlus className="h-7 w-7" />
      </div>
      <p className="text-sm font-semibold">No conversations yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Start a new chat from a contact profile or invite a friend to GaexPay.
      </p>
    </div>
  );
}

function ConversationRow({
  conv, active, onClick,
}: {
  conv: ConversationListItem; active: boolean; onClick: () => void;
}) {
  const u = conv.user;
  const last = conv.lastMessage;
  const isMine = last?.senderId === u.id ? false : !!last; // senderId is "me" if not the other user
  // Actually senderId is the author. We don't have "me" id here, so compare:
  // if last.senderId === u.id → the other user sent it; else → I sent it.
  const mine = last && last.senderId !== u.id;
  const preview = previewFor(last, !!mine);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-3 text-left transition border-b border-border/30 last:border-0",
        active ? "bg-primary/8" : "hover:bg-muted/40",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 ring-1 ring-border/60">
          <AvatarImage src={u.avatar || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
            {initials(u)}
          </AvatarFallback>
        </Avatar>
        {/* Online dot — presentational */}
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate flex items-center gap-1">
            {fullName(u)}
            {u.kycStatus === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          </p>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {last ? timeAgo(last.createdAt) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate">{preview}</p>
          {conv.unreadCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shrink-0">
              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// ChatThread — the conversation pane
// ============================================================================

function ChatThread({ convId, onBack }: { convId: string; onBack: () => void }) {
  const { data: meData } = useFetch<{ user: { id: string; firstName: string; lastName: string } }>("/api/me");
  const { data: walletsData } = useFetch<WalletsResponse>("/api/wallets");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [other, setOther] = useState<Participant | null>(null);
  const [modal, setModal] = useState<null | "send" | "request" | "split">(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real-time NGN wallet balance (for quick-action modals)
  const ngnWallet = walletsData?.wallets.find((w) => w.currency === "NGN");
  const ngnBalance = ngnWallet?.balance ?? 0;

  const myId = meData?.user?.id;

  // Fetch messages
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const data: MessagesResponse = await res.json();
      setMessages(data.messages);
      // Derive the "other" participant from the first non-mine message's sender,
      // or from the conversation endpoint. Simpler: fetch conversation detail.
      if (data.messages.length > 0 && myId) {
        const otherMsg = data.messages.find((m) => m.senderId !== myId) || data.messages[0];
        // We need the other user's profile — fetch conversation list to find it.
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [convId, myId]);

  // Fetch conversation detail to get the other participant
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/messaging/conversations", { credentials: "include" });
        if (!res.ok) return;
        const data: ConversationsResponse = await res.json();
        const conv = data.conversations.find((c) => c.id === convId);
        if (conv && !cancelled) setOther(conv.user);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [convId]);

  useEffect(() => {
    setLoading(true);
    loadMessages();
  }, [loadMessages]);

  // Poll for new messages
  useEffect(() => {
    const t = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(t);
  }, [loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendText() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to send");
      }
      await loadMessages();
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
      setText(content); // restore
    } finally {
      setSending(false);
    }
  }

  // After any financial action, reload messages + show toast
  async function onFinancialActionSuccess(msg?: string) {
    await loadMessages();
    if (msg) toast.success(msg);
  }

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 ring-1 ring-border/60">
          <AvatarImage src={other?.avatar || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
            {other ? initials(other) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate flex items-center gap-1">
            {other ? fullName(other) : "Loading…"}
            {other?.kycStatus === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="Voice call">
          <PhoneIcon className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="Video call">
          <Video className="h-[18px] w-[18px]" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-muted/10">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={cn("h-12 rounded-2xl", i % 2 ? "ml-auto w-2/3" : "w-2/3")} />)}
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} msg={m} mine={myId ? m.senderId === myId : false} other={other} onActionDone={onFinancialActionSuccess} />
          ))
        )}
      </div>

      {/* Input bar with quick-action (+) button */}
      <div className="border-t p-2.5 sm:p-3">
        <div className="flex items-end gap-2">
          {/* Quick-action menu trigger */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full shrink-0 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                aria-label="Quick actions"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 rounded-xl">
              <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => setModal("send")}>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 mr-2">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Send money</p>
                  <p className="text-[10px] text-muted-foreground">Pay your contact instantly</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => setModal("request")}>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600 mr-2">
                  <ArrowDownToLine className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Request payment</p>
                  <p className="text-[10px] text-muted-foreground">Ask your contact for money</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => setModal("split")}>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-600 mr-2">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Split a bill</p>
                  <p className="text-[10px] text-muted-foreground">Share a bill 50/50</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text input */}
          <div className="flex-1 relative">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
              placeholder="Type a message…"
              className="h-10 rounded-2xl pr-10 text-sm border-border/60 bg-muted/40"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground transition"
              aria-label="Attach"
              onClick={() => toast.info("Attachments coming soon")}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Send / mic */}
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-premium-sm"
            onClick={sendText}
            disabled={sending || !text.trim()}
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Financial action modals */}
      <SendMoneyModal
        open={modal === "send"}
        onClose={() => setModal(null)}
        convId={convId}
        otherName={other ? fullName(other) : ""}
        balance={ngnBalance}
        onSuccess={(msg) => { setModal(null); onFinancialActionSuccess(msg); }}
      />
      <RequestMoneyModal
        open={modal === "request"}
        onClose={() => setModal(null)}
        convId={convId}
        otherName={other ? fullName(other) : ""}
        onSuccess={(msg) => { setModal(null); onFinancialActionSuccess(msg); }}
      />
      <SplitBillModal
        open={modal === "split"}
        onClose={() => setModal(null)}
        convId={convId}
        otherName={other ? fullName(other) : ""}
        balance={ngnBalance}
        onSuccess={(msg) => { setModal(null); onFinancialActionSuccess(msg); }}
      />
    </>
  );
}

// ============================================================================
// MessageBubble — renders text + financial cards natively
// ============================================================================

function MessageBubble({
  msg, mine, other, onActionDone,
}: {
  msg: MessageItem; mine: boolean; other: Participant | null; onActionDone: (msg?: string) => void;
}) {
  const meta = parseMeta(msg.metadata);

  // Financial / system cards
  if (msg.kind === "payment") {
    return <PaymentCard msg={msg} meta={meta} mine={mine} />;
  }
  if (msg.kind === "request") {
    return <RequestCard msg={msg} meta={meta} mine={mine} onActionDone={onActionDone} />;
  }
  if (msg.kind === "split") {
    return <SplitCard msg={msg} meta={meta} mine={mine} onActionDone={onActionDone} />;
  }
  if (msg.kind === "system") {
    return <SystemBubble msg={msg} meta={meta} />;
  }

  // Plain text bubble
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] sm:max-w-[68%] rounded-2xl px-3.5 py-2 text-sm shadow-premium-xs",
          mine
            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
            : "bg-card border border-border/60 rounded-bl-md",
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        <div className={cn("flex items-center gap-1 mt-1 text-[10px]", mine ? "text-white/70 justify-end" : "text-muted-foreground")}>
          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {mine && <TickStatus status={msg.status} light />}
        </div>
      </div>
    </div>
  );
}

function TickStatus({ status, light }: { status: string; light?: boolean }) {
  if (status === "read") return <CheckCheck className={cn("h-3 w-3", light ? "text-sky-200" : "text-sky-500")} />;
  if (status === "delivered") return <CheckCheck className={cn("h-3 w-3", light ? "text-white/70" : "text-muted-foreground")} />;
  return <Check className={cn("h-3 w-3", light ? "text-white/70" : "text-muted-foreground")} />;
}

// ── Payment card (native transaction card) ────────────────────────────────
function PaymentCard({ msg, meta, mine }: { msg: MessageItem; meta: any; mine: boolean }) {
  const incoming = meta.direction === "in";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl overflow-hidden border border-border/60 shadow-premium-sm bg-card">
          {/* Header strip */}
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-2 text-white",
            incoming ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gradient-to-r from-emerald-600 to-emerald-700",
          )}>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 backdrop-blur">
              {incoming ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{incoming ? "Payment received" : "Payment sent"}</p>
              <p className="text-[10px] text-white/80 leading-tight truncate">
                {incoming ? meta.recipientName ? `from ${meta.recipientName}` : "" : `to ${meta.recipientName || ""}`}
              </p>
            </div>
            {meta.requestPaid && <Badge className="bg-white/20 text-white border-0 text-[9px]">Request paid</Badge>}
            {meta.splitPaid && <Badge className="bg-white/20 text-white border-0 text-[9px]">Split share</Badge>}
          </div>
          {/* Body */}
          <div className="px-3.5 py-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {CURRENCY_SYMBOL[meta.currency] || ""}{Number(meta.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{meta.currency}</p>
            {meta.note && <p className="text-sm text-foreground mt-2 italic">“{meta.note}”</p>}
            <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/40">
              <span className="text-[10px] text-muted-foreground font-mono truncate">{meta.txRef}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {mine && <TickStatus status={msg.status} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Request card (with Accept/Pay + Decline buttons) ──────────────────────
function RequestCard({
  msg, meta, mine, onActionDone,
}: {
  msg: MessageItem; meta: any; mine: boolean; onActionDone: (msg?: string) => void;
}) {
  const [busy, setBusy] = useState<"pay" | "decline" | null>(null);
  // mine === true  → I am the requester (out)
  // mine === false → I am the payer (in) → show Accept/Pay + Decline buttons
  const isPayer = !mine;
  const status: string = meta.status || "pending";

  async function pay() {
    setBusy("pay");
    try {
      const res = await fetch(`/api/messaging/conversations/${msg.conversationId}/payment-request/${meta.requestId}/accept`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to pay");
      onActionDone(`Paid ${CURRENCY_SYMBOL[meta.currency] || ""}${Number(meta.amount).toLocaleString()}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to pay request");
    } finally {
      setBusy(null);
    }
  }
  async function decline() {
    setBusy("decline");
    try {
      const res = await fetch(`/api/messaging/conversations/${msg.conversationId}/payment-request/${meta.requestId}/decline`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to decline");
      onActionDone("Request declined");
    } catch (e: any) {
      toast.error(e.message || "Failed to decline");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl overflow-hidden border border-amber-500/30 shadow-premium-sm bg-card">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 backdrop-blur">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{mine ? "You requested" : "Payment request"}</p>
              <p className="text-[10px] text-white/80 leading-tight truncate">
                {mine ? `from ${meta.recipientName || "contact"}` : `from ${meta.recipientName || "contact"}`}
              </p>
            </div>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {CURRENCY_SYMBOL[meta.currency] || ""}{Number(meta.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{meta.currency}</p>
            {meta.note && <p className="text-sm text-foreground mt-2 italic">“{meta.note}”</p>}
            {/* Status / actions */}
            <div className="mt-3">
              {status === "pending" && isPayer ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-premium-sm"
                    onClick={pay}
                    disabled={busy !== null}
                  >
                    {busy === "pay" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Pay {CURRENCY_SYMBOL[meta.currency] || ""}{Number(meta.amount).toLocaleString()}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={decline}
                    disabled={busy !== null}
                  >
                    {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <StatusPill status={status} />
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {mine && <TickStatus status={msg.status} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "paid") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Paid</span>;
  if (status === "declined") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><XCircle className="h-4 w-4" /> Declined</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><Clock className="h-4 w-4" /> Pending</span>;
}

// ── Split card (with Pay my share button) ─────────────────────────────────
function SplitCard({
  msg, meta, mine, onActionDone,
}: {
  msg: MessageItem; meta: any; mine: boolean; onActionDone: (msg?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(meta.status === "settled" || !mine); // mine = initiator (already paid their share)
  const isPayer = !mine; // the non-initiator owes their share

  async function payShare() {
    setBusy(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${msg.conversationId}/bill-split/${meta.splitId}/pay`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to pay share");
      setPaid(true);
      onActionDone(`Paid your share of ${meta.billerName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to pay share");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl overflow-hidden border border-violet-500/30 shadow-premium-sm bg-card">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 backdrop-blur">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">Bill split — {meta.billerName}</p>
              <p className="text-[10px] text-white/80 leading-tight capitalize">{meta.billerCategory} bill</p>
            </div>
          </div>
          <div className="px-3.5 py-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total bill</p>
                <p className="text-xl font-bold tabular-nums text-foreground">
                  {CURRENCY_SYMBOL[meta.currency] || ""}{Number(meta.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Your share</p>
                <p className="text-lg font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {CURRENCY_SYMBOL[meta.currency] || ""}{Number(meta.myShare).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {meta.note && <p className="text-sm text-foreground mt-2 italic">“{meta.note}”</p>}
            <div className="mt-3">
              {paid || meta.status === "settled" ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> {meta.status === "settled" ? "Split settled" : "Your share paid"}
                </span>
              ) : isPayer ? (
                <Button
                  size="sm"
                  className="w-full h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-premium-sm"
                  onClick={payShare}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wallet className="h-4 w-4 mr-1" />}
                  Pay my share ({CURRENCY_SYMBOL[meta.currency] || ""}{Number(meta.myShare).toLocaleString()})
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <Clock className="h-4 w-4" /> Waiting for contact
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {mine && <TickStatus status={msg.status} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── System bubble (declined notice etc.) ──────────────────────────────────
function SystemBubble({ msg, meta }: { msg: MessageItem; meta: any }) {
  return (
    <div className="flex justify-center">
      <div className="rounded-full bg-muted/70 px-3 py-1 text-[11px] text-muted-foreground text-center max-w-[90%]">
        {msg.content}{meta.amount ? ` · ${CURRENCY_SYMBOL[meta.currency] || ""}${Number(meta.amount).toLocaleString()}` : ""}
      </div>
    </div>
  );
}

// ============================================================================
// Financial action modals
// ============================================================================

function ModalShell({
  open, onClose, title, icon, children,
}: {
  open: boolean; onClose: () => void; title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-0 p-0 sm:rounded-3xl shadow-premium-xl overflow-hidden [&>button]:top-3 [&>button]:right-3 [&>button]:z-30">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2.5 bg-gradient-to-br from-emerald-600 to-teal-800 px-5 py-4 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">{icon}</div>
          <div>
            <p className="text-sm font-semibold leading-tight">{title}</p>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function AmountInput({
  amount, setAmount, quick = [1000, 5000, 10000, 25000],
}: {
  amount: string; setAmount: (v: string) => void; quick?: number[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">Amount</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₦</span>
        <Input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="h-12 rounded-xl pl-8 text-xl font-bold tabular-nums border-border/60"
        />
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmount(String(q))}
            className="rounded-lg border border-border/60 bg-muted/40 py-1 text-[11px] font-semibold hover:bg-muted transition"
          >
            {q >= 1000 ? `${q / 1000}K` : q}
          </button>
        ))}
      </div>
    </div>
  );
}

function SendMoneyModal({
  open, onClose, convId, otherName, balance, onSuccess,
}: {
  open: boolean; onClose: () => void; convId: string; otherName: string; balance: number; onSuccess: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > balance) return toast.error(`Insufficient balance (available: ₦${balance.toLocaleString()})`);
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/send-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: amt, currency: "NGN", note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send money");
      onSuccess(`Sent ₦${amt.toLocaleString()} to ${otherName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send money");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Send money" icon={<ArrowUpRight className="h-5 w-5" />}>
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground text-xs">To</p>
          <p className="font-semibold">{otherName || "—"}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/8 p-3 text-sm flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Available balance</span>
          <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">₦{balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
        <AmountInput amount={amount} setAmount={setAmount} />
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's this for?" className="h-10 rounded-xl" maxLength={120} />
        </div>
        <Button className="w-full h-11 rounded-xl shadow-premium-sm" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowUpRight className="h-4 w-4 mr-1" />}
          Send {amount && Number(amount) > 0 ? `₦${Number(amount).toLocaleString()}` : "money"}
        </Button>
      </div>
    </ModalShell>
  );
}

function RequestMoneyModal({
  open, onClose, convId, otherName, onSuccess,
}: {
  open: boolean; onClose: () => void; convId: string; otherName: string; onSuccess: (msg: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount");
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/payment-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: amt, currency: "NGN", note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create request");
      onSuccess(`Requested ₦${amt.toLocaleString()} from ${otherName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Request payment" icon={<ArrowDownToLine className="h-5 w-5" />}>
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground text-xs">From</p>
          <p className="font-semibold">{otherName || "—"}</p>
        </div>
        <AmountInput amount={amount} setAmount={setAmount} />
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">What's it for? (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch split 🍕" className="h-10 rounded-xl" maxLength={120} />
        </div>
        <Button className="w-full h-11 rounded-xl shadow-premium-sm" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 mr-1" />}
          Request {amount && Number(amount) > 0 ? `₦${Number(amount).toLocaleString()}` : "payment"}
        </Button>
      </div>
    </ModalShell>
  );
}

function SplitBillModal({
  open, onClose, convId, otherName, balance, onSuccess,
}: {
  open: boolean; onClose: () => void; convId: string; otherName: string; balance: number; onSuccess: (msg: string) => void;
}) {
  const [billerName, setBillerName] = useState("");
  const [billerCategory, setBillerCategory] = useState("general");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const total = Number(amount) || 0;
  const myShare = Math.round((total / 2) * 100) / 100;
  const theirShare = total - myShare;

  async function submit() {
    if (!billerName.trim()) return toast.error("Enter the biller name");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("Enter a valid amount");
    if (myShare > balance) return toast.error(`Insufficient balance for your share (₦${myShare.toLocaleString()})`);
    setLoading(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/bill-split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          billerName: billerName.trim(),
          billerCategory,
          totalAmount: amt,
          currency: "NGN",
          note: note.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create split");
      onSuccess(`Split ${billerName.trim()} bill — ${otherName} owes ₦${theirShare.toLocaleString()}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create split");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Split a bill" icon={<Receipt className="h-5 w-5" />}>
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground text-xs">Splitting with</p>
          <p className="font-semibold">{otherName || "—"}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Biller / Merchant</Label>
          <Input value={billerName} onChange={(e) => setBillerName(e.target.value)} placeholder="e.g. DSTV, Ikeja Electric" className="h-10 rounded-xl" maxLength={60} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Category</Label>
            <select
              value={billerCategory}
              onChange={(e) => setBillerCategory(e.target.value)}
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
            >
              <option value="general">General</option>
              <option value="electricity">Electricity</option>
              <option value="water">Water</option>
              <option value="tv">TV / Cable</option>
              <option value="internet">Internet</option>
              <option value="food">Food</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Total amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₦</span>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-10 rounded-xl pl-7 tabular-nums" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-violet-500/8 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your share (paid now)</span>
            <span className="font-bold tabular-nums text-violet-700 dark:text-violet-400">₦{myShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{otherName || "Contact"}'s share</span>
            <span className="font-bold tabular-nums">₦{theirShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. This month's renewal" className="h-10 rounded-xl" maxLength={120} />
        </div>
        <Button className="w-full h-11 rounded-xl shadow-premium-sm" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Receipt className="h-4 w-4 mr-1" />}
          Create split
        </Button>
      </div>
    </ModalShell>
  );
}

// ============================================================================
// StoriesTab & CallsTab (presentational)
// ============================================================================

function StoriesTab() {
  const { data } = useFetch<ConversationsResponse>("/api/messaging/conversations");
  const contacts = (data?.conversations ?? []).map((c) => c.user);
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">My Story</h3>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Avatar className="h-16 w-16 ring-2 ring-emerald-500 ring-offset-2">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-lg font-bold">AO</AvatarFallback>
          </Avatar>
          <button className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div>
          <p className="text-sm font-semibold">Add to story</p>
          <p className="text-xs text-muted-foreground">Share a photo that disappears in 24h</p>
        </div>
      </div>
      <h3 className="font-semibold mb-3">Recent contacts</h3>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1.5 shrink-0">
              <Avatar className="h-14 w-14 ring-2 ring-amber-400 ring-offset-2">
                <AvatarImage src={c.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold">{initials(c)}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] font-medium max-w-[60px] truncate">{c.firstName}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground text-center">
        <Sparkles className="h-5 w-5 mx-auto mb-2 text-amber-500" />
        Stories are coming soon. You'll be able to share ephemeral updates with your GaexPay contacts.
      </div>
    </Card>
  );
}

function CallsTab() {
  const { data } = useFetch<ConversationsResponse>("/api/messaging/conversations");
  const contacts = (data?.conversations ?? []).map((c) => c.user);
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3">Recent calls</h3>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No call history yet.</p>
      ) : (
        <div className="space-y-1">
          {contacts.slice(0, 6).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={c.avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">{initials(c)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{fullName(c)}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {i % 3 === 0 ? <ArrowDownRight className="h-3 w-3 text-emerald-500" /> : <ArrowUpRight className="h-3 w-3 text-rose-500" />}
                  {i % 3 === 0 ? "Incoming" : "Outgoing"} · {i + 1}h ago
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-emerald-600">
                <Phone className="h-[18px] w-[18px]" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-emerald-600">
                <Video className="h-[18px] w-[18px]" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground text-center">
        <Phone className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
        Voice & video calls are coming soon. You'll be able to call any GaexPay contact for free.
      </div>
    </Card>
  );
}
