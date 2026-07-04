"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, MessageSquarePlus, ArrowLeft, Check, CheckCheck,
  BadgeCheck, Wallet, X, Loader2, Phone, AtSign, Lock, MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/gaexpay";
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
    senderId: string;
    isMine: boolean;
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
  conversation: {
    id: string;
    user: Participant;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function fullName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`.trim();
}
function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}
function avatarColor(seed: string) {
  const colors = [
    "bg-emerald-500/15 text-emerald-600",
    "bg-rose-500/15 text-rose-600",
    "bg-amber-500/15 text-amber-600",
    "bg-violet-500/15 text-violet-600",
    "bg-cyan-500/15 text-cyan-600",
    "bg-orange-500/15 text-orange-600",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

function MessageStatusIcon({ status }: { status: string }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-sky-500" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  return <Check className="h-3 w-3 text-muted-foreground" />;
}

function formatChatTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================================================
// Main Messaging View
// ============================================================================

export function MessagingView() {
  const { t } = useTranslation();
  const { setView, setSendPrefill, sendPrefill } = useApp();
  const { fmtRaw } = useFormatMoney();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const { data: convData, loading: convLoading, reload: reloadConvs } =
    useFetch<ConversationsResponse>("/api/messaging/conversations");

  const conversations = convData?.conversations ?? [];

  // ---- Pre-select: if user came from "Send Money → chat" prefill, open that conversation ----
  useEffect(() => {
    if (!sendPrefill?.recipient) return;
    // Try to find existing conversation matching the recipient
    const matched = conversations.find(
      (c) =>
        c.user.username === sendPrefill.recipient ||
        c.user.id === sendPrefill.recipient,
    );
    if (matched) {
      setActiveId(matched.id);
    } else {
      // No existing conv — open the new-chat dialog prefilled
      setShowNewChat(true);
    }
    // Clear prefill once handled
    setSendPrefill(null);
  }, [sendPrefill?.recipient, conversations.length, setSendPrefill]);

  // Filter conversations by search
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      fullName(c.user).toLowerCase().includes(q) ||
      c.user.username?.toLowerCase().includes(q) ||
      c.lastMessage?.content.toLowerCase().includes(q)
    );
  });

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // Mobile responsive: when a conversation is active, hide the list panel
  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <h1 className="text-2xl font-bold tracking-tight">{t("messaging.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("messaging.subtitle")}</p>
      </div>

      <Card className="overflow-hidden p-0 h-[calc(100vh-180px)] min-h-[480px]">
        <div className="flex h-full">
          {/* Conversation list panel */}
          <div
            className={cn(
              "flex flex-col border-r w-full md:w-80 shrink-0",
              activeId && "hidden md:flex",
            )}
          >
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold flex-1 md:hidden">
                  {t("messaging.title")}
                </h2>
                <h2 className="text-sm font-semibold flex-1 hidden md:block">
                  {t("messaging.title")}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowNewChat(true)}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("messaging.search")}
                  className="h-9 pl-8 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
              {convLoading ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2.5 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {search ? (
                    <>No conversations match &ldquo;{search}&rdquo;.</>
                  ) : (
                    <>
                      <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium">{t("messaging.noConversations")}</p>
                      <p className="mt-1 text-xs">{t("messaging.noConversationsDesc")}</p>
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowNewChat(true)}
                      >
                        <MessageSquarePlus className="h-4 w-4 mr-1.5" />
                        {t("messaging.newChat")}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                filtered.map((c) => (
                  <ConversationRow
                    key={c.id}
                    item={c}
                    active={c.id === activeId}
                    onClick={() => setActiveId(c.id)}
                  />
                ))
              )}
            </div>

            {/* Footer secure badge */}
            <div className="border-t p-3 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>End-to-end encrypted</span>
            </div>
          </div>

          {/* Chat window */}
          <div className={cn("flex-1 flex flex-col", !activeId && "hidden md:flex")}>
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                onBack={() => setActiveId(null)}
                onUpdated={() => reloadConvs()}
                onMessage={() => {
                  /* polling handles refresh */
                }}
                setView={setView}
                setSendPrefill={setSendPrefill}
                fmtRaw={fmtRaw}
                t={t}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-medium">{t("messaging.selectConversation")}</p>
                <p className="mt-1 text-xs">{t("messaging.selectConversationDesc")}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <NewChatDialog
        open={showNewChat}
        onOpenChange={(o) => {
          setShowNewChat(o);
          if (!o) {
            // If prefill was the trigger and we close without starting, clear it
            if (sendPrefill?.recipient) setSendPrefill(null);
          }
        }}
        onStarted={(conv) => {
          setShowNewChat(false);
          reloadConvs();
          // Find the conversation by user (the API returns the conversation id directly)
          if (conv?.id) setActiveId(conv.id);
        }}
        prefill={sendPrefill?.recipient}
        t={t}
      />
    </div>
  );
}

// ============================================================================
// Conversation Row
// ============================================================================

function ConversationRow({
  item, active, onClick,
}: {
  item: ConversationListItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 p-3 text-left transition border-b",
        active ? "bg-primary/10" : "hover:bg-muted/50",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          {item.user.avatar ? (
            <AvatarImage src={item.user.avatar} alt={fullName(item.user)} />
          ) : null}
          <AvatarFallback className={cn("text-xs font-semibold", avatarColor(item.user.id))}>
            {initials(item.user)}
          </AvatarFallback>
        </Avatar>
        {item.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-background">
            {item.unreadCount > 9 ? "9+" : item.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className={cn("text-sm truncate", item.unreadCount > 0 ? "font-semibold" : "font-medium")}>
              {fullName(item.user)}
            </span>
            {item.user.kycStatus === "verified" && (
              <BadgeCheck className="h-3 w-3 text-primary shrink-0" />
            )}
          </div>
          {item.lastMessage && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatChatTime(item.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {item.lastMessage?.isMine && (
            <MessageStatusIcon status={item.lastMessage.status} />
          )}
          <p
            className={cn(
              "text-xs truncate flex-1",
              item.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {item.lastMessage?.content || "—"}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Chat Window
// ============================================================================

interface ChatWindowProps {
  conversation: ConversationListItem;
  onBack: () => void;
  onUpdated: () => void;
  onMessage: () => void;
  setView: (v: "send") => void;
  setSendPrefill: (p: { recipient?: string; amount?: number } | null) => void;
  fmtRaw: (n: number, c: string) => string;
  t: (k: string, params?: Record<string, string | number>) => string;
}

function ChatWindow({
  conversation, onBack, onUpdated, setView, setSendPrefill, fmtRaw, t,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMoneyInput, setShowMoneyInput] = useState(false);
  const [moneyAmount, setMoneyAmount] = useState("");
  const [sendingMoney, setSendingMoney] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<string | null>(null);

  // Load messages on conversation change
  const loadMessages = useCallback(
    async (mode: "initial" | "poll") => {
      if (!conversation.id) return;
      try {
        const url = `/api/messaging/conversations/${conversation.id}/messages${
          mode === "poll" && lastPollRef.current
            ? `?since=${encodeURIComponent(lastPollRef.current)}`
            : ""
        }`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load messages");
        const data: MessagesResponse = await res.json();
        if (mode === "initial") {
          setMessages(data.messages);
          // Mark conversation as having no unread (the GET marks them as read server-side)
          if (conversation.unreadCount > 0) onUpdated();
        } else {
          // Poll: append any new messages we don't already have
          if (data.messages.length > 0) {
            setMessages((prev) => {
              const known = new Set(prev.map((m) => m.id));
              const appended = data.messages.filter((m) => !known.has(m.id));
              if (appended.length === 0) return prev;
              return [...prev, ...appended];
            });
            // Also update status of existing messages to "read"
            setMessages((prev) =>
              prev.map((m) =>
                m.senderId !== conversation.user.id && m.status === "sent"
                  ? { ...m, status: "read" }
                  : m,
              ),
            );
          }
        }
        // Update last-poll marker
        const latest = data.messages[data.messages.length - 1];
        if (latest) lastPollRef.current = latest.createdAt;
      } catch {
        // Silent on poll; surface on initial
        if (mode === "initial") toast.error("Failed to load messages");
      } finally {
        if (mode === "initial") setLoading(false);
      }
    },
    [conversation.id, conversation.unreadCount, conversation.user.id, onUpdated],
  );

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastPollRef.current = null;
    loadMessages("initial");
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(() => loadMessages("poll"), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversation.id, loadMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const optimistic: MessageItem = {
      id: `temp-${Date.now()}`,
      conversationId: conversation.id,
      senderId: "me",
      content,
      status: "sent",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    try {
      const res = await fetch(
        `/api/messaging/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) throw new Error("Failed to send");
      const data = await res.json();
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data.message : m)),
      );
      onUpdated();
    } catch {
      toast.error("Failed to send message");
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendMoney = async () => {
    const amt = Number(moneyAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSendingMoney(true);
    try {
      // Send an in-chat message describing the payment intent, then navigate to send view
      const note = `💸 Sending ${fmtRaw(amt, "NGN")} — tap to confirm`;
      const res = await fetch(
        `/api/messaging/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: note }),
        },
      );
      if (!res.ok) throw new Error("Failed to send");
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      toast.success(t("messaging.moneySent"));
      setShowMoneyInput(false);
      setMoneyAmount("");
      // Navigate to send view with prefilled amount
      setSendPrefill({
        recipient: conversation.user.username || conversation.user.id,
        amount: amt,
      });
      setView("send");
    } catch {
      toast.error("Failed to send money in chat");
    } finally {
      setSendingMoney(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden h-8 w-8"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          {conversation.user.avatar ? (
            <AvatarImage src={conversation.user.avatar} alt={fullName(conversation.user)} />
          ) : null}
          <AvatarFallback className={cn("text-xs font-semibold", avatarColor(conversation.user.id))}>
            {initials(conversation.user)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-semibold text-sm truncate">{fullName(conversation.user)}</p>
            {conversation.user.kycStatus === "verified" && (
              <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("messaging.online")}
            {conversation.user.username && (
              <>
                <span className="mx-1">·</span>
                @{conversation.user.username}
              </>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() => {
            setSendPrefill({
              recipient: conversation.user.username || conversation.user.id,
            });
            setView("send");
          }}
        >
          <Wallet className="h-4 w-4" />
          <span className="ml-1.5 text-xs hidden sm:inline">{t("messaging.sendMoney")}</span>
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 bg-muted/20">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-32")} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm">{t("messaging.noMessages")}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.senderId !== conversation.user.id;
              const prev = messages[i - 1];
              const showAvatar =
                !mine && (!prev || prev.senderId !== m.senderId);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={cn("flex items-end gap-2", mine && "justify-end")}
                >
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {showAvatar && (
                        <Avatar className="h-7 w-7">
                          {conversation.user.avatar ? (
                            <AvatarImage src={conversation.user.avatar} alt={fullName(conversation.user)} />
                          ) : null}
                          <AvatarFallback className={cn("text-[10px] font-semibold", avatarColor(conversation.user.id))}>
                            {initials(conversation.user)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-background ring-1 ring-border rounded-bl-md",
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1",
                        mine ? "justify-end" : "justify-start",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10px]",
                          mine ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {formatChatTime(m.createdAt)}
                      </span>
                      {mine && <MessageStatusIcon status={m.status} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Money attach input */}
      <AnimatePresence>
        {showMoneyInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t bg-muted/30"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">{t("messaging.attachMoney")}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-auto h-6 w-6"
                  onClick={() => {
                    setShowMoneyInput(false);
                    setMoneyAmount("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={moneyAmount}
                  onChange={(e) => setMoneyAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder={t("messaging.amount")}
                  inputMode="decimal"
                  className="text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleSendMoney}
                  disabled={sendingMoney || !moneyAmount}
                >
                  {sendingMoney ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 text-xs">{t("messaging.confirmSend")}</span>
                </Button>
              </div>
              {moneyAmount && Number(moneyAmount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {fmtRaw(Number(moneyAmount), "NGN")}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          onClick={() => setShowMoneyInput((v) => !v)}
        >
          <Wallet className={cn("h-4 w-4", showMoneyInput && "text-primary")} />
        </Button>
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("messaging.typeMessage")}
          className="text-sm flex-1"
          maxLength={4000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !text.trim()}
          className="h-9 w-9 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </>
  );
}

// ============================================================================
// New Chat Dialog
// ============================================================================

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStarted: (c: { id: string; user: Participant } | null) => void;
  prefill?: string;
  t: (k: string) => string;
}

function NewChatDialog({
  open, onOpenChange, onStarted, prefill, t,
}: NewChatDialogProps) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply prefill when dialog opens
  useEffect(() => {
    if (open && prefill) {
      setIdentifier(prefill);
    } else if (open) {
      setIdentifier("");
      setError(null);
    }
  }, [open, prefill]);

  const handleStart = async () => {
    const id = identifier.trim().replace(/^@/, "");
    if (!id) {
      setError(t("messaging.userNotFound"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/messaging/conversations/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("messaging.userNotFound"));
      }
      const payload = data as NewConversationResponse;
      toast.success(`${t("messaging.startChatWith")} ${fullName(payload.conversation.user)}`);
      onStarted(payload.conversation);
      setIdentifier("");
    } catch (e: any) {
      setError(e.message || t("messaging.userNotFound"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            {t("messaging.newChat")}
          </DialogTitle>
          <DialogDescription>
            {t("messaging.startChatWith")} — {t("social.searchUsers")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <AtSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError(null);
              }}
              placeholder="@username, email, or phone"
              className="pl-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleStart();
                }
              }}
            />
          </div>
          {error && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5">
              <X className="h-3 w-3" /> {error}
            </p>
          )}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>
              Tip: search by @username, email, or phone (e.g. @chinedu, fatima@gaexpay.com, +234…).
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t("messaging.cancel")}
            </Button>
            <Button size="sm" onClick={handleStart} disabled={loading || !identifier.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <MessageSquarePlus className="h-4 w-4 mr-1.5" />
              )}
              {t("messaging.startChat")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
