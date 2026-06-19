"use client";

import { Bell, Search, Menu, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { useApp } from "@/lib/store";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileNav } from "./mobile-nav";
import { NotificationsPanel } from "./notifications-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFetch } from "@/hooks/use-fetch";
import { timeAgo } from "@/lib/gaexpay";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { setSidebarOpen, setNotifOpen, setAiOpen, setView } = useApp();
  const { data } = useFetch<{ unread: number; notifications: any[] }>("/api/notifications");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <MobileNav />
        </SheetContent>
      </Sheet>

      {/* Search - opens Command Palette */}
      <button
        onClick={() => {
          const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
          window.dispatchEvent(ev);
        }}
        className="relative hidden md:flex flex-1 max-w-md items-center h-9 rounded-md border border-transparent bg-muted/50 px-3 text-sm text-muted-foreground transition hover:bg-muted cursor-pointer"
      >
        <Search className="h-4 w-4 mr-2 shrink-0" />
        <span className="flex-1 text-left">Search transactions, people, merchants...</span>
        <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 md:hidden" />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="default"
          size="sm"
          className="hidden sm:inline-flex h-9 rounded-full"
          onClick={() => setView("send")}
        >
          <Plus className="h-4 w-4 mr-1" /> Send
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => setAiOpen(true)}
        >
          <Sparkles className="h-[18px] w-[18px] text-primary" />
        </Button>

        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
              <Bell className="h-[18px] w-[18px]" />
              {!!data?.unread && (
                <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {data.unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <NotificationsPanel />
          </PopoverContent>
        </Popover>

        <button
          onClick={() => setView("settings")}
          className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-muted transition"
        >
          <Avatar className="h-9 w-9 ring-2 ring-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
              AO
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
