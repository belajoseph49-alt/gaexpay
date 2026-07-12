"use client";

/**
 * src/components/gaexpay/views/gaex-chat-view.tsx — Task 21 (GaexChat) + Task 22-a
 *
 * WhatsApp-style social chat with integrated fintech. Users can:
 *   - Browse conversations (1-to-1 + groups), send/receive text messages
 *   - Open a quick-action (+) menu inside any chat to:
 *       • Send money to the contact (native payment card in thread)
 *       • Request money from the contact (request card w/ Accept/Pay + Decline)
 *       • Pay a bill and share it (bill split card w/ Pay my share)
 *
 * Task 22-a additions (WhatsApp-level messaging):
 *   1. Message reactions (long-press / hover → emoji bar; reaction pills)
 *   2. Reply / quote (context menu → quoted preview above input + in bubble)
 *   3. Edit message (own text only; "edited" indicator)
 *   4. Delete message (me / everyone dialog; soft-delete + content swap)
 *   5. Pin message (toggle; pin badge in corner)
 *   6. Forward message (modal w/ conversation checkboxes; "Forwarded" label)
 *   7. Search in conversation (debounced; click result → scroll + highlight)
 *   8. Typing indicator (poll every 3s; POST on compose)
 *   9. Markdown light (bold, italic, strikethrough, inline code, @mentions)
 *   10. Voice messages (MediaRecorder + analyser waveform + playback)
 *   11. Photo / video / document upload (file picker → upload → bubble)
 *   12. Group chat support (group avatars, member count, sender names, New Group)
 *
 * Three-pane layout:
 *   - Desktop (lg+): conversation list | chat thread
 *   - Mobile: list ↔ thread toggle (selected conversation hides the list)
 *
 * Tabs: Chats | Stories | Calls (Stories/Calls are presentational for now).
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, MessageSquarePlus, ArrowLeft, Check, CheckCheck,
  BadgeCheck, Wallet, X, Loader2, Phone, Video, Plus, ArrowDownToLine,
  ArrowUpRight, ArrowDownRight, Receipt, Users, Clock, MoreVertical,
  Camera, Mic, Image as ImageIcon, Circle, CheckCircle2, XCircle,
  Sparkles, Phone as PhoneIcon,
  Reply, Pencil, Trash2, Pin, PinOff, Forward, Copy, Play, Pause,
  MoreHorizontal, FileText, Download, StopCircle, Hash, UserPlus,
  ChevronUp, CornerUpLeft,
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
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  // Group fields (null for 1-to-1)
  isGroup?: boolean;
  groupId?: string | null;
  groupName?: string | null;
  groupAvatar?: string | null;
  memberCount?: number;
  // 1-to-1 field (null for groups)
  user: Participant | null;
  lastMessage: {
    id: string;
    content: string;
    kind?: string;
    metadata?: string | null;
    senderId: string;
    isMine?: boolean;
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
  replyToId?: string | null;
  editedAt?: string | null;
  deletedFor?: string | null;
  pinned?: boolean;
  reactions?: string | null;
  forwardedFromId?: string | null;
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
interface SearchResponse {
  messages: Array<{ id: string; content: string; senderId: string; createdAt: string; kind: string }>;
}
interface TypingResponse {
  typing: boolean;
  typers: Array<{ id: string; firstName: string; lastName: string }>;
}
interface UploadResponse {
  url: string; name: string; size: number; mimeType: string;
}
interface GroupMembersResponse {
  members: Array<Participant & { role: string; joinedAt: string }>;
}
interface GroupsListResponse {
  groups: Array<{
    id: string; name: string; description?: string | null; avatar?: string | null;
    role: string; conversationId: string | null; memberCount: number;
    members: Array<Participant & { role: string }>;
    updatedAt: string;
  }>;
}

// ============================================================================
// Constants & helpers
// ============================================================================

const POLL_MS = 5000;
const TYPING_POLL_MS = 3000;
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];

// Color palette for group sender names (hash of user id → color class).
// Emerald/teal/amber/rose/violet/fuchsia/orange/cyan — NO blue/indigo.
const SENDER_COLORS = [
  "text-emerald-600 dark:text-emerald-400",
  "text-teal-600 dark:text-teal-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-violet-600 dark:text-violet-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-orange-600 dark:text-orange-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-lime-600 dark:text-lime-400",
  "text-pink-600 dark:text-pink-400",
];

function initials(p: { firstName?: string; lastName?: string } | null | undefined) {
  if (!p) return "U";
  const f = p?.firstName?.trim() ?? "";
  const l = p?.lastName?.trim() ?? "";
  return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "U";
}
function fullName(p: Participant | null | undefined) {
  if (!p) return "Unknown";
  return `${p.firstName} ${p.lastName}`.trim();
}
function parseMeta(m?: string | null): any {
  if (!m) return {};
  try { return JSON.parse(m); } catch { return {}; }
}
function groupInitials(name?: string | null) {
  if (!name) return "G";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "G";
}
function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return SENDER_COLORS[Math.abs(h) % SENDER_COLORS.length];
}
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    case "voice":
      return `${prefix}🎤 Voice message`;
    case "image":
      return `${prefix}📷 Photo`;
    case "video":
      return `${prefix}🎥 Video`;
    case "document":
      return `${prefix}📄 ${meta.name || "Document"}`;
    case "system":
      return `${prefix}${last.content}`;
    default:
      return `${prefix}${last.content}`;
  }
}

/**
 * Lightweight Markdown renderer. Supports:
 *   - **bold**     → <strong>
 *   - *italic*     → <em>
 *   - ~~strike~~   → <s>
 *   - `code`       → <code>
 *   - @mention     → <span class="highlight">
 *
 * Returns an array of React nodes. No HTML strings, no dangerouslySetInnerHTML.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  // Token regex: matches the next markdown token anywhere in the string.
  // Order matters: code first (so its contents aren't re-parsed), then bold,
  // then strike, then italic, then mention.
  const tokenRe = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)|(`([^`]+)`)|(@[a-zA-Z0-9._-]+)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={key++} className="font-bold">{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key++} className="italic">{match[4]}</em>);
    } else if (match[6] !== undefined) {
      nodes.push(<s key={key++} className="line-through opacity-80">{match[6]}</s>);
    } else if (match[8] !== undefined) {
      nodes.push(
        <code key={key++} className="rounded bg-black/10 dark:bg-white/10 px-1 py-0.5 text-[0.85em] font-mono">
          {match[8]}
        </code>,
      );
    } else if (match[9] !== undefined) {
      nodes.push(
        <span key={key++} className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded px-0.5">
          {match[9]}
        </span>,
      );
    }
    lastIndex = tokenRe.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Long-press hook: fires `onLongPress` after `ms` of pointer down. Cancels on move/up. */
