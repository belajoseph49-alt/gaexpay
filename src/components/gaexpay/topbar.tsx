"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Menu, Plus, Sparkles, Globe, LogOut, Settings, ShieldCheck, ChevronDown } from "lucide-react";
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

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  kycStatus: string;
}

export function Topbar() {
  const { setAiOpen, setView, userCurrency, setCurrencyPickerOpen } = useApp();
  const { data } = useFetch<{ unread: number; notifications: any[] }>("/api/notifications");
  const { data: meData } = useFetch<{ user: CurrentUser }>("/api/me");

  // Compute initials for the avatar fallback
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
    // Hard reload — the page.tsx gate will then show the landing/auth modal.
    setTimeout(() => window.location.reload(), 200);
  }

  // Keyboard accessibility: keep the mobile menu button from being tab-able
  // twice in the same region. (No-op; just documents intent.)
  useEffect(() => {}, []);

  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-2 border-b border-border/50 bg-background/70 px-4 backdrop-blur-2xl lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <MobileNav />
        </SheetContent>
      </Sheet>

      {/* Search — opens Command Palette */}
      <button
        onClick={() => {
          const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
          window.dispatchEvent(ev);
        }}
        className="relative hidden md:flex flex-1 max-w-md items-center h-9 rounded-lg border border-border/50 bg-muted/40 px-3 text-[13px] text-muted-foreground transition hover:bg-muted/70 hover:border-border cursor-pointer"
      >
        <Search className="h-4 w-4 mr-2 shrink-0" />
        <span className="flex-1 text-left">Search transactions, people, merchants...</span>
        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 md:hidden" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="default"
          size="sm"
          className="hidden sm:inline-flex h-9 rounded-lg text-[13px]"
          onClick={() => setView("send")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Send
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setAiOpen(true)}
        >
          <Sparkles className="h-[18px] w-[18px] text-primary" />
        </Button>

        {/* Currency switcher */}
        <button
          onClick={() => setCurrencyPickerOpen(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition hover:bg-muted"
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          {userCurrency}
        </button>

        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg relative">
              <Bell className="h-[18px] w-[18px]" />
              {!!data?.unread && (
                <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
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
              className="ml-1 flex items-center gap-1 rounded-full p-0.5 transition hover:ring-2 hover:ring-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Account menu"
            >
              <Avatar className="h-8 w-8 ring-1 ring-border/50">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-[11px] font-bold">
                  {initials || "AO"}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="text-sm font-semibold truncate">{displayName}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">{displayEmail}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setView("settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setView("kyc")}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              <span>Identity (KYC / KYB)</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={cn("cursor-pointer text-destructive focus:text-destructive")}
              onSelect={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
