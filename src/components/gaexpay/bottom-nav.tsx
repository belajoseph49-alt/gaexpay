"use client";

/**
 * src/components/gaexpay/bottom-nav.tsx
 *
 * Premium mobile bottom navigation — MIMI-Pay-inspired.
 * 5 tabs: Wallet · Pay · Send (center, elevated) · Apps · GaexTalk
 * The "GaexTalk" tab opens the GaexTalk view.
 *
 * Visible only on mobile (lg:hidden). Respects iOS safe-area inset.
 */

import { Wallet, QrCode, SendHorizontal, LayoutGrid, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type View } from "@/lib/store";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MobileNav } from "./mobile-nav";
import { useState } from "react";
import { useTranslation } from "@/hooks/use-translation";

interface Tab {
  id: View;
  label: string;
  fallbackLabel: string;
  icon: any;
  /** Center, elevated FAB-style button */
  center?: boolean;
}

const TABS: Tab[] = [
  { id: "wallets", label: "nav.wallets", fallbackLabel: "Wallet", icon: Wallet },
  { id: "pay", label: "nav.pay", fallbackLabel: "Pay", icon: QrCode },
  { id: "send", label: "nav.send", fallbackLabel: "Send", icon: SendHorizontal, center: true },
  { id: "mini-apps", label: "nav.apps", fallbackLabel: "Apps", icon: LayoutGrid },
];

/** Maps a current view to which bottom tab should be highlighted. */
function activeTabFor(view: View): View | "more" | null {
  switch (view) {
    case "wallets":
    case "wallet-detail":
      return "wallets";
    case "pay":
    case "scheduled":
      return "pay";
    case "send":
    case "international":
    case "unified-address":
    case "transactions":
      return "send";
    case "mini-apps":
      return "mini-apps";
    case "gaex-chat":
      return "gaex-chat";
    default:
      // Everything else lives under "More" sheet
      return "more";
  }
}

export function BottomNav() {
  const { t } = useTranslation();
  const { view, setView } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = activeTabFor(view);

  return (
    <nav
      className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-[32px] border border-white/20 bg-background/70 backdrop-blur-3xl shadow-2xl shadow-violet-900/10 dark:shadow-none dark:border-white/10 dark:bg-slate-950/60 safe-area-bottom"
      aria-label="Primary"
    >
      <div className="mx-auto grid grid-cols-5 items-center px-2 py-2">
        {TABS.slice(0, 2).map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            t={t}
            active={active === tab.id}
            onClick={() => setView(tab.id)}
          />
        ))}

        {/* Center elevated Send button */}
        <TabButton
          tab={TABS[2]}
          t={t}
          active={active === TABS[2].id}
          onClick={() => setView(TABS[2].id)}
          center
        />

        {TABS.slice(3).map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            t={t}
            active={active === tab.id}
            onClick={() => setView(tab.id)}
          />
        ))}

        {/* GaexTalk tab */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 py-2 transition-all duration-300",
                active === "gaex-chat" || active === "more" ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="GaexTalk"
            >
              <MessageCircle className={cn("h-[22px] w-[22px] transition-transform duration-300 group-active:scale-90", (active === "gaex-chat" || active === "more") && "scale-95")} />
              <span className="text-[10px] font-semibold tracking-wide">{t("nav.gaextalk", { defaultValue: "GaexTalk" })}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-r-0 shadow-2xl">
            <SheetTitle className="sr-only">GaexTalk navigation</SheetTitle>
            <MobileNav onNavigate={() => setMoreOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

function TabButton({
  tab,
  active,
  onClick,
  center,
  t,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
  center?: boolean;
  t: any;
}) {
  const Icon = tab.icon;
  const labelText = t(tab.label, { defaultValue: tab.fallbackLabel });
  if (center) {
    return (
      <button
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center"
        aria-label={labelText}
        aria-current={active ? "page" : undefined}
      >
        {/* Elevated circular button with gradient + glow */}
        <span
          className={cn(
            "relative -mt-8 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-xl shadow-violet-500/30 ring-4 ring-background/50 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105 group-active:scale-95",
            active && "ring-violet-500/20",
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
          {active && (
            <span className="absolute inset-0 rounded-full ring-2 ring-violet-400/40 animate-pulse-glow" />
          )}
        </span>
        <span className={cn("mt-1.5 text-[10px] font-semibold tracking-wide transition-colors duration-300", active ? "text-primary" : "text-muted-foreground")}>
          {labelText}
        </span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1 py-2 transition-all duration-300",
        active ? "text-primary" : "text-muted-foreground",
      )}
      aria-label={labelText}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-[22px] w-[22px] transition-all duration-300 group-active:scale-90",
          active && "scale-105",
        )}
        strokeWidth={active ? 2.4 : 2}
      />
      <span className={cn("text-[10px] font-semibold tracking-wide transition-colors", active && "text-primary")}>
        {labelText}
      </span>
      {active && (
        <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
      )}
    </button>
  );
}