function useLongPress(onLongPress: () => void, ms = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const start = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);
  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);
  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerMove: clear,
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress browser context menu so long-press works on desktop too
      if (firedRef.current) e.preventDefault();
    },
  };
}

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
  const { data, loading, reload } = useFetch<ConversationsResponse>("/api/messaging/conversations");
  const conversations = data?.conversations ?? [];
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  // Poll for new conversations/messages
  useEffect(() => {
    const t = setInterval(reload, POLL_MS);
    return () => clearInterval(t);
  }, [reload]);

  return (
    <>
      <div className="grid lg:grid-cols-[340px_1fr] gap-4 lg:h-[calc(100vh-220px)]">
        {/* Conversation list */}
        <Card
          className={cn(
            "overflow-hidden p-0 flex flex-col",
            selectedConvId && "hidden lg:flex",
          )}
        >
          <div className="border-b p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations…"
                  className="h-9 rounded-xl pl-9 text-sm bg-muted/40 border-border/60"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shrink-0"
                onClick={() => setNewGroupOpen(true)}
                aria-label="New group"
                title="New group"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
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
              onConversationsChanged={reload}
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

      <NewGroupModal
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        contacts={conversations.filter((c) => !c.isGroup && c.user).map((c) => c.user as Participant)}
        onCreated={(convId) => {
          setNewGroupOpen(false);
          reload();
          onSelect(convId);
        }}
      />
    </>
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
  const isGroup = !!conv.isGroup;
  const u = conv.user;
  const last = conv.lastMessage;
  // For 1-to-1: senderId is the author. If it's the other user → not mine; else mine.
  // For groups: lastMessage.isMine is provided by the API.
  const mine = isGroup ? !!last?.isMine : (!!last && u != null && last.senderId !== u.id);
  const preview = previewFor(last, mine);

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
          {isGroup ? (
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-xs font-bold">
              {groupInitials(conv.groupName)}
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={u?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                {initials(u)}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        {!isGroup && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
        )}
        {isGroup && (
          <span className="absolute bottom-0 right-0 grid h-4 w-4 place-items-center rounded-full bg-violet-500 ring-2 ring-background">
            <Users className="h-2.5 w-2.5 text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold truncate flex items-center gap-1">
            {isGroup ? (conv.groupName || "Group") : fullName(u)}
            {!isGroup && u?.kycStatus === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            {isGroup && (
              <span className="ml-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 shrink-0">
                · {conv.memberCount} members
              </span>
            )}
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

function ChatThread({
  convId, onBack, onConversationsChanged,
}: {
  convId: string; onBack: () => void; onConversationsChanged: () => void;
}) {
  const { data: meData } = useFetch<{ user: { id: string; firstName: string; lastName: string } }>("/api/me");
  const { data: walletsData } = useFetch<WalletsResponse>("/api/wallets");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [other, setOther] = useState<Participant | null>(null);
  const [groupInfo, setGroupInfo] = useState<{ name: string; memberCount: number; members: Participant[] } | null>(null);
  const [modal, setModal] = useState<null | "send" | "request" | "split">(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // New Task 22-a state
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse["messages"]>([]);
  const [searching, setSearching] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<MessageItem | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<MessageItem | null>(null);
  const [recording, setRecording] = useState<{ recorder: MediaRecorder; startTime: number } | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myId = meData?.user?.id;
  const ngnWallet = walletsData?.wallets.find((w) => w.currency === "NGN");
  const ngnBalance = ngnWallet?.balance ?? 0;

  const isGroup = !!groupInfo;

  // ---- Message loading -----------------------------------------------------
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const data: MessagesResponse = await res.json();
      setMessages(data.messages);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [convId]);

  // Fetch conversation detail (other participant OR group info)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/messaging/conversations", { credentials: "include" });
        if (!res.ok) return;
        const data: ConversationsResponse = await res.json();
        const conv = data.conversations.find((c) => c.id === convId);
        if (cancelled) return;
        if (!conv) return;
        if (conv.isGroup) {
          // Fetch group members for sender name resolution
          try {
            const mres = await fetch(`/api/messaging/groups/${conv.groupId}/members`, { credentials: "include" });
            const mdata: GroupMembersResponse = await mres.json();
            setGroupInfo({
              name: conv.groupName || "Group",
              memberCount: conv.memberCount || mdata.members.length,
              members: mdata.members,
            });
          } catch {
            setGroupInfo({ name: conv.groupName || "Group", memberCount: conv.memberCount || 0, members: [] });
          }
          setOther(null);
        } else {
          setOther(conv.user);
          setGroupInfo(null);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [convId]);

  useEffect(() => {
    setLoading(true);
    setReplyTo(null);
    setEditingId(null);
    setSearchOpen(false);
    setText("");
    loadMessages();
  }, [loadMessages, convId]);

  // Poll messages
  useEffect(() => {
    const t = setInterval(loadMessages, POLL_MS);
    return () => clearInterval(t);
  }, [loadMessages]);

  // Auto-scroll to bottom on new messages (only if user is near the bottom)
  const isAtBottomRef = useRef(true);
  useEffect(() => {
    if (scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  // ---- Typing indicator (poll) --------------------------------------------
  useEffect(() => {
    if (!convId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/messaging/conversations/${convId}/typing`, { credentials: "include" });
        if (!res.ok) return;
        const data: TypingResponse = await res.json();
        setOtherTyping(data.typing);
      } catch { /* ignore */ }
    };
    poll();
    const t = setInterval(poll, TYPING_POLL_MS);
    return () => clearInterval(t);
  }, [convId]);

  // Notify server when I'm typing
  const lastTypingSentRef = useRef<boolean | null>(null);
  const notifyTyping = useCallback((typing: boolean) => {
    if (lastTypingSentRef.current === typing) return;
    lastTypingSentRef.current = typing;
    fetch(`/api/messaging/conversations/${convId}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ typing }),
    }).catch(() => {});
  }, [convId]);

  // ---- Visible messages (filter hidden-for-me) -----------------------------
  // Defined early so the search useEffect below can reference it.
  const visibleMessages = useMemo(() => {
    if (!myId) return messages;
    return messages.filter((m) => {
      const meta = parseMeta(m.metadata);
      if (Array.isArray(meta.hiddenFor) && meta.hiddenFor.includes(myId)) return false;
      return true;
    });
  }, [messages, myId]);

  // ---- Search (debounced) --------------------------------------------------
  useEffect(() => {
    if (!searchOpen) { setSearchResults([]); setSearchQuery(""); return; }
  }, [searchOpen]);
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/messaging/conversations/${convId}/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        if (!res.ok) { setSearchResults([]); return; }
        const data: SearchResponse = await res.json();
        let results = data.messages || [];
        // Client-side fallback: if the API returns nothing (e.g. due to a
        // server-side deletedFor filter edge case), filter the locally-loaded
        // messages so the user still gets useful results.
        if (results.length === 0 && visibleMessages.length > 0) {
          const lower = q.toLowerCase();
          results = visibleMessages
            .filter((m) => m.kind === "text" && m.deletedFor !== "all" && m.content.toLowerCase().includes(lower))
            .slice(0, 50)
            .map((m) => ({ id: m.id, content: m.content, senderId: m.senderId, createdAt: m.createdAt, kind: m.kind }));
        }
        setSearchResults(results);
      } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, convId, visibleMessages]);

  // ---- Scroll to + highlight a message -------------------------------------
  const scrollToMessage = useCallback((id: string) => {
    const el = messageRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 1800);
    } else {
      toast.info("Message not currently visible");
    }
  }, []);

  // ---- Send / edit text ----------------------------------------------------
  async function sendText() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);

    // Edit mode
    if (editingId) {
      try {
        const res = await fetch(`/api/messaging/conversations/${convId}/messages/${editingId}/edit`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to edit");
        setText("");
        setEditingId(null);
        await loadMessages();
        onConversationsChanged();
      } catch (e: any) {
        toast.error(e.message || "Failed to edit message");
      } finally {
        setSending(false);
      }
      return;
    }

    // Compose new message
    setText("");
    notifyTyping(false);
    lastTypingSentRef.current = null;
    const replyToId = replyTo?.id || null;
    setReplyTo(null);
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, replyToId, kind: "text" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to send");
      }
      isAtBottomRef.current = true;
      await loadMessages();
      onConversationsChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
      setText(content); // restore
      if (replyToId) setReplyTo(messages.find((m) => m.id === replyToId) || null);
    } finally {
      setSending(false);
    }
  }

  // ---- Send attachment (voice/image/video/document) ------------------------
  async function sendAttachment(kind: "voice" | "image" | "video" | "document", metadata: any, content = "") {
    setSending(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, kind, metadata, replyToId: replyTo?.id || null }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Failed to upload");
      }
      setReplyTo(null);
      isAtBottomRef.current = true;
      await loadMessages();
      onConversationsChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed to send attachment");
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(file: File): Promise<UploadResponse | null> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/messaging/upload", { method: "POST", credentials: "include", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data as UploadResponse;
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
      return null;
    }
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so the same file can be picked again
    if (!file) return;
    const uploaded = await uploadFile(file);
    if (!uploaded) return;
    const meta = { url: uploaded.url, name: uploaded.name, size: uploaded.size, mimeType: uploaded.mimeType };
    let kind: "image" | "video" | "document" = "document";
    if (uploaded.mimeType.startsWith("image/")) kind = "image";
    else if (uploaded.mimeType.startsWith("video/")) kind = "video";
    await sendAttachment(kind, meta);
  }

  // ---- Voice recording -----------------------------------------------------
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformRef = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  async function startRecording() {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Microphone not available");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const duration = (Date.now() - (recording?.startTime ?? Date.now())) / 1000;
        if (chunks.length === 0 || duration < 0.5) {
          setRecording(null);
          setRecordSeconds(0);
          waveformRef.current = [];
          toast.error("Recording too short");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        setRecording(null);
        setRecordSeconds(0);
        const waveform = waveformRef.current.slice();
        waveformRef.current = [];
        const uploaded = await uploadFile(file);
        if (!uploaded) return;
        await sendAttachment("voice", { url: uploaded.url, duration, waveform, mimeType: uploaded.mimeType });
      };

      // Set up analyser for waveform sampling
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        waveformRef.current = [];
        const sampleInterval = setInterval(() => {
          analyser.getByteTimeDomainData(dataArray);
          let max = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = Math.abs(dataArray[i] - 128) / 128;
            if (v > max) max = v;
          }
          waveformRef.current.push(max);
        }, 100);
        recordingTimerRef.current = sampleInterval;
      } catch {
        // Analyser optional — waveform will be a flat placeholder
        waveformRef.current = [];
      }

      // Duration timer
      const startTime = Date.now();
      const durInterval = setInterval(() => {
        setRecordSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 250);
      recordingTimerRef.current = durInterval;

      setRecording({ recorder, startTime });
      recorder.start();
    } catch (e: any) {
      toast.error(e?.name === "NotAllowedError" ? "Microphone permission denied" : "Microphone not available");
    }
  }

  function stopRecording() {
    if (recording?.recorder && recording.recorder.state !== "inactive") {
      recording.recorder.stop();
    }
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // ---- Reaction / context-menu actions -------------------------------------
  async function toggleReaction(msgId: string, emoji: string) {
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages/${msgId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) return;
      await loadMessages();
    } catch { /* ignore */ }
  }

  async function togglePin(msg: MessageItem) {
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages/${msg.id}/pin`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to pin");
      toast.success(msg.pinned ? "Message unpinned" : "Message pinned");
      await loadMessages();
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle pin");
    }
  }

  async function doDelete(scope: "me" | "all") {
    if (!deleteMsg) return;
    try {
      const res = await fetch(`/api/messaging/conversations/${convId}/messages/${deleteMsg.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success(scope === "all" ? "Message deleted for everyone" : "Message deleted for you");
      setDeleteMsg(null);
      await loadMessages();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete message");
    }
  }

  // ---- Reply / edit setup --------------------------------------------------
  function startReply(msg: MessageItem) {
    setReplyTo(msg);
    setEditingId(null);
  }
  function startEdit(msg: MessageItem) {
    setEditingId(msg.id);
    setText(msg.content);
    setReplyTo(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setText("");
  }

  // After any financial action, reload messages + show toast
  async function onFinancialActionSuccess(msg?: string) {
    await loadMessages();
    onConversationsChanged();
    if (msg) toast.success(msg);
  }

  // ---- Sender lookup for group replies / names -----------------------------
  const senderNameFor = useCallback((senderId: string): string => {
    if (groupInfo) {
      const mem = groupInfo.members.find((m) => m.id === senderId);
      if (mem) return fullName(mem);
    }
    if (senderId === myId) return "You";
    if (other) return fullName(other);
    return "Unknown";
  }, [groupInfo, myId, other]);

  // Header subtitle: typing > online > group member count
  const headerSubtitle = isGroup
    ? `${groupInfo?.memberCount ?? 0} members`
    : otherTyping ? "typing…" : "online";

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 ring-1 ring-border/60">
          {isGroup ? (
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-xs font-bold">
              {groupInitials(groupInfo?.name)}
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={other?.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                {other ? initials(other) : "?"}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate flex items-center gap-1">
            {isGroup ? (groupInfo?.name ?? "Group") : (other ? fullName(other) : "Loading…")}
            {!isGroup && other?.kycStatus === "verified" && <BadgeCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
            {isGroup && <Users className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
          </p>
          <p className={cn(
            "text-[11px] flex items-center gap-1",
            otherTyping ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
          )}>
            {otherTyping ? (
              <span className="flex items-center gap-1">
                typing
                <span className="inline-flex gap-0.5">
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className="w-1 h-1 rounded-full bg-current" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1 h-1 rounded-full bg-current" />
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1 h-1 rounded-full bg-current" />
                </span>
              </span>
            ) : isGroup ? (
              <>{groupInfo?.memberCount ?? 0} members</>
            ) : (
              <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online</>
            )}
          </p>
        </div>
        <Button
          variant="ghost" size="icon" className="h-9 w-9 rounded-xl"
          aria-label="Search in conversation"
          onClick={() => setSearchOpen((s) => !s)}
        >
          <Search className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="Voice call">
          <PhoneIcon className="h-[18px] w-[18px]" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="Video call">
          <Video className="h-[18px] w-[18px]" />
        </Button>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b overflow-hidden"
          >
            <div className="p-2.5 space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages in this chat…"
                  className="h-9 rounded-xl pl-9 pr-9 text-sm bg-muted/40 border-border/60"
                />
                <button
                  onClick={() => { setSearchOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {searchQuery.trim().length > 0 && (
                <div className="max-h-56 overflow-y-auto no-scrollbar rounded-xl border border-border/60 bg-background">
                  {searching ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">Searching…</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">No results for “{searchQuery}”.</div>
                  ) : (
                    searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => scrollToMessage(r.id)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 transition"
                      >
                        <p className="text-xs font-medium text-muted-foreground">{senderNameFor(r.senderId)}</p>
                        <p className="text-sm truncate">{r.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-muted/10">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={cn("h-12 rounded-2xl", i % 2 ? "ml-auto w-2/3" : "w-2/3")} />)}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="grid place-items-center h-full text-center text-sm text-muted-foreground py-12">
            <div>
              <MessageSquarePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              No messages yet. Say hello 👋
            </div>
          </div>
        ) : (
          visibleMessages.map((m, idx) => {
            const mine = myId ? m.senderId === myId : false;
            const prev = visibleMessages[idx - 1];
            const showSenderName = isGroup && !mine && (!prev || prev.senderId !== m.senderId);
            return (
              <MessageBubble
                key={m.id}
                msg={m}
                mine={mine}
                other={other}
                isGroup={isGroup}
                senderName={isGroup ? senderNameFor(m.senderId) : ""}
                showSenderName={showSenderName}
                myId={myId}
                allMessages={visibleMessages}
                onReact={toggleReaction}
                onReply={startReply}
                onEdit={startEdit}
                onDelete={(msg) => setDeleteMsg(msg)}
                onPin={togglePin}
                onForward={(msg) => setForwardMsg(msg)}
                onScrollTo={scrollToMessage}
                highlighted={highlightedId === m.id}
                registerRef={(el) => {
                  if (el) messageRefs.current.set(m.id, el);
                  else messageRefs.current.delete(m.id);
                }}
                onActionDone={onFinancialActionSuccess}
              />
            );
          })
        )}
      </div>

      {/* Reply / edit preview bar */}
      <AnimatePresence>
        {(replyTo || editingId) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
          >
            <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
              {editingId ? (
                <Pencil className="h-4 w-4 text-amber-500 shrink-0" />
              ) : (
                <CornerUpLeft className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0 border-l-2 pl-2" style={{ borderColor: editingId ? "rgb(245 158 11)" : "rgb(16 185 129)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {editingId ? "Editing message" : `Replying to ${replyTo && replyTo.senderId === myId ? "yourself" : senderNameFor(replyTo?.senderId || "")}`}
                </p>
                <p className="text-xs truncate text-muted-foreground">
                  {editingId ? messages.find((m) => m.id === editingId)?.content : replyTo?.content}
                </p>
              </div>
              <button
                onClick={() => { if (editingId) cancelEdit(); else setReplyTo(null); }}
                className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording bar */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t overflow-hidden"
          >
            <div className="px-3 py-2.5 flex items-center gap-3 bg-rose-500/8">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                Recording… {formatDuration(recordSeconds)}
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-xl text-muted-foreground"
                onClick={stopRecording}
              >
                <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Stopping…
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 rounded-xl"
                onClick={stopRecording}
              >
                <StopCircle className="h-4 w-4 mr-1" /> Stop & send
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar with quick-action (+) + mic + attach buttons */}
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

          {/* Text input + attach */}
          <div className="flex-1 relative">
            <Input
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                notifyTyping(e.target.value.trim().length > 0);
              }}
              onBlur={() => notifyTyping(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              placeholder={editingId ? "Edit your message…" : "Type a message…"}
              className="h-10 rounded-2xl pr-20 text-sm border-border/60 bg-muted/40"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={onFileSelected}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Attach file"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Record voice message"
                onClick={() => (recording ? stopRecording() : startRecording())}
              >
                {recording ? <StopCircle className="h-4 w-4 text-rose-500" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Send / mic */}
          <Button
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 shadow-premium-sm"
            onClick={sendText}
            disabled={sending || !text.trim()}
            aria-label={editingId ? "Save edit" : "Send"}
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
        otherName={isGroup ? (groupInfo?.name ?? "Group") : (other ? fullName(other) : "")}
        balance={ngnBalance}
        onSuccess={(msg) => { setModal(null); onFinancialActionSuccess(msg); }}
      />
      <RequestMoneyModal
        open={modal === "request"}
        onClose={() => setModal(null)}
        convId={convId}
        otherName={isGroup ? (groupInfo?.name ?? "Group") : (other ? fullName(other) : "")}
        onSuccess={(msg) => { setModal(null); onFinancialActionSuccess(msg); }}
      />
      <SplitBillModal
        open={modal === "split"}
        onClose={() => setModal(null)}
        convId={convId}
        otherName={isGroup ? (groupInfo?.name ?? "Group") : (other ? fullName(other) : "")}
        balance={ngnBalance}
        onSuccess={(msg) => { setModal(null); onFinancialActionSuccess(msg); }}
      />

      {/* Delete dialog */}
      <DeleteMessageDialog
        msg={deleteMsg}
        mine={!!deleteMsg && myId === deleteMsg.senderId}
        onClose={() => setDeleteMsg(null)}
        onConfirm={doDelete}
      />

      {/* Forward modal */}
      <ForwardModal
        msg={forwardMsg}
        currentConvId={convId}
        onClose={() => setForwardMsg(null)}
      />
    </>
  );
}

// ============================================================================
// MessageBubble — renders text + financial cards + attachment bubbles
// ============================================================================

interface MessageBubbleProps {
  msg: MessageItem;
  mine: boolean;
  other: Participant | null;
  isGroup: boolean;
  senderName: string;
  showSenderName: boolean;
  myId?: string;
  allMessages: MessageItem[];
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: MessageItem) => void;
  onEdit: (msg: MessageItem) => void;
  onDelete: (msg: MessageItem) => void;
  onPin: (msg: MessageItem) => void;
  onForward: (msg: MessageItem) => void;
  onScrollTo: (id: string) => void;
  highlighted: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onActionDone: (msg?: string) => void;
}

function MessageBubble(props: MessageBubbleProps) {
  const { msg, mine, other, isGroup, senderName, showSenderName, myId, allMessages, onReact, onReply, onEdit, onDelete, onPin, onForward, onScrollTo, highlighted, registerRef, onActionDone } = props;
  const meta = parseMeta(msg.metadata);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  // Long-press handler (mobile)
  const longPress = useLongPress(() => setShowReactions(true), 450);

  // Find replied-to message for quoted preview
  const repliedTo = msg.replyToId ? allMessages.find((m) => m.id === msg.replyToId) : null;
  const repliedSenderName = repliedTo
    ? (repliedTo.senderId === myId ? "You" : (isGroup ? (senderName && repliedTo.senderId !== msg.senderId ? lookupSenderName(repliedTo.senderId, allMessages, other, isGroup, myId) : senderName) : (other ? fullName(other) : "User")))
    : "";

  // ----- Financial / system cards -------------------------------------------
  if (msg.kind === "payment") {
    return (
      <div ref={registerRef} className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className="max-w-[85%] sm:max-w-[75%]">
          <BubbleWrapper mine={mine} pinned={!!msg.pinned} highlighted={highlighted} repliedTo={repliedTo} repliedName={repliedSenderName} onScrollTo={onScrollTo} reactions={msg.reactions} myId={myId} onReact={onReact} msgId={msg.id} msg={msg} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onForward={onForward}>
            <PaymentCard msg={msg} meta={meta} mine={mine} />
          </BubbleWrapper>
        </div>
      </div>
    );
  }
  if (msg.kind === "request") {
    return (
      <div ref={registerRef} className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className="max-w-[85%] sm:max-w-[75%]">
          <BubbleWrapper mine={mine} pinned={!!msg.pinned} highlighted={highlighted} repliedTo={repliedTo} repliedName={repliedSenderName} onScrollTo={onScrollTo} reactions={msg.reactions} myId={myId} onReact={onReact} msgId={msg.id} msg={msg} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onForward={onForward}>
            <RequestCard msg={msg} meta={meta} mine={mine} onActionDone={onActionDone} />
          </BubbleWrapper>
        </div>
      </div>
    );
  }
  if (msg.kind === "split") {
    return (
      <div ref={registerRef} className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className="max-w-[85%] sm:max-w-[75%]">
          <BubbleWrapper mine={mine} pinned={!!msg.pinned} highlighted={highlighted} repliedTo={repliedTo} repliedName={repliedSenderName} onScrollTo={onScrollTo} reactions={msg.reactions} myId={myId} onReact={onReact} msgId={msg.id} msg={msg} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onForward={onForward}>
            <SplitCard msg={msg} meta={meta} mine={mine} onActionDone={onActionDone} />
          </BubbleWrapper>
        </div>
      </div>
    );
  }
  if (msg.kind === "system") {
    return (
      <div ref={registerRef}>
        <SystemBubble msg={msg} meta={meta} />
      </div>
    );
  }

  // ----- Voice / image / video / document bubbles --------------------------
  if (msg.kind === "voice") {
    return (
      <div ref={registerRef} className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[78%] sm:max-w-[68%]", isGroup && !mine && "mt-1")}>
          {showSenderName && <SenderNameTag name={senderName} senderId={msg.senderId} />}
          <BubbleWrapper mine={mine} pinned={!!msg.pinned} highlighted={highlighted} repliedTo={repliedTo} repliedName={repliedSenderName} onScrollTo={onScrollTo} reactions={msg.reactions} myId={myId} onReact={onReact} msgId={msg.id} onLongPress={() => setShowReactions(true)} showReactions={showReactions} onShowReactions={setShowReactions} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} msg={msg} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onForward={onForward} forwarded={!!msg.forwardedFromId}>
            <VoiceBubble msg={msg} meta={meta} mine={mine} />
          </BubbleWrapper>
        </div>
      </div>
    );
  }
  if (msg.kind === "image" || msg.kind === "video" || msg.kind === "document") {
    return (
      <div ref={registerRef} className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className={cn("max-w-[78%] sm:max-w-[68%]", isGroup && !mine && "mt-1")}>
          {showSenderName && <SenderNameTag name={senderName} senderId={msg.senderId} />}
          <BubbleWrapper mine={mine} pinned={!!msg.pinned} highlighted={highlighted} repliedTo={repliedTo} repliedName={repliedSenderName} onScrollTo={onScrollTo} reactions={msg.reactions} myId={myId} onReact={onReact} msgId={msg.id} onLongPress={() => setShowReactions(true)} showReactions={showReactions} onShowReactions={setShowReactions} menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} msg={msg} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onPin={onPin} onForward={onForward} forwarded={!!msg.forwardedFromId}>
            {msg.kind === "image" && <ImageBubble msg={msg} meta={meta} mine={mine} />}
            {msg.kind === "video" && <VideoBubble msg={msg} meta={meta} mine={mine} />}
            {msg.kind === "document" && <DocumentBubble msg={msg} meta={meta} mine={mine} />}
          </BubbleWrapper>
        </div>
      </div>
    );
  }

  // ----- Plain text bubble (with deleted-for-all variant) ------------------
  const isDeletedForAll = msg.deletedFor === "all" || msg.content === "🚫 This message was deleted";

  return (
    <div ref={registerRef} className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] sm:max-w-[68%]", isGroup && !mine && "mt-1")}>
        {showSenderName && !isDeletedForAll && <SenderNameTag name={senderName} senderId={msg.senderId} />}
        <BubbleWrapper
          mine={mine}
          pinned={!!msg.pinned}
          highlighted={highlighted}
          repliedTo={repliedTo}
          repliedName={repliedSenderName}
          onScrollTo={onScrollTo}
          reactions={msg.reactions}
          myId={myId}
          onReact={onReact}
          msgId={msg.id}
          onLongPress={() => setShowReactions(true)}
          showReactions={showReactions}
          onShowReactions={setShowReactions}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          msg={msg}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onPin={onPin}
          onForward={onForward}
          forwarded={!!msg.forwardedFromId}
        >
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm shadow-premium-xs relative",
              isDeletedForAll
                ? "bg-muted/40 text-muted-foreground italic rounded-2xl"
                : mine
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
                  : "bg-card border border-border/60 rounded-bl-md",
            )}
          >
            {/* Forwarded label */}
            {msg.forwardedFromId && !isDeletedForAll && (
              <p className={cn("flex items-center gap-1 text-[10px] mb-1", mine ? "text-white/70" : "text-muted-foreground")}>
                <Forward className="h-3 w-3" /> Forwarded
              </p>
            )}

            {/* Reply quoted preview */}
            {repliedTo && (
              <QuotedPreview
                content={repliedTo.content}
                senderName={repliedSenderName}
                kind={repliedTo.kind}
                mine={mine}
                onClick={() => onScrollTo(repliedTo.id)}
              />
            )}

            {isDeletedForAll ? (
              <p className="flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> This message was deleted</p>
            ) : (
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {renderMarkdown(msg.content)}
              </p>
            )}

            <div className={cn("flex items-center gap-1 mt-1 text-[10px]", mine ? "text-white/70 justify-end" : "text-muted-foreground")}>
              {msg.editedAt && !isDeletedForAll && <span className="italic mr-1">edited</span>}
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {mine && !isDeletedForAll && <TickStatus status={msg.status} light />}
            </div>
          </div>
        </BubbleWrapper>
      </div>
    </div>
  );
}

function lookupSenderName(senderId: string, allMessages: MessageItem[], other: Participant | null, isGroup: boolean, myId?: string): string {
  if (senderId === myId) return "You";
  if (!isGroup) return other ? fullName(other) : "User";
  // For groups we don't have member list here; fall back to a placeholder
  return "Member";
}

function SenderNameTag({ name, senderId }: { name: string; senderId: string }) {
  return (
    <p className={cn("text-[11px] font-semibold mb-0.5 ml-1", hashColor(senderId))}>{name}</p>
  );
}

/**
 * BubbleWrapper — wraps a message bubble with: hover/long-press reaction bar,
 * context-menu (Reply/Edit/Delete/Pin/Forward/Copy), reaction pills, pin badge,
 * quoted-preview, and forwarded label.
 */
function BubbleWrapper({
  mine, pinned, highlighted, repliedTo, repliedName, onScrollTo,
  reactions, myId, onReact, msgId, onLongPress, showReactions, onShowReactions,
  menuOpen, onMenuOpenChange, msg, onReply, onEdit, onDelete, onPin, onForward, forwarded,
  children,
}: {
  mine: boolean;
  pinned: boolean;
  highlighted: boolean;
  repliedTo: MessageItem | null | undefined;
  repliedName: string;
  onScrollTo: (id: string) => void;
  reactions?: string | null;
  myId?: string;
  onReact: (msgId: string, emoji: string) => void;
  msgId: string;
  onLongPress?: () => void;
  showReactions?: boolean;
  onShowReactions?: (s: boolean) => void;
  menuOpen?: boolean;
  onMenuOpenChange?: (o: boolean) => void;
  msg: MessageItem;
  onReply: (m: MessageItem) => void;
  onEdit: (m: MessageItem) => void;
  onDelete: (m: MessageItem) => void;
  onPin: (m: MessageItem) => void;
  onForward: (m: MessageItem) => void;
  forwarded?: boolean;
  children: React.ReactNode;
}) {
  const longPress = useLongPress(() => { onLongPress?.(); onShowReactions?.(true); }, 450);
  const reactionPills = useMemo(() => groupReactions(reactions, myId), [reactions, myId]);
  const canEdit = mine && msg.kind === "text" && msg.deletedFor !== "all";
  const canForward = msg.kind !== "payment" && msg.kind !== "request" && msg.kind !== "split" && msg.deletedFor !== "all";
  const canReact = msg.deletedFor !== "all";
  const [hovered, setHovered] = useState(false);
  const barVisible = canReact && (showReactions || hovered || menuOpen);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...(canReact ? longPress : {})}
    >
      {/* Reaction bar — visible on hover (desktop) or after long-press (mobile) */}
      {canReact && (
        <div
          className={cn(
            "absolute -top-9 z-30 flex items-center gap-0.5 rounded-full bg-popover/95 backdrop-blur border border-border/60 shadow-premium-sm px-1 py-0.5 transition-opacity duration-150",
            mine ? "right-0" : "left-0",
            barVisible ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { onReact(msgId, e); onShowReactions?.(false); }}
              className="grid h-7 w-7 place-items-center rounded-full text-base hover:bg-muted hover:scale-125 transition"
            >
              {e}
            </button>
          ))}
          <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align={mine ? "end" : "start"} className="rounded-xl w-44">
              <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => { onShowReactions?.(false); onReply(msg); }}>
                <Reply className="h-4 w-4 mr-2" /> Reply
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => { onShowReactions?.(false); onEdit(msg); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => { onShowReactions?.(false); onPin(msg); }}>
                {msg.pinned ? <PinOff className="h-4 w-4 mr-2" /> : <Pin className="h-4 w-4 mr-2" />}
                {msg.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              {canForward && (
                <DropdownMenuItem className="cursor-pointer rounded-lg" onSelect={() => { onShowReactions?.(false); onForward(msg); }}>
                  <Forward className="h-4 w-4 mr-2" /> Forward
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer rounded-lg"
                onSelect={() => {
                  onShowReactions?.(false);
                  if (navigator.clipboard) navigator.clipboard.writeText(msg.content).then(() => toast.success("Copied")).catch(() => {});
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg text-rose-600 focus:text-rose-600"
                onSelect={() => { onShowReactions?.(false); onDelete(msg); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Pin badge */}
      {pinned && (
        <div className={cn("absolute -top-1.5 z-10", mine ? "-left-1.5" : "-right-1.5")}>
          <div className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-white shadow-sm">
            <Pin className="h-2.5 w-2.5" />
          </div>
        </div>
      )}

      {/* Highlight ring on scroll-to */}
      <div className={cn("rounded-2xl transition", highlighted && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background")}>
        {children}
      </div>

      {/* Reaction pills */}
      {reactionPills.length > 0 && (
        <div className={cn("flex flex-wrap gap-1 mt-1", mine ? "justify-end" : "justify-start")}>
          {reactionPills.map((p) => (
            <button
              key={p.emoji}
              onClick={() => onReact(msgId, p.emoji)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] border transition",
                p.mine
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-muted border-border/60 text-foreground hover:bg-muted/70",
              )}
            >
              <span>{p.emoji}</span>
              {p.count > 1 && <span className="font-semibold tabular-nums">{p.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function groupReactions(reactionsField: string | null | undefined, myId?: string): Array<{ emoji: string; count: number; mine: boolean }> {
  if (!reactionsField) return [];
  let arr: Array<{ u: string; e: string }> = [];
  try { arr = JSON.parse(reactionsField); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const map = new Map<string, { count: number; mine: boolean }>();
  for (const r of arr) {
    if (!r || !r.e) continue;
    const cur = map.get(r.e) || { count: 0, mine: false };
    cur.count += 1;
    if (r.u === myId) cur.mine = true;
    map.set(r.e, cur);
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }));
}

function QuotedPreview({
  content, senderName, kind, mine, onClick,
}: {
  content: string; senderName: string; kind?: string; mine: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full text-left mb-1.5 pl-2 rounded-md border-l-2 text-xs truncate",
        mine ? "border-white/50 bg-white/10" : "border-emerald-500/60 bg-emerald-500/8",
      )}
    >
      <p className={cn("font-semibold text-[10px]", mine ? "text-white/90" : "text-emerald-700 dark:text-emerald-400")}>
        {senderName || "Unknown"}
      </p>
      <p className={cn("truncate", mine ? "text-white/80" : "text-muted-foreground")}>
        {kind === "voice" ? "🎤 Voice message" : kind === "image" ? "📷 Photo" : kind === "video" ? "🎥 Video" : kind === "document" ? "📄 Document" : content}
      </p>
    </button>
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
  );
}

// ── Request card (with Accept/Pay + Decline buttons) ──────────────────────
function RequestCard({
  msg, meta, mine, onActionDone,
}: {
  msg: MessageItem; meta: any; mine: boolean; onActionDone: (msg?: string) => void;
}) {
  const [busy, setBusy] = useState<"pay" | "decline" | null>(null);
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
  const [paid, setPaid] = useState(meta.status === "settled" || !mine);
  const isPayer = !mine;

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
// Voice / Image / Video / Document bubbles
// ============================================================================

function VoiceBubble({ msg, meta, mine }: { msg: MessageItem; meta: any; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const waveform: number[] = Array.isArray(meta.waveform) ? meta.waveform : [];
  const duration: number = Number(meta.duration) || 0;

  // Ensure waveform has at least a few bars (placeholder if missing)
  const bars = waveform.length > 0 ? waveform : Array.from({ length: 28 }, () => 0.3 + Math.random() * 0.5);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => toast.error("Couldn't play audio"));
      setPlaying(true);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2 shadow-premium-xs min-w-[200px]",
        mine
          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
          : "bg-card border border-border/60 rounded-bl-md",
      )}
    >
      <audio
        ref={audioRef}
        src={meta.url}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        preload="none"
      />
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggle}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full shrink-0 transition",
            mine ? "bg-white/20 hover:bg-white/30" : "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25",
          )}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <div className="flex items-end gap-[2px] h-7 flex-1 overflow-hidden">
          {bars.slice(0, 36).map((v, i) => (
            <div
              key={i}
              className={cn("w-[2px] rounded-full", mine ? "bg-white/70" : "bg-emerald-500/60")}
              style={{ height: `${Math.max(15, Math.min(100, v * 100))}%` }}
            />
          ))}
        </div>
        <span className={cn("text-[10px] tabular-nums shrink-0", mine ? "text-white/80" : "text-muted-foreground")}>
          {formatDuration(duration)}
        </span>
      </div>
      <div className={cn("flex items-center gap-1 mt-1 text-[10px]", mine ? "text-white/70 justify-end" : "text-muted-foreground")}>
        <Mic className="h-3 w-3 mr-0.5" />
        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        {mine && <TickStatus status={msg.status} light />}
      </div>
    </div>
  );
}

function ImageBubble({ msg, meta, mine }: { msg: MessageItem; meta: any; mine: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden shadow-premium-xs">
      <button onClick={() => setOpen(true)} className="block">
        <img
          src={meta.url}
          alt={meta.name || "Photo"}
          className="block max-w-[280px] max-h-[320px] w-auto h-auto object-cover"
        />
      </button>
      <div className={cn("flex items-center justify-between gap-1 px-2 py-1 text-[10px]", mine ? "bg-emerald-600/90 text-white/80" : "bg-muted/60 text-muted-foreground")}>
        <span className="truncate">{meta.name}</span>
        <span className="shrink-0 flex items-center gap-1">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {mine && <TickStatus status={msg.status} light />}
        </span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 sm:rounded-2xl overflow-hidden bg-black/95 border-0 [&>button]:top-3 [&>button]:right-3 [&>button]:text-white/70 [&>button]:hover:text-white">
          <DialogHeader className="sr-only">
            <DialogTitle>{meta.name || "Photo"}</DialogTitle>
            <DialogDescription>Image preview</DialogDescription>
          </DialogHeader>
          <img src={meta.url} alt={meta.name || "Photo"} className="block max-w-full max-h-[85vh] mx-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoBubble({ msg, meta, mine }: { msg: MessageItem; meta: any; mine: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-premium-xs">
      <video controls src={meta.url} className="block max-w-[320px] max-h-[320px] w-auto h-auto bg-black" />
      <div className={cn("flex items-center justify-between gap-1 px-2 py-1 text-[10px]", mine ? "bg-emerald-600/90 text-white/80" : "bg-muted/60 text-muted-foreground")}>
        <span className="truncate">{meta.name}</span>
        <span className="shrink-0 flex items-center gap-1">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {mine && <TickStatus status={msg.status} light />}
        </span>
      </div>
    </div>
  );
}

function DocumentBubble({ msg, meta, mine }: { msg: MessageItem; meta: any; mine: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl px-3 py-2.5 shadow-premium-xs min-w-[220px] max-w-[280px]",
        mine
          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md"
          : "bg-card border border-border/60 rounded-bl-md",
      )}
    >
      <a href={meta.url} download={meta.name} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 group">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl shrink-0", mine ? "bg-white/20" : "bg-emerald-500/15 text-emerald-600")}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", mine ? "text-white" : "text-foreground")}>{meta.name}</p>
          <p className={cn("text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
            {meta.mimeType?.split("/").pop()?.toUpperCase() || "FILE"} · {formatFileSize(meta.size || 0)}
          </p>
        </div>
        <Download className={cn("h-4 w-4 shrink-0", mine ? "text-white/80" : "text-muted-foreground group-hover:text-emerald-600")} />
      </a>
      <div className={cn("flex items-center gap-1 mt-1.5 text-[10px]", mine ? "text-white/70 justify-end" : "text-muted-foreground")}>
        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        {mine && <TickStatus status={msg.status} light />}
      </div>
    </div>
  );
}

// ============================================================================
// Delete / Forward / New Group dialogs
// ============================================================================

function DeleteMessageDialog({
  msg, mine, onClose, onConfirm,
}: {
  msg: MessageItem | null; mine: boolean; onClose: () => void; onConfirm: (scope: "me" | "all") => void;
}) {
  return (
    <AlertDialog open={!!msg} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-rose-500" /> Delete message?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This message will be deleted. Choose who should stop seeing it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2 pb-2">
          <button
            onClick={() => onConfirm("me")}
            className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left hover:bg-muted transition"
          >
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Delete for me</p>
              <p className="text-[11px] text-muted-foreground">Removes this message from your view only.</p>
            </div>
          </button>
          {mine && (
            <button
              onClick={() => onConfirm("all")}
              className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-left hover:bg-rose-500/10 transition"
            >
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/15 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Delete for everyone</p>
                <p className="text-[11px] text-muted-foreground">Removes this message for everyone in the chat.</p>
              </div>
            </button>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ForwardModal({
  msg, currentConvId, onClose,
}: {
  msg: MessageItem | null; currentConvId: string; onClose: () => void;
}) {
  const { data } = useFetch<ConversationsResponse>("/api/messaging/conversations");
  const conversations = (data?.conversations ?? []).filter((c) => c.id !== currentConvId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (msg) setSelected(new Set());
  }, [msg]);

  async function confirm() {
    if (!msg || selected.size === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messaging/conversations/${currentConvId}/messages/${msg.id}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetConversationIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to forward");
      toast.success(`Forwarded to ${data.forwarded || selected.size} conversation${(data.forwarded || selected.size) === 1 ? "" : "s"}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to forward");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!msg} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-4 w-4 text-emerald-500" /> Forward message
          </DialogTitle>
          <DialogDescription>
            Select one or more conversations to forward this message to.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto no-scrollbar -mx-2 px-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No other conversations available.</p>
          ) : conversations.map((c) => {
            const isSel = selected.has(c.id);
            return (
              <label
                key={c.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2 cursor-pointer transition",
                  isSel ? "bg-emerald-500/10" : "hover:bg-muted",
                )}
              >
                <Checkbox checked={isSel} onCheckedChange={() => {
                  setSelected((s) => {
                    const next = new Set(s);
                    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                    return next;
                  });
                }} />
                <Avatar className="h-9 w-9">
                  {c.isGroup ? (
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white text-[10px] font-bold">
                      {groupInitials(c.groupName)}
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={c.user?.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold">
                        {initials(c.user)}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.isGroup ? c.groupName : fullName(c.user)}</p>
                  <p className="text-[10px] text-muted-foreground">{c.isGroup ? `${c.memberCount} members` : "Direct chat"}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600"
            disabled={sending || selected.size === 0}
            onClick={confirm}
          >
            {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Forward className="h-4 w-4 mr-1" />}
            Forward {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewGroupModal({
  open, onClose, contacts, onCreated,
}: {
  open: boolean; onClose: () => void; contacts: Participant[]; onCreated: (convId: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) { setName(""); setSelected(new Set()); }
  }, [open]);

  async function create() {
    if (!name.trim()) return toast.error("Enter a group name");
    if (selected.size === 0) return toast.error("Select at least one member");
    setCreating(true);
    try {
      const res = await fetch("/api/messaging/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), memberIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      toast.success(`Group “${name.trim()}” created`);
      if (data.conversation?.id) onCreated(data.conversation.id);
      else onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" /> New group
          </DialogTitle>
          <DialogDescription>Create a group chat with your contacts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Group name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lagos Family"
              className="h-10 rounded-xl"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Add members ({selected.size} selected)
            </Label>
            <div className="max-h-60 overflow-y-auto no-scrollbar rounded-xl border border-border/60 -mx-0.5">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No contacts available. Start a 1-to-1 chat first.</p>
              ) : contacts.map((c) => {
                const isSel = selected.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2 cursor-pointer transition border-b last:border-0",
                      isSel ? "bg-violet-500/8" : "hover:bg-muted",
                    )}
                  >
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => {
                        setSelected((s) => {
                          const next = new Set(s);
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                          return next;
                        });
                      }}
                    />
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={c.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold">
                        {initials(c)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1">
                        {fullName(c)}
                        {c.kycStatus === "verified" && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
                      </p>
                      {c.username && <p className="text-[10px] text-muted-foreground truncate">@{c.username}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600"
              disabled={creating || !name.trim() || selected.size === 0}
              onClick={create}
            >
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Users className="h-4 w-4 mr-1" />}
              Create group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const contacts = (data?.conversations ?? [])
    .filter((c) => !c.isGroup && c.user)
    .map((c) => c.user as Participant);
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
  const contacts = (data?.conversations ?? [])
    .filter((c) => !c.isGroup && c.user)
    .map((c) => c.user as Participant);
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
