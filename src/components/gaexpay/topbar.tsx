"use client";

import { useEffect } from "react";
import { Bell, Search, Menu, Plus, Sparkles, Coins, LogOut, Settings, ShieldCheck, ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { useApp } from "@/lib/store";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MobileNav } from "./mobile-nav";
import { NotificationsPanel } from "./notifications-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFetch } from "@/hooks/use-fetch";
import { clearAuthed } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { LANGUAGE_BY_CODE } from "@/lib/i18n/translations";

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  kycStatus: string;
}

export function Topbar() {
  const { setAiOpen, setView, userCurrency, setCurrencyPickerOpen, language, setLanguagePickerOpen } = useApp();
  const { t } = useTranslation();
  const { data } = useFetch<{ unread: number; notifications: any[] }>("/api/notifications");
  const { data: meData } = useFetch<{ user: CurrentUser }>("/api/me");

  const initials = (() => {
    const f = meData?.user?.firstName?.trim() ?? "";
    const l = meData?.user?.lastName?.trim() ?? "";
    return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "U";
  })();

  const displayName = meData?.user
    ? `${meData.user.firstName} ${meData.user.lastName}`.trim()
    : "Loading…";
  const displayEmail = meData?.user?.email ?? "—";

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Even if the network call fails, clear local state and reload.
    }
    clearAuthed();
    toast.success("Signed out");
    setTimeout(() => window.location.reload(), 200);
  }

  useEffect(() => {}, []);

  return (
    <header className="sticky top-0 z-30 flex h-[56px] sm:h-[60px] shrink-0 items-center gap-1.5 sm:gap-2 border-b border-border/50 bg-background/80 backdrop-blur-2xl px-3 sm:px-4 lg:px-6">
      {/* Mobile menu (hamburger) — mobile only */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 rounded-xl shrink-0" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <MobileNav />
        </SheetContent>
      </Sheet>

      {/* Search — opens Command Palette (desktop only) */}
      <button
        onClick={() => {
          const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
          window.dispatchEvent(ev);
        }}
        className="relative hidden md:flex flex-1 max-w-md items-center h-9 rounded-xl border border-border/60 bg-muted/40 px-3 text-[13px] text-muted-foreground transition hover:bg-muted/70 hover:border-border cursor-pointer"
      >
        <Search className="h-4 w-4 mr-2 shrink-0" />
        <span className="flex-1 text-left">{t("topbar.search")}</span>
        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded-md border bg-background px-1.5 font-mono text-[10px] text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>

      {/* Spacer — pushes actions to the right on mobile/tablet */}
      <div className="flex-1 md:hidden" />

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Send button — desktop/tablet only */}
        <Button
          variant="default"
          size="sm"
          className="hidden sm:inline-flex h-9 rounded-xl text-[13px] font-semibold shadow-premium-sm"
          onClick={() => setView("send")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("topbar.send")}
        </Button>

        {/* AI Assistant — tablet/desktop only (hidden on phones to save space) */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex h-9 w-9 rounded-xl"
          onClick={() => setAiOpen(true)}
          aria-label="AI Assistant"
        >
          <Sparkles className="h-[18px] w-[18px] text-primary" />
        </Button>

        {/* Language switcher — icon-only on mobile, full on desktop */}
        <button
          onClick={() => setLanguagePickerOpen(true)}
          aria-label={t("settings.language")}
          className="flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-1.5 text-[11px] sm:text-[12px] font-bold uppercase transition hover:bg-muted shrink-0"
          title={LANGUAGE_BY_CODE[language]?.nativeName ?? language}
        >
          <Languages className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="hidden sm:inline">{language}</span>
        </button>

        {/* Currency switcher — icon-only on mobile, full on desktop */}
        <button
          onClick={() => setCurrencyPickerOpen(true)}
          aria-label="Switch currency"
          className="flex items-center gap-1 rounded-lg px-1.5 sm:px-2 py-1.5 text-[12px] sm:text-[13px] font-semibold transition hover:bg-muted shrink-0"
        >
          <Coins className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="hidden sm:inline">{userCurrency}</span>
        </button>

        <ThemeToggle />

        {/* Notifications — always visible */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative shrink-0" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              {!!data?.unread && (
                <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                  {data.unread > 99 ? "99+" : data.unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <NotificationsPanel />
          </PopoverContent>
        </Popover>

        {/* Avatar dropdown — Settings, Identity, Sign out */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-0.5 sm:ml-1 flex items-center gap-1 rounded-full p-0.5 transition hover:ring-2 hover:ring-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shrink-0"
              aria-label={t("topbar.accountMenu")}
            >
              <Avatar className="h-8 w-8 ring-1 ring-border/60">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-[11px] font-bold">
                  {initials || "AO"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl">
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="text-sm font-semibold truncate">{displayName}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">{displayEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg"
              onSelect={() => setView("settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span>{t("topbar.settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-lg"
              onSelect={() => setView("kyc")}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              <span>{t("topbar.identity")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={cn("cursor-pointer text-destructive focus:text-destructive rounded-lg")}
              onSelect={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>{t("topbar.signOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
