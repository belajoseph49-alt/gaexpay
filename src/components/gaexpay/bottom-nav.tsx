"use client";

/**
 * src/components/gaexpay/bottom-nav.tsx
 *
 * Premium mobile bottom navigation — MIMI-Pay-inspired.
 * 5 tabs: Home · Wallets · Send (center, elevated) · Pay · More
 * The "More" tab opens the full Sheet drawer (MobileNav).
 *
 * Visible only on mobile (lg:hidden). Respects iOS safe-area inset.
 */

import { Home, Wallet, SendHorizontal, QrCode, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type View } from "@/lib/store";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MobileNav } from "./mobile-nav";
import { useState } from "react";

interface Tab {
  id: View;
  label: string;
  icon: typeof Home;
  /** Center, elevated FAB-style button */
  center?: boolean;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "Home", icon: Home },
  { id: "wallets", label: "Wallets", icon: Wallet },
  { id: "send", label: "Send", icon: SendHorizontal, center: true },
  { id: "pay", label: "Pay", icon: QrCode },
];

/** Maps a current view to which bottom tab should be highlighted. */
function activeTabFor(view: View): View | "more" | null {
  switch (view) {
    case "dashboard":
    case "business-dashboard":
      return "dashboard";
    case "wallets":
    case "wallet-detail":
      return "wallets";
    case "send":
    case "international":
    case "unified-address":
    case "transactions":
      return "send";
    case "pay":
    case "scheduled":
      return "pay";
    default:
      // Everything else lives under "More"
      return "more";
  }
}

export function BottomNav() {
  const { view, setView } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = activeTabFor(view);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-2xl safe-area-bottom"
      aria-label="Primary"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
        {TABS.slice(0, 2).map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onClick={() => setView(tab.id)}
          />
        ))}

        {/* Center elevated Send button */}
        <TabButton
          tab={TABS[2]}
          active={active === TABS[2].id}
          onClick={() => setView(TABS[2].id)}
          center
        />

        {TABS.slice(3).map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={active === tab.id}
            onClick={() => setView(tab.id)}
          />
        ))}

        {/* More — opens Sheet drawer */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "group relative flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
                active === "more" ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="More navigation"
            >
              <LayoutGrid className={cn("h-[22px] w-[22px] transition-transform group-active:scale-90", active === "more" && "scale-95")} />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">More navigation</SheetTitle>
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
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
  center?: boolean;
}) {
  const Icon = tab.icon;
  if (center) {
    return (
      <button
        onClick={onClick}
        className="group relative flex flex-col items-center justify-center"
        aria-label={tab.label}
        aria-current={active ? "page" : undefined}
      >
        {/* Elevated circular button with gradient + glow */}
        <span
          className={cn(
            "relative -mt-5 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-premium-lg ring-4 ring-background transition-transform duration-200 group-active:scale-95",
            active && "ring-primary/20",
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
          {active && (
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-pulse-glow" />
          )}
        </span>
        <span className={cn("mt-1 text-[10px] font-semibold transition-colors", active ? "text-primary" : "text-muted-foreground")}>
          {tab.label}
        </span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-[22px] w-[22px] transition-transform duration-200 group-active:scale-90",
          active && "scale-95",
        )}
        strokeWidth={active ? 2.4 : 2}
      />
      <span className={cn("text-[10px] font-semibold", active && "text-primary")}>
        {tab.label}
      </span>
      {active && (
        <span className="absolute -top-px h-[3px] w-7 rounded-full bg-primary" />
      )}
    </button>
  );
}
