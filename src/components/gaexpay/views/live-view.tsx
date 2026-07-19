"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Video, Users, Heart, Send, X, Loader2, Play, Calendar,
  ChevronLeft, TrendingUp, Sparkles, MessageCircle, Eye, Clock,
  Gift, Flag, Coins, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Streamer {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  accountType: string;
}

interface Stream {
  id: string;
  title: string;
  category: string;
  status: "live" | "ended" | "scheduled";
  viewerCount: number;
  donationGoal: number | null;
  donationsTotal: number;
  donationsCount: number;
  startedAt: string;
  endedAt: string | null;
  scheduledFor: string | null;
  durationMs: number;
  streamer: Streamer;
}

interface StreamDetail extends Stream {
  donations: {
    id: string;
    donorName: string;
    amount: number;
    currency: string;
    message: string | null;
    createdAt: string;
  }[];
}

interface StreamsResponse {
  streams: Stream[];
  stats: { liveCount: number; scheduledCount: number; totalViewers: number };
}

interface WalletsResponse {
  wallets: { id: string; currency: string; balance: number; type: string }[];
}

const CATEGORIES = [
  { id: "crypto", labelKey: "live.category.crypto", color: "from-amber-500 to-orange-600" },
  { id: "shopping", labelKey: "live.category.shopping", color: "from-pink-500 to-rose-600" },
  { id: "food", labelKey: "live.category.food", color: "from-orange-500 to-red-600" },
  { id: "fitness", labelKey: "live.category.fitness", color: "from-emerald-500 to-teal-600" },
  { id: "music", labelKey: "live.category.music", color: "from-violet-500 to-purple-600" },
  { id: "gaming", labelKey: "live.category.gaming", color: "from-indigo-500 to-violet-600" },
  { id: "education", labelKey: "live.category.education", color: "from-sky-500 to-blue-600" },
  { id: "business", labelKey: "live.category.business", color: "from-slate-600 to-slate-800" },
  { id: "general", labelKey: "live.category.general", color: "from-emerald-500 to-teal-700" },
];

