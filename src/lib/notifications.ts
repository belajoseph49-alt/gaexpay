"use client";

/**
 * src/lib/notifications.ts
 *
 * Client-side notification helpers — icon/color maps, type labels, and a
 * helper that maps a notification's `actionUrl` (or its `type`) to one of
 * the SPA's views for click-to-navigate behavior.
 */

import {
  TrendingUp, Shield, Gift, Info, AlertTriangle, PartyPopper,
  Receipt, BadgeCheck, Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import type { View } from "@/lib/store";

/** Notification type → icon. */
export const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  transaction: TrendingUp,
  security: Shield,
  promo: Gift,
  success: PartyPopper,
  warning: AlertTriangle,
  info: Info,
  error: AlertTriangle,
  bill: Receipt,
  kyc: BadgeCheck,
  system: SettingsIcon,
};

/** Notification type → color classes (icon + background). */
export const NOTIFICATION_COLORS: Record<string, string> = {
  transaction: "bg-emerald-500/15 text-emerald-500",
  security: "bg-orange-500/15 text-orange-500",
  promo: "bg-fuchsia-500/15 text-fuchsia-500",
  success: "bg-emerald-500/15 text-emerald-500",
  warning: "bg-amber-500/15 text-amber-500",
  info: "bg-sky-500/15 text-sky-500",
  error: "bg-red-500/15 text-red-500",
  bill: "bg-cyan-500/15 text-cyan-500",
  kyc: "bg-violet-500/15 text-violet-500",
  system: "bg-slate-500/15 text-slate-500",
};

/** Notification type → human-readable label (used in filter tabs + badges). */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  transaction: "Transactions",
  security: "Security",
  promo: "Promo",
  bill: "Bills",
  kyc: "KYC",
  warning: "Warnings",
  system: "System",
  info: "Info",
  success: "Success",
  error: "Errors",
};

/** Filter tab definitions for the notifications view. */
export const NOTIFICATION_FILTER_TABS: { id: string; label: string; filter: string }[] = [
  { id: "all", label: "All", filter: "" },
  { id: "unread", label: "Unread", filter: "unread" },
  { id: "transaction", label: "Transactions", filter: "type:transaction" },
  { id: "security", label: "Security", filter: "type:security" },
  { id: "bill", label: "Bills", filter: "type:bill" },
  { id: "kyc", label: "KYC", filter: "type:kyc" },
  { id: "promo", label: "Promo", filter: "type:promo" },
];

/**
 * Map a notification's `actionUrl` (or `type` as fallback) to a SPA view.
 *
 * The backend stores actionUrls like "/transactions", "/kyc", etc. We map
 * those path prefixes to the Zustand `View` enum the SPA uses for in-app
 * navigation.
 */
export function notificationToView(notification: {
  actionUrl?: string | null;
  type?: string;
}): View | null {
  const url = (notification.actionUrl ?? "").toLowerCase();
  if (url.startsWith("/transactions")) return "transactions";
  if (url.startsWith("/kyc")) return "kyc";
  if (url.startsWith("/security")) return "security";
  if (url.startsWith("/cards")) return "cards";
  if (url.startsWith("/pay")) return "pay";
  if (url.startsWith("/scheduled")) return "scheduled";
  if (url.startsWith("/support")) return "support";
  if (url.startsWith("/referral")) return "referral";
  if (url.startsWith("/dashboard")) return "dashboard";
  if (url.startsWith("/settings")) return "settings";
  if (url.startsWith("/wallets")) return "wallets";

  // Fall back to the notification type.
  switch (notification.type) {
    case "transaction":
      return "transactions";
    case "bill":
      return "pay";
    case "kyc":
      return "kyc";
    case "security":
    case "warning":
      return "security";
    case "promo":
      return "referral";
    default:
      return null;
  }
}
