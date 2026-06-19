"use client";

import { Bell, Search, Menu, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { useApp } from "@/lib/store";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MobileNav } from "./mobile-nav";
import { NotificationsPanel } from "./notifications-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { setAiOpen, setView } = useApp();
  const { data } = useFetch<{ unread: number; notifications: any[] }>("/api/notifications");

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

        <button
          onClick={() => setView("settings")}
          className="ml-1 rounded-full p-0.5 hover:ring-2 hover:ring-primary/20 transition"
        >
          <Avatar className="h-8 w-8 ring-1 ring-border/50">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-[11px] font-bold">
              AO
            </AvatarFallback>
          </Avatar>
        </button>
      </div>
    </header>
  );
}