function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Stable avatar gradient derived from the streamer's name.
function avatarGradient(name: string): string {
  const palettes = [
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-pink-500 to-rose-600",
    "from-sky-500 to-blue-600",
    "from-violet-500 to-purple-600",
    "from-orange-500 to-red-600",
    "from-slate-600 to-slate-800",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return palettes[sum % palettes.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function LiveView() {
  const { t } = useTranslation();
  const { fmt, fmtCompact } = useFormatMoney();
  const { data, loading, reload } = useFetch<StreamsResponse>("/api/live/streams");

  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);

  const streams = data?.streams ?? [];
  const liveStreams = streams.filter((s) => s.status === "live");
  const upcomingStreams = streams.filter((s) => s.status === "scheduled");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/20">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("live.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("live.subtitle")}</p>
          </div>
        </div>
        <Button onClick={() => setGoLiveOpen(true)} className="self-start sm:self-auto bg-gradient-to-r from-rose-500 to-pink-600 text-white">
          <Video className="h-4 w-4 mr-1.5" />
          {t("live.goLive")}
        </Button>
      </motion.div>

      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("live.liveNow")}</p>
              <p className="text-lg font-bold">{data?.stats.liveCount ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("live.upcoming")}</p>
              <p className="text-lg font-bold">{data?.stats.scheduledCount ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("live.viewers")}</p>
              <p className="text-lg font-bold">{data?.stats.totalViewers ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Live now */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
            <h2 className="text-lg font-semibold">{t("live.liveNow")}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={reload}>
            <Play className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : liveStreams.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("live.noStreams")}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveStreams.map((s, idx) => (
              <StreamCard key={s.id} stream={s} index={idx} onOpen={() => setActiveStream(s)} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcomingStreams.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-amber-500" />
            <h2 className="text-lg font-semibold">{t("live.upcoming")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingStreams.map((s, idx) => (
              <StreamCard key={s.id} stream={s} index={idx} onOpen={() => setActiveStream(s)} />
            ))}
          </div>
        </div>
      )}

      {/* Go Live modal */}
      <GoLiveModal open={goLiveOpen} onClose={() => setGoLiveOpen(false)} onSuccess={() => { setGoLiveOpen(false); reload(); }} />

      {/* Stream viewer */}
      <StreamViewerModal
        stream={activeStream}
        onClose={() => setActiveStream(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stream card
// ---------------------------------------------------------------------------

function StreamCard({
  stream, index, onOpen,
}: { stream: Stream; index: number; onOpen: () => void }) {
  const { t } = useTranslation();
  const meta = categoryMeta(stream.category);
  const isLive = stream.status === "live";
  const donationProgress = stream.donationGoal
    ? Math.min(100, (stream.donationsTotal / stream.donationGoal) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -3 }}
    >
      <Card
        onClick={onOpen}
        className="overflow-hidden border-border/60 cursor-pointer transition-shadow hover:shadow-xl hover:shadow-rose-500/5"
      >
        {/* Thumbnail (styled placeholder) */}
        <div className={cn("relative aspect-video bg-gradient-to-br", meta.color)}>
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />
          {/* Streamer avatar in center */}
          <div className="absolute inset-0 grid place-items-center">
            <div className={cn("grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br text-white font-bold text-xl shadow-lg ring-4 ring-white/20", avatarGradient(stream.streamer.name))}>
              {initials(stream.streamer.name)}
            </div>
          </div>
          {/* LIVE badge */}
          {isLive ? (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </div>
          ) : (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
              <Calendar className="h-2.5 w-2.5" />
              UPCOMING
            </div>
          )}
          {/* Viewers badge */}
          {isLive && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              <Eye className="h-2.5 w-2.5" />
              {stream.viewerCount.toLocaleString()}
            </div>
          )}
          {/* Duration badge */}
          {isLive && (
            <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              {formatDuration(stream.durationMs)}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3.5">
          <div className="flex items-start gap-2 mb-2">
            <Badge variant="outline" className="text-[10px] py-0 h-4 capitalize border-border/60">
              {t(meta.labelKey)}
            </Badge>
            {stream.donationsTotal > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                <Gift className="h-2.5 w-2.5 mr-0.5" />
                {stream.donationsTotal.toLocaleString()}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-sm line-clamp-2 mb-1.5 leading-snug">{stream.title}</h3>
          <p className="text-[11px] text-muted-foreground">
            {t("live.streamBy", { name: stream.streamer.name })}
          </p>

          {/* Donation goal progress */}
          {stream.donationGoal && stream.donationGoal > 0 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">
                  {t("live.donationProgress", { current: stream.donationsTotal.toLocaleString(), goal: stream.donationGoal.toLocaleString() })}
                </span>
                <span className="font-medium">{donationProgress.toFixed(0)}%</span>
              </div>
              <Progress value={donationProgress} className="h-1" />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stream viewer modal
// ---------------------------------------------------------------------------

function StreamViewerModal({
  stream, onClose,
}: { stream: Stream | null; onClose: () => void }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<StreamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; name: string; message: string; ts: number }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [donateOpen, setDonateOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  // Load stream detail when stream changes
  useEffect(() => {
    if (!stream) {
      setDetail(null);
      setChatMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/live/streams/${stream.id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!cancelled) {
          setDetail(data.stream);
          // Seed chat with recent donations as messages
          const streamData = data.stream || {};
          const donations = streamData.donations ?? [];
          setChatMessages(
            donations.slice(0, 8).map((d: any) => ({
              id: d.id,
              name: d.donorName,
              message: d.message || `Sent ${d.amount} ${d.currency}`,
              ts: new Date(d.createdAt).getTime(),
            })),
          );
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [stream]);

  // Simulated live chat (auto-incoming messages)
  useEffect(() => {
    if (!detail || detail.status !== "live") return;
    const sampleMessages = [
      { name: "CryptoFan22", message: "Bullish on this! 🚀" },
      { name: "Ada_Lagos", message: "Greetings from Nigeria 🇳🇬" },
      { name: "PiMiner", message: "When GAEX listing?" },
      { name: "SatoshiNak", message: "Lightning network FTW" },
      { name: "Web3Builder", message: "Loving the stream 🔥" },
      { name: "MamaCrypto", message: "Sending love from Yaoundé 🇨🇲" },
      { name: "BlockBuilder", message: "Stake or HODL?" },
      { name: "GasFreeGirl", message: "No gas fees on GaexPay ✨" },
    ];
    const interval = setInterval(() => {
      const m = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      setChatMessages((prev) => [
        ...prev.slice(-30),
        { id: Math.random().toString(36), name: m.name, message: m.message, ts: Date.now() },
      ]);
    }, 3500);
    return () => clearInterval(interval);
  }, [detail]);

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMessages((prev) => [
      ...prev.slice(-30),
      { id: Math.random().toString(36), name: "You", message: msg, ts: Date.now() },
    ]);
    setChatInput("");
  };

  const endStream = async () => {
    if (!detail) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/live/streams/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to end stream");
      toast.success(t("live.streamEnded"));
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnding(false);
    }
  };

  if (!stream) return null;
  const isLive = detail?.status === "live";

  return (
    <Dialog open={!!stream} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden gap-0 max-h-[92vh]">
        <DialogTitle className="sr-only">Live Stream Viewer</DialogTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 max-h-[92vh] overflow-hidden">
          {/* Video + info */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            {/* Video placeholder */}
            <div className={cn("relative aspect-video bg-gradient-to-br shrink-0", categoryMeta(stream.category).color)}>
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: "radial-gradient(circle at 20% 20%, white 1.5px, transparent 1.5px), radial-gradient(circle at 80% 80%, white 1.5px, transparent 1.5px)",
                backgroundSize: "40px 40px",
              }} />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className={cn("mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br text-white font-bold text-2xl shadow-lg ring-4 ring-white/20 mb-3", avatarGradient(stream.streamer.name))}>
                    {initials(stream.streamer.name)}
                  </div>
                  <p className="text-white font-semibold text-sm">{stream.streamer.name}</p>
                  <p className="text-white/70 text-xs">{stream.title}</p>
                </div>
              </div>
              {/* Top overlay */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                {isLive ? (
                  <div className="flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-500 text-white border-0">UPCOMING</Badge>
                )}
                <div className="flex items-center gap-1">
                  {isLive && (
                    <div className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                      <Eye className="h-2.5 w-2.5" />
                      {detail?.viewerCount.toLocaleString() ?? 0}
                    </div>
                  )}
                  {detail && (
                    <div className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(detail.durationMs)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stream meta */}
            <div className="p-4 border-b border-border/60 shrink-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-2">{stream.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("live.streamBy", { name: stream.streamer.name })} · {t(`live.category.${stream.category}`)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize border-border/60 shrink-0">
                  {t(`live.category.${stream.category}`)}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("live.viewerCount")}</p>
                  <p className="text-sm font-semibold">{(detail?.viewerCount ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("live.donations")}</p>
                  <p className="text-sm font-semibold">{(detail?.donationsTotal ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("live.duration")}</p>
                  <p className="text-sm font-semibold">{detail ? formatDuration(detail.durationMs) : "—"}</p>
                </div>
              </div>

              {/* Donation goal progress */}
              {detail?.donationGoal && detail.donationGoal > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gift className="h-3 w-3" />
                      {t("live.donationProgress", {
                        current: detail.donationsTotal.toLocaleString(),
                        goal: detail.donationGoal.toLocaleString(),
                      })}
                    </span>
                    <span className="font-medium">
                      {((detail.donationsTotal / detail.donationGoal) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={(detail.donationsTotal / detail.donationGoal) * 100} className="h-1.5" />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                {isLive && (
                  <Button
                    size="sm"
                    onClick={() => setDonateOpen(true)}
                    className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                  >
                    <Heart className="h-3.5 w-3.5 mr-1" />
                    {t("live.donate")}
                  </Button>
                )}
                {detail && detail.streamer.id === "self" && isLive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={endStream}
                    disabled={ending}
                  >
                    {ending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
                    {t("live.endStream")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Live chat sidebar */}
          <div className="lg:col-span-1 flex flex-col bg-muted/20 border-l border-border/60 max-h-[60vh] lg:max-h-[92vh]">
            <div className="px-3 py-2.5 border-b border-border/60 flex items-center gap-2 shrink-0">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">{t("live.liveChat")}</span>
              {isLive && (
                <Badge variant="outline" className="ml-auto text-[9px] py-0 h-4 border-rose-500/40 text-rose-600 bg-rose-500/5">
                  <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse mr-0.5" />
                  LIVE
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded" />
                  ))}
                </div>
              ) : chatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Be the first to say hello!
                </p>
              ) : (
                chatMessages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs"
                  >
                    <span className="font-semibold text-primary">{m.name}: </span>
                    <span className="text-foreground">{m.message}</span>
                  </motion.div>
                ))
              )}
            </div>

            {/* Chat input */}
            <div className="p-2 border-t border-border/60 flex items-center gap-1.5 shrink-0">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Say something..."
                className="h-8 text-xs"
                disabled={!isLive}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendChat} disabled={!isLive || !chatInput.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Donate dialog */}
      {detail && (
        <DonateDialog
          stream={detail}
          open={donateOpen}
          onClose={() => setDonateOpen(false)}
          onSuccess={() => {
            setDonateOpen(false);
            // Refresh detail
            fetch(`/api/live/streams/${detail.id}`)
              .then((r) => r.json())
              .then((d) => setDetail(d.stream));
          }}
        />
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Donate dialog
// ---------------------------------------------------------------------------

function DonateDialog({
  stream, open, onClose, onSuccess,
}: {
  stream: StreamDetail;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { data: walletsData } = useFetch<WalletsResponse>("/api/wallets");
  const [amount, setAmount] = useState<string>("500");
  const [currency, setCurrency] = useState<string>("NGN");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const wallets = walletsData?.wallets ?? [];
  const selectedWallet = wallets.find((w) => w.currency === currency);
  const amountNum = Number(amount) || 0;

  const submit = async () => {
    if (amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/live/streams/${stream.id}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, currency, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Donation failed");
      toast.success(t("live.donationSent"));
      setMessage("");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("live.donationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            {t("live.donateToStreamer", { name: stream.streamer.name })}
          </DialogTitle>
          <DialogDescription>{stream.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currency selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {wallets.map((w, i) => (
                  <SelectItem key={w.id || `${w.currency}-${i}`} value={w.currency}>
                    {w.currency} — {w.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-1.5">
            {quickAmounts.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={Number(amount) === a ? "default" : "outline"}
                onClick={() => setAmount(String(a))}
                className="h-7 text-xs"
              >
                {a}
              </Button>
            ))}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("live.donationAmount")} ({currency})</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
            />
            {selectedWallet && (
              <p className="text-[10px] text-muted-foreground">
                Balance: {selectedWallet.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} {currency}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t("live.donationMessage")}</Label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("live.donationMessagePlaceholder")}
              maxLength={280}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || amountNum <= 0}
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{t("live.sending")}</>
              ) : (
                <><Heart className="h-4 w-4 mr-1" />{t("live.sendDonation")} · {amountNum.toLocaleString()} {currency}</>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Go Live modal
// ---------------------------------------------------------------------------

function GoLiveModal({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [donationGoal, setDonationGoal] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const isScheduled = !!scheduledFor;

  const submit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        category,
      };
      if (donationGoal) payload.donationGoal = Number(donationGoal);
      if (scheduledFor) payload.scheduledFor = new Date(scheduledFor).toISOString();

      const res = await fetch("/api/live/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start stream");
      toast.success(isScheduled ? t("live.streamScheduled") : t("live.streamStarted"));
      setTitle("");
      setDonationGoal("");
      setScheduledFor("");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || t("live.streamFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-rose-500" />
            {isScheduled ? t("live.scheduleStream") : t("live.goLiveTitle")}
          </DialogTitle>
          <DialogDescription>
            {isScheduled
              ? "Schedule a stream for later"
              : "Start broadcasting live now"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("live.streamTitle")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("live.streamTitlePlaceholder")}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{t("live.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {t(c.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("live.donationGoal")}</Label>
              <Input
                type="number"
                value={donationGoal}
                onChange={(e) => setDonationGoal(e.target.value)}
                placeholder="1000"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("live.scheduledFor")}</Label>
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
          </div>

          {isScheduled && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>Scheduling will mark this stream as "upcoming". You can go live at the scheduled time.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !title.trim()}
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />{isScheduled ? t("live.scheduling") : t("live.creating")}</>
              ) : isScheduled ? (
                <><Calendar className="h-4 w-4 mr-1" />{t("live.schedule")}</>
              ) : (
                <><Radio className="h-4 w-4 mr-1" />{t("live.startNow")}</>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
