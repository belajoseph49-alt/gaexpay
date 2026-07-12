"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bell, CheckCheck, BellOff, Loader2, Sparkles, RefreshCw, BellRing,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { timeAgo, formatDateTime } from "@/lib/gaexpay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useApp, type View } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  NOTIFICATION_ICONS,
  NOTIFICATION_COLORS,
  NOTIFICATION_FILTER_TABS,
  NOTIFICATION_TYPE_LABELS,
  notificationToView,
} from "@/lib/notifications";
import {
  requestNotificationPermission,
  notificationPermission,
  showBrowserNotification,
} from "@/lib/push-client";

type Notif = {
  id: string;
  title: string;
  message: string;
  type: string;
  channel: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: string | null;
  createdAt: string;
};

type ApiResponse = {
  notifications: Notif[];
  unread: number;
  total: number;
};

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationsView() {
  const { setView } = useApp();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [seeding, setSeeding] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  // Active filter for the API request — derived from the active tab.
  const filter = useMemo(() => {
    const tab = NOTIFICATION_FILTER_TABS.find((t) => t.id === activeTab);
    return tab?.filter ?? "";
  }, [activeTab]);

  // Build the API URL with filter + limit. The `since` query param is used
  // by the polling effect to only fetch NEW notifications.
  const baseUrl = `/api/notifications?limit=100${filter ? `&filter=${encodeURIComponent(filter)}` : ""}`;

  const { data, loading, reload, setData } = useFetch<ApiResponse>(baseUrl);

  // ----- Real-time polling -----
  // Every 30s, ask for notifications created after the newest one we have.
  // If any come back, prepend them to the list and fire a browser push.
  const lastCheckRef = useRef<Date>(new Date());
  const initialLoadDoneRef = useRef(false);

  // Track which notification IDs we've already shown a browser push for,
  // so we don't re-notify when the user switches tabs.
  const pushedIdsRef = useRef<Set<string>>(new Set());

  const pollOnce = useCallback(async () => {
    try {
      const since = lastCheckRef.current.toISOString();
      // Always poll the UNFILTERED list so we don't miss notifications of
      // other types while a filter tab is active. The new items will only
      // show in the list if they match the active filter — but the bell
      // badge + browser push fire for ANY new notification.
      const url = `/api/notifications?limit=10&since=${encodeURIComponent(since)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as ApiResponse;
      if (!json.notifications?.length) return;

      // Update the high-water mark to the newest notification's createdAt.
      const newest = json.notifications[0];
      if (newest) {
        lastCheckRef.current = new Date(newest.createdAt);
      }

      // Identify which of the returned notifications we've never seen before.
      const freshNotifs = json.notifications.filter(
        (n) => !pushedIdsRef.current.has(n.id),
      );

      // Fire browser push notifications for any IDs we haven't already pushed.
      // Only do this after the initial load — otherwise we'd re-push every
      // existing notification on first mount.
      if (initialLoadDoneRef.current && notificationPermission() === "granted") {
        for (const n of freshNotifs) {
          showBrowserNotification(n.title, {
            body: n.message,
            tag: n.id,
          });
        }
      }
      // Mark all returned IDs as seen so we never push them twice.
      for (const n of json.notifications) pushedIdsRef.current.add(n.id);

      // If we're on the "all" tab, prepend the new notifications to the
      // visible list. Other tabs require a refetch (the new notifs may not
      // match the filter) — just call reload().
      if (filter === "" && freshNotifs.length > 0) {
        setData((prev) => {
          const existing = prev?.notifications ?? [];
          const existingIds = new Set(existing.map((n) => n.id));
          const toPrepend = freshNotifs.filter((n) => !existingIds.has(n.id));
          if (toPrepend.length === 0) return prev;
          return {
            notifications: [...toPrepend, ...existing].slice(0, 100),
            unread: json.unread,
            total: prev?.total ?? json.total,
          };
        });
        // Show an in-app toast so the user gets feedback even without OS notif permission.
        if (initialLoadDoneRef.current) {
          toast.info(`${freshNotifs.length} new notification${freshNotifs.length === 1 ? "" : "s"}`, {
            description: freshNotifs[0]?.title,
          });
        }
      } else if (freshNotifs.length > 0) {
        // On a filter tab — just reload to pick up any matching new ones.
        reload();
      }
    } catch {
      /* polling failures are non-fatal — try again next interval */
    }
  }, [filter, reload, setData]);

  // Initial load: set the high-water mark to the newest notification's
  // createdAt so we don't immediately re-push everything that already exists.
  useEffect(() => {
    if (data && !initialLoadDoneRef.current) {
      const newest = data.notifications[0];
      if (newest) {
        lastCheckRef.current = new Date(newest.createdAt);
      }
      // Mark all existing notification IDs as "already pushed" so we don't
      // re-notify for them on the first poll.
      for (const n of data.notifications) {
        pushedIdsRef.current.add(n.id);
      }
      initialLoadDoneRef.current = true;
    }
  }, [data]);

  // Set up the 30s polling interval.
  useEffect(() => {
    const id = setInterval(pollOnce, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollOnce]);

  // Sync browser notification permission state on mount.
  useEffect(() => {
    setPushPermission(notificationPermission());
  }, []);

  // ----- Actions -----
  async function markAllRead() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error("Failed");
      // Optimistically update the local list.
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
              unread: 0,
            }
          : prev,
      );
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Could not mark all as read");
    } finally {
      setMarkingAll(false);
    }
  }

  async function toggleRead(n: Notif) {
    const next = !n.isRead;
    // Optimistic update.
    setData((prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((x) =>
              x.id === n.id ? { ...x, isRead: next } : x,
            ),
            unread: next ? Math.max(0, prev.unread - 1) : prev.unread + 1,
          }
        : prev,
    );
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id, isRead: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert on failure.
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((x) =>
                x.id === n.id ? { ...x, isRead: !next } : x,
              ),
              unread: next ? (prev.unread + 1) : Math.max(0, prev.unread - 1),
            }
          : prev,
      );
      toast.error("Could not update notification");
    }
  }

  function handleClick(n: Notif) {
    // Mark as read on click.
    if (!n.isRead) toggleRead(n);
    // Navigate to the relevant view.
    const target = notificationToView(n) as View | null;
    if (target) setView(target);
  }

  async function enablePush() {
    const granted = await requestNotificationPermission();
    setPushPermission(notificationPermission());
    if (granted) {
      toast.success("Browser notifications enabled", {
        description: "You'll see desktop alerts when new notifications arrive.",
      });
    } else {
      toast.warning("Browser notifications blocked", {
        description: "You can still see notifications inside the app.",
      });
    }
  }

  async function seedSample() {
    setSeeding(true);
    try {
      const res = await fetch("/api/notifications/seed", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as { seeded: number; total: number; message: string };
      toast.success(json.message || "Sample notifications created");
      // Reset the "initial load done" flag so we don't push the seeds.
      initialLoadDoneRef.current = false;
      pushedIdsRef.current.clear();
      reload();
    } catch {
      toast.error("Could not create sample notifications");
    } finally {
      setSeeding(false);
    }
  }

  const notifs = data?.notifications ?? [];
  const unread = data?.unread ?? 0;
  const total = data?.total ?? 0;
  const isEmpty = !loading && notifs.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time alerts about your account, transactions, and security.
            {unread > 0 && (
              <>
                {" "}
                <Badge variant="secondary" className="ml-1">{unread} unread</Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            className="h-9"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll || unread === 0}
            className="h-9"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            )}
            Mark all read
          </Button>
        </div>
      </div>

      {/* Push permission banner (only when default + supported) */}
      {pushPermission === "default" && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <BellRing className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Enable browser notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get desktop alerts for new transactions, security events, and bill reminders —
                even when this tab is in the background.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={enablePush} className="h-9">
            <Bell className="h-3.5 w-3.5 mr-1.5" /> Enable
          </Button>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {NOTIFICATION_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
            {tab.id === "unread" && unread > 0 && (
              <span className="ml-1.5 inline-grid h-4 min-w-4 place-items-center rounded-full bg-background/40 px-1 text-[10px]">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-muted/60 text-muted-foreground">
              <BellOff className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">No notifications here</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {activeTab === "all"
                  ? "You haven't received any notifications yet. Trigger a transaction or load a few sample notifications to see how it works."
                  : "No notifications match this filter. Try another tab."}
              </p>
            </div>
            {activeTab === "all" && (
              <Button size="sm" variant="outline" onClick={seedSample} disabled={seeding} className="mt-1">
                {seeding ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Load sample notifications
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y">
              {notifs.map((n) => {
                const Icon = NOTIFICATION_ICONS[n.type] || Bell;
                const target = notificationToView(n);
                // Outer element is a div (not a button) because the row
                // contains a Switch which itself renders a <button> — nesting
                // buttons is invalid HTML and triggers a hydration error.
                // The div is given role="button" + keyboard handler so it
                // remains keyboard-accessible.
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick(n);
                      }
                    }}
                    className={cn(
                      "group flex w-full cursor-pointer gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset",
                      !n.isRead && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        NOTIFICATION_COLORS[n.type] || NOTIFICATION_COLORS.info,
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold leading-tight">{n.title}</p>
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] uppercase tracking-wide">
                          {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                        </Badge>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <p className="text-[10px] text-muted-foreground/80" title={formatDateTime(n.createdAt)}>
                          {timeAgo(n.createdAt)}
                        </p>
                        {target && (
                          <span className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100">
                            View →
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Per-item mark-as-read toggle. The stopPropagation on the
                        wrapper prevents a click on the Switch from also
                        triggering the row's onClick (which would navigate
                        away). */}
                    <span
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                      className="flex items-center"
                    >
                      <Switch
                        checked={n.isRead}
                        onCheckedChange={() => toggleRead(n)}
                        className="scale-75"
                        aria-label="Mark as read"
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Footer summary */}
      {!loading && total > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {notifs.length} of {total} notification{total === 1 ? "" : "s"}
          {unread > 0 && ` · ${unread} unread`}
        </p>
      )}
    </div>
  );
}
