"use client";

import { Bell, CheckCheck, TrendingUp, Shield, Gift, Info, AlertTriangle, PartyPopper } from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { timeAgo } from "@/lib/gaexpay";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ICONS: Record<string, any> = {
  transaction: TrendingUp,
  security: Shield,
  promo: Gift,
  success: PartyPopper,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<string, string> = {
  transaction: "bg-violet-500/15 text-violet-500",
  security: "bg-orange-500/15 text-orange-500",
  promo: "bg-fuchsia-500/15 text-fuchsia-500",
  success: "bg-violet-500/15 text-violet-500",
  warning: "bg-amber-500/15 text-amber-500",
  info: "bg-sky-500/15 text-sky-500",
  error: "bg-red-500/15 text-red-500",
};

export function NotificationsPanel() {
  const { data, reload } = useFetch<{ notifications: any[]; unread: number }>("/api/notifications");
  const { setView } = useApp();

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    reload();
    toast.success("All notifications marked as read");
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="font-semibold text-sm">Notifications</span>
          {!!data?.unread && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {data.unread} new
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
          <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
        </Button>
      </div>
      <ScrollArea className="h-[360px]">
        {data?.notifications?.length ? (
          data.notifications.map((n) => {
            const Icon = ICONS[n.type] || Info;
            return (
              <button
                key={n.id}
                onClick={() => setView("transactions")}
                className={cn(
                  "flex w-full gap-3 border-b px-4 py-3 text-left transition hover:bg-muted/50",
                  !n.isRead && "bg-primary/5",
                )}
              >
                <div className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", COLORS[n.type] || COLORS.info)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })
        ) : (
          <div className="grid place-items-center py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        )}
      </ScrollArea>
      <div className="border-t p-2">
        <Button variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={() => setView("transactions")}>
          View all activity
        </Button>
      </div>
    </div>
  );
}
