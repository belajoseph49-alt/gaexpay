"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Send, Image as ImageIcon, Users,
  UserPlus, Check, X, Trash2, MoreHorizontal, Sparkles, BadgeCheck,
  TrendingUp, TrendingDown, ChevronLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/gaexpay";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";

// ============================================================================
// Types — mirrors the API response shape
// ============================================================================

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  avatar?: string | null;
  city?: string | null;
  country?: string | null;
  kycStatus?: string | null;
}

interface CommentItem {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username?: string | null;
    avatar?: string | null;
  };
}

interface LikeItem {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
}

interface Post {
  id: string;
  authorId: string;
  author: Author;
  content: string;
  imageUrl?: string | null;
  amountTag?: number | null;
  amountKind?: string;
  currency: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  likes: LikeItem[];
  comments: CommentItem[];
  likedByMe?: boolean;
}

interface ConnectionItem {
  connectionId: string;
  status: string;
  createdAt: string;
  user: Author;
}

interface FeedResponse {
  posts: Post[];
}
interface ConnectionsResponse {
  accepted: ConnectionItem[];
  pending: ConnectionItem[];
  suggested: Author[];
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

// ============================================================================
// Main View
// ============================================================================

export function SocialView() {
  const { t } = useTranslation();
  const { setView, setSendPrefill } = useApp();
  const { fmt, fmtRaw } = useFormatMoney();
  const [tab, setTab] = useState<string>("feed");
  const [viewingProfile, setViewingProfile] = useState<Author | null>(null);

  const {
    data: feedData,
    loading: feedLoading,
    reload: reloadFeed,
  } = useFetch<FeedResponse>("/api/social/feed");
  const {
    data: connData,
    loading: connLoading,
    reload: reloadConns,
  } = useFetch<ConnectionsResponse>("/api/social/connections");

  const posts = feedData?.posts ?? [];
  const accepted = connData?.accepted ?? [];
  const pending = connData?.pending ?? [];
  const suggested = connData?.suggested ?? [];

  const handleSendMoneyFromPost = useCallback(
    (post: Post) => {
      setSendPrefill({
        recipient: post.author.username || post.author.id,
        amount: post.amountTag ?? undefined,
      });
      setView("send");
    },
    [setSendPrefill, setView],
  );

  // ---- profile overlay: show the user's own posts + their info ----
  const { data: profileData, loading: profileLoading } = useFetch<FeedResponse>(
    viewingProfile ? `/api/social/posts?authorId=${viewingProfile.id}` : null,
  );
  const profilePosts = profileData?.posts ?? [];

  if (viewingProfile) {
    return (
      <ProfileOverlay
        author={viewingProfile}
        posts={profilePosts}
        loading={profileLoading}
        onClose={() => setViewingProfile(null)}
        onSendMoney={(p) => handleSendMoneyFromPost(p)}
        onMessage={() => {
          setSendPrefill({ recipient: viewingProfile.username || viewingProfile.id });
          setView("messaging");
        }}
        onSendFromHeader={() => {
          setSendPrefill({ recipient: viewingProfile.username || viewingProfile.id });
          setView("send");
        }}
        fmt={fmt}
        fmtRaw={fmtRaw}
        t={t}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("social.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("social.subtitle")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="feed">{t("social.feed")}</TabsTrigger>
          <TabsTrigger value="connections">
            {t("social.connections")}
            {pending.length > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Feed tab */}
        <TabsContent value="feed" className="space-y-6">
          <CreatePostCard
            onPosted={() => reloadFeed()}
            fmtRaw={fmtRaw}
            t={t}
          />

          {/* Pending connection requests banner */}
          {pending.length > 0 && (
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">{t("social.connectionRequests")}</p>
                <Badge variant="secondary" className="text-[10px]">{pending.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((c) => (
                  <PendingConnectionRow
                    key={c.connectionId}
                    item={c}
                    onAction={() => reloadConns()}
                    t={t}
                  />
                ))}
              </div>
            </Card>
          )}

          {feedLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-1.5 h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="p-10 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">{t("social.noPosts")}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={() => reloadFeed()}
                    onComment={() => reloadFeed()}
                    onDelete={() => reloadFeed()}
                    onSendMoney={() => handleSendMoneyFromPost(post)}
                    onViewProfile={(a) => setViewingProfile(a)}
                    fmt={fmt}
                    fmtRaw={fmtRaw}
                    t={t}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Connections tab */}
        <TabsContent value="connections" className="space-y-6">
          {/* Pending requests */}
          {pending.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {t("social.connectionRequests")} ({pending.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((c) => (
                  <PendingConnectionRow
                    key={c.connectionId}
                    item={c}
                    onAction={() => reloadConns()}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accepted connections */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {t("social.yourConnections")} ({accepted.length})
            </h3>
            {connLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2].map((i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : accepted.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">{t("social.noConnections")}</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {accepted.map((c) => (
                  <ConnectionCard
                    key={c.connectionId}
                    item={c}
                    onViewProfile={(a) => setViewingProfile(a)}
                    onMessage={(u) => {
                      setSendPrefill({ recipient: u.username || u.id });
                      setView("messaging");
                    }}
                    onSend={(u) => {
                      setSendPrefill({ recipient: u.username || u.id });
                      setView("send");
                    }}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Suggested people */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {t("social.suggested")} ({suggested.length})
            </h3>
            {suggested.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                {t("social.noSuggested")}
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {suggested.map((u) => (
                  <SuggestedUserCard
                    key={u.id}
                    user={u}
                    onConnect={() => reloadConns()}
                    onViewProfile={(a) => setViewingProfile(a)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Create Post
// ============================================================================

interface CreatePostProps {
  onPosted: () => void;
  fmtRaw: (n: number, c: string) => string;
  t: (k: string, params?: Record<string, string | number>) => string;
}

function CreatePostCard({ onPosted, fmtRaw, t }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [showAmount, setShowAmount] = useState(false);
  const [amountKind, setAmountKind] = useState<"request" | "split">("request");
  const [amount, setAmount] = useState<string>("");
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error(t("social.createPost"));
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl.trim() || null,
          amountTag: showAmount && amount ? Number(amount) : null,
          amountKind: showAmount ? amountKind : "request",
          currency: "NGN",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Failed to post" }));
        throw new Error(j.error || "Failed to post");
      }
      toast.success(t("social.posted"));
      setContent("");
      setImageUrl("");
      setAmount("");
      setShowAmount(false);
      setShowImage(false);
      onPosted();
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            G
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("social.createPost")}
            className="min-h-[80px] resize-none border-0 px-0 focus-visible:ring-0 text-[15px]"
            maxLength={1200}
          />
          <AnimatePresence>
            {showImage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t("social.addImage")}
                  className="text-sm"
                />
                {imageUrl && (
                  <div className="mt-2 overflow-hidden rounded-xl border bg-muted/30 max-h-64">
                    { }
                    <img
                      src={imageUrl}
                      alt="attachment"
                      className="max-h-64 w-full object-cover"
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  </div>
                )}
              </motion.div>
            )}
            {showAmount && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/5 p-3">
                  <div className="inline-flex rounded-lg bg-background p-1 ring-1 ring-primary/20">
                    <button
                      type="button"
                      onClick={() => setAmountKind("request")}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition",
                        amountKind === "request"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <TrendingDown className="mr-1 inline h-3 w-3" />
                      {t("social.requestMoney")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountKind("split")}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition",
                        amountKind === "split"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <TrendingUp className="mr-1 inline h-3 w-3" />
                      {t("social.splitBill")}
                    </button>
                  </div>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder={t("social.amountPlaceholder")}
                    inputMode="decimal"
                    className="w-32 text-sm"
                  />
                  {amount && (
                    <span className="text-sm text-muted-foreground">
                      = {fmtRaw(Number(amount) || 0, "NGN")}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowImage((v) => !v)}
                className={cn("h-8", showImage && "bg-primary/10 text-primary")}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAmount((v) => !v)}
                className={cn("h-8", showAmount && "bg-primary/10 text-primary")}
              >
                <Send className="h-4 w-4" />
                <span className="ml-1 text-xs">{t("social.amountTagToggle")}</span>
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className="min-w-[88px]"
            >
              {posting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  <span className="ml-1.5">{t("social.posting")}</span>
                </>
              ) : (
                t("social.post")
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Post Card
// ============================================================================

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onComment: () => void;
  onDelete: () => void;
  onSendMoney: () => void;
  onViewProfile: (a: Author) => void;
  fmt: (n: number, fallback?: string) => string;
  fmtRaw: (n: number, c: string) => string;
  t: (k: string, params?: Record<string, string | number>) => string;
}

function PostCard({
  post, onLike, onComment, onDelete, onSendMoney, onViewProfile, fmt, fmtRaw, t,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    setLiking(true);
    try {
      const res = await fetch(`/api/social/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle like");
      onLike();
    } catch {
      toast.error("Failed to like post");
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/social/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to comment");
      setCommentText("");
      onComment();
      toast.success(t("social.reply"));
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("social.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/social/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Post deleted");
      onDelete();
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    if (navigator.share) {
      navigator.share({ title: "GaexPay Social", text: post.content, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      toast.success(t("social.linkCopied"));
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
    >
      <Card className="overflow-hidden card-lift">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <button
            onClick={() => onViewProfile(post.author)}
            className="shrink-0 rounded-full"
          >
            <Avatar className="h-10 w-10">
              {post.author.avatar ? (
                <AvatarImage src={post.author.avatar} alt={fullName(post.author)} />
              ) : null}
              <AvatarFallback className={cn("text-xs font-semibold", avatarColor(post.author.id))}>
                {initials(post.author)}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onViewProfile(post.author)}
                className="font-semibold text-sm hover:underline truncate"
              >
                {fullName(post.author)}
              </button>
              {post.author.kycStatus === "verified" && (
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              )}
              {post.author.username && (
                <span className="text-xs text-muted-foreground truncate">
                  @{post.author.username}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeAgo(post.createdAt)}
              {post.author.city ? ` · ${post.author.city}` : ""}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" /> {t("social.copyLink")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewProfile(post.author)}>
                <Users className="mr-2 h-4 w-4" /> {t("social.viewProfile")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> {t("social.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div className="overflow-hidden bg-muted/30 max-h-[480px]">
            { }
            <img
              src={post.imageUrl}
              alt="post attachment"
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        {/* Amount tag */}
        {post.amountTag != null && post.amountTag > 0 && (
          <div className="mx-4 my-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                {post.amountKind === "split" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {post.amountKind === "split" ? t("social.splitBillTag") : t("social.requestTag")}
                </p>
                <p className="font-bold text-[15px]">{fmtRaw(post.amountTag, post.currency)}</p>
              </div>
            </div>
            <Button size="sm" onClick={onSendMoney} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> {t("social.sendMoney")}
            </Button>
          </div>
        )}

        {/* Like count */}
        {post.likesCount > 0 && (
          <div className="px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
              <Heart className="h-2.5 w-2.5 fill-current" />
            </span>
            <span>
              {post.likesCount} {post.likesCount === 1 ? "like" : "likes"}
            </span>
            {post.commentsCount > 0 && (
              <>
                <span className="ml-auto cursor-pointer hover:underline" onClick={() => setShowComments(true)}>
                  {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
                </span>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 border-t px-2 py-1">
          <ActionButton
            onClick={handleLike}
            disabled={liking}
            active={post.likedByMe}
            icon={<Heart className={cn("h-4 w-4", post.likedByMe && "fill-current")} />}
            label={t("social.like")}
            count={post.likesCount}
          />
          <ActionButton
            onClick={() => setShowComments((v) => !v)}
            icon={<MessageCircle className="h-4 w-4" />}
            label={t("social.comment")}
            count={post.commentsCount}
          />
          <ActionButton
            onClick={handleShare}
            icon={<Share2 className="h-4 w-4" />}
            label={t("social.share")}
          />
          {post.amountTag != null && post.amountTag > 0 && (
            <ActionButton
              onClick={onSendMoney}
              icon={<Send className="h-4 w-4" />}
              label={t("social.sendMoney")}
              accent
            />
          )}
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t bg-muted/20"
            >
              <div className="space-y-3 p-4 pb-3 max-h-72 overflow-y-auto no-scrollbar">
                {post.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    {t("social.comments")} — 0
                  </p>
                ) : (
                  post.comments.map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <button
                        onClick={() => onViewProfile({
                          id: c.user.id,
                          firstName: c.user.firstName,
                          lastName: c.user.lastName,
                          username: c.user.username,
                          avatar: c.user.avatar,
                        })}
                        className="shrink-0"
                      >
                        <Avatar className="h-7 w-7">
                          {c.user.avatar ? (
                            <AvatarImage src={c.user.avatar} alt={fullName(c.user)} />
                          ) : null}
                          <AvatarFallback className={cn("text-[10px] font-semibold", avatarColor(c.user.id))}>
                            {initials(c.user)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex-1 rounded-2xl bg-background px-3 py-2 ring-1 ring-border">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{fullName(c.user)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 px-4 pb-3">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("social.writeComment")}
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleComment}
                  disabled={submitting || !commentText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function ActionButton({
  onClick, icon, label, count, active, accent, disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
        "hover:bg-muted/60",
        active
          ? accent
            ? "text-primary"
            : "text-primary"
          : "text-muted-foreground",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {count != null && count > 0 && <span className="text-[10px] opacity-70">({count})</span>}
    </button>
  );
}

// ============================================================================
// Connection Cards
// ============================================================================

function PendingConnectionRow({
  item, onAction, t,
}: {
  item: ConnectionItem;
  onAction: () => void;
  t: (k: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async (action: "accept" | "reject") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/social/connections/${item.connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(action === "accept" ? t("social.connected") : t("social.reject"));
      onAction();
    } catch {
      toast.error("Failed to update connection");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-3 flex items-center gap-3">
      <Avatar className="h-10 w-10">
        {item.user.avatar ? (
          <AvatarImage src={item.user.avatar} alt={fullName(item.user)} />
        ) : null}
        <AvatarFallback className={cn("text-xs font-semibold", avatarColor(item.user.id))}>
          {initials(item.user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-semibold text-sm truncate">{fullName(item.user)}</p>
          {item.user.kycStatus === "verified" && (
            <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          @{item.user.username} · {timeAgo(item.createdAt)}
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="default"
          className="h-8 px-2.5"
          onClick={() => handle("accept")}
          disabled={busy}
        >
          <Check className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs">{t("social.accept")}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => handle("reject")}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function ConnectionCard({
  item, onViewProfile, onMessage, onSend, t,
}: {
  item: ConnectionItem;
  onViewProfile: (a: Author) => void;
  onMessage: (u: Author) => void;
  onSend: (u: Author) => void;
  t: (k: string) => string;
}) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <button onClick={() => onViewProfile(item.user)} className="shrink-0">
        <Avatar className="h-10 w-10">
          {item.user.avatar ? (
            <AvatarImage src={item.user.avatar} alt={fullName(item.user)} />
          ) : null}
          <AvatarFallback className={cn("text-xs font-semibold", avatarColor(item.user.id))}>
            {initials(item.user)}
          </AvatarFallback>
        </Avatar>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewProfile(item.user)}
            className="font-semibold text-sm truncate hover:underline"
          >
            {fullName(item.user)}
          </button>
          {item.user.kycStatus === "verified" && (
            <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          @{item.user.username}
          {item.user.city ? ` · ${item.user.city}` : ""}
        </p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onMessage(item.user)}>
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => onSend(item.user)}>
          <Send className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs">{t("social.sendMoney")}</span>
        </Button>
      </div>
    </Card>
  );
}

function SuggestedUserCard({
  user, onConnect, onViewProfile, t,
}: {
  user: Author;
  onConnect: () => void;
  onViewProfile: (a: Author) => void;
  t: (k: string) => string;
}) {
  const [connecting, setConnecting] = useState(false);
  const [sent, setSent] = useState(false);
  const handle = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/social/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Failed");
      setSent(true);
      toast.success(t("social.pending"));
      onConnect();
    } catch {
      toast.error("Failed to send request");
    } finally {
      setConnecting(false);
    }
  };
  return (
    <Card className="p-4 flex flex-col items-center text-center">
      <button onClick={() => onViewProfile(user)} className="shrink-0">
        <Avatar className="h-12 w-12">
          {user.avatar ? (
            <AvatarImage src={user.avatar} alt={fullName(user)} />
          ) : null}
          <AvatarFallback className={cn("text-sm font-semibold", avatarColor(user.id))}>
            {initials(user)}
          </AvatarFallback>
        </Avatar>
      </button>
      <button
        onClick={() => onViewProfile(user)}
        className="mt-2 font-semibold text-sm hover:underline truncate w-full"
      >
        {fullName(user)}
      </button>
      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
      <Button
        size="sm"
        variant={sent ? "secondary" : "outline"}
        className="mt-3 w-full"
        onClick={handle}
        disabled={connecting || sent}
      >
        {sent ? (
          <>
            <Check className="h-3.5 w-3.5" /> {t("social.pending")}
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" /> {t("social.connect")}
          </>
        )}
      </Button>
    </Card>
  );
}

// ============================================================================
// Profile Overlay
// ============================================================================

interface ProfileOverlayProps {
  author: Author;
  posts: Post[];
  loading: boolean;
  onClose: () => void;
  onSendMoney: (p: Post) => void;
  onMessage: () => void;
  onSendFromHeader: () => void;
  fmt: (n: number, fallback?: string) => string;
  fmtRaw: (n: number, c: string) => string;
  t: (k: string, params?: Record<string, string | number>) => string;
}

function ProfileOverlay({
  author, posts, loading, onClose, onSendMoney, onMessage, onSendFromHeader, fmt, fmtRaw, t,
}: ProfileOverlayProps) {
  return (
    <div className="space-y-4">
      <button
        onClick={onClose}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {t("messaging.back")}
      </button>

      <Card className="relative overflow-hidden p-0 card-lift">
        <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
        <div className="px-4 pb-4 -mt-12 flex items-end gap-4">
          <Avatar className="h-24 w-24 ring-4 ring-background rounded-full">
            {author.avatar ? (
              <AvatarImage src={author.avatar} alt={fullName(author)} />
            ) : null}
            <AvatarFallback className={cn("text-2xl font-bold", avatarColor(author.id))}>
              {initials(author)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-bold truncate">{fullName(author)}</h2>
              {author.kycStatus === "verified" && (
                <BadgeCheck className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{author.username}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {author.city && author.country ? `${author.city}, ${author.country}` : (author.country ?? "")}
            </p>
          </div>
          <div className="flex gap-2 pb-1">
            <Button size="sm" variant="outline" onClick={onMessage}>
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="ml-1.5 text-xs hidden sm:inline">{t("messaging.title")}</span>
            </Button>
            <Button size="sm" onClick={onSendFromHeader}>
              <Send className="h-3.5 w-3.5" /> {t("social.sendMoney")}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">
          {t("social.postsCount", { count: posts.length })}
        </p>
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {t("social.noPosts")}
          </Card>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => {/* no-op in profile view */}}
              onComment={() => {/* no-op */}}
              onDelete={() => {/* no-op */}}
              onSendMoney={() => onSendMoney(post)}
              onViewProfile={() => {/* already on profile */}}
              fmt={fmt}
              fmtRaw={fmtRaw}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
