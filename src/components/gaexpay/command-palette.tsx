"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, Wallet, SendHorizontal, ArrowLeftRight, CreditCard,
  QrCode, BarChart3, ShieldCheck, Settings, LifeBuoy, Users, Gift, PiggyBank,
  Wallet2, CalendarClock, FileText, Store, ArrowLeftRight as Exchange,
  CornerDownLeft, ArrowUp, ArrowDown, Loader2, User, Store as StoreIcon, Receipt, Trophy, Calendar, MapPin,
} from "lucide-react";
import { useApp, type View } from "@/lib/store";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, timeAgo } from "@/lib/gaexpay";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: View | string;
  label: string;
  description: string;
  icon: any;
  keywords: string[];
  section: string;
  action?: () => void;
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: "dashboard", label: "Dashboard", description: "Go to dashboard overview", icon: LayoutDashboard, keywords: ["home", "overview", "main"], section: "Navigate" },
  { id: "wallets", label: "Wallets", description: "View multi-currency wallets", icon: Wallet, keywords: ["balance", "money", "currency"], section: "Navigate" },
  { id: "send", label: "Send & Receive", description: "Transfer money", icon: SendHorizontal, keywords: ["transfer", "pay", "request"], section: "Navigate" },
  { id: "transactions", label: "Transactions", description: "View transaction history", icon: ArrowLeftRight, keywords: ["history", "activity", "payments"], section: "Navigate" },
  { id: "cards", label: "Cards", description: "Manage virtual & physical cards", icon: CreditCard, keywords: ["visa", "mastercard", "debit"], section: "Navigate" },
  { id: "pay", label: "Pay & Bills", description: "QR payments, bills, airtime", icon: QrCode, keywords: ["scan", "merchant", "electricity", "airtime"], section: "Navigate" },
  { id: "savings", label: "Savings Goals", description: "Track savings progress", icon: PiggyBank, keywords: ["save", "goal", "target"], section: "Navigate" },
  { id: "budgets", label: "Budgets", description: "Manage spending limits", icon: Wallet2, keywords: ["limit", "spending", "budget"], section: "Navigate" },
  { id: "scheduled", label: "Scheduled Transfers", description: "Recurring payments", icon: CalendarClock, keywords: ["recurring", "auto", "repeat"], section: "Navigate" },
  { id: "exchange", label: "Currency Exchange", description: "Convert between wallets", icon: Exchange, keywords: ["convert", "fx", "rate"], section: "Navigate" },
  { id: "analytics", label: "Analytics", description: "Spending insights & charts", icon: BarChart3, keywords: ["charts", "stats", "insights"], section: "Navigate" },
  { id: "statement", label: "Statements", description: "Account statements", icon: FileText, keywords: ["report", "summary", "pdf"], section: "Navigate" },
  { id: "merchant", label: "Merchant Dashboard", description: "Business analytics", icon: Store, keywords: ["business", "sales", "qr"], section: "Navigate" },
  { id: "kyc", label: "Identity (KYC)", description: "Verify your identity", icon: ShieldCheck, keywords: ["verify", "documents", "tier"], section: "Navigate" },
  { id: "referral", label: "Referral & Rewards", description: "Invite friends, earn rewards", icon: Gift, keywords: ["invite", "bonus", "points"], section: "Navigate" },
  { id: "settings", label: "Settings", description: "Account & security settings", icon: Settings, keywords: ["profile", "security", "preferences"], section: "Navigate" },
  { id: "support", label: "Support", description: "Get help & contact us", icon: LifeBuoy, keywords: ["help", "faq", "chat"], section: "Navigate" },
  { id: "admin", label: "Admin Console", description: "Platform administration", icon: Users, keywords: ["manage", "users", "fraud"], section: "Navigate" },
  { id: "achievements", label: "Achievements", description: "View your badges & progress", icon: Trophy, keywords: ["badges", "rewards", "level", "gamification"], section: "Navigate" },
  { id: "calendar", label: "Payment Calendar", description: "Monthly calendar of transfers", icon: Calendar, keywords: ["schedule", "monthly", "calendar", "dates"], section: "Navigate" },
  { id: "spending-map", label: "Spending Map", description: "Spending by location & merchant", icon: MapPin, keywords: ["geo", "location", "merchant", "map"], section: "Navigate" },
];

const QUICK_ACTIONS: CommandItem[] = [
  { id: "qa-send", label: "Send Money", description: "Quickly send to a contact", icon: SendHorizontal, keywords: ["transfer", "pay"], section: "Quick Actions", action: () => {} },
  { id: "qa-qr", label: "Scan QR Code", description: "Pay via QR scan", icon: QrCode, keywords: ["scan", "pay"], section: "Quick Actions", action: () => {} },
  { id: "qa-statement", label: "Download Statement", description: "Export monthly statement", icon: FileText, keywords: ["export", "pdf", "csv"], section: "Quick Actions", action: () => {} },
  { id: "qa-exchange", label: "Exchange Currency", description: "Convert between wallets", icon: Exchange, keywords: ["convert", "fx"], section: "Quick Actions", action: () => {} },
];

export function CommandPalette() {
  const { setView, setAiOpen } = useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
      setActiveIndex(0);
      setSearchResults(null);
    }
  }, [open]);

  // Debounced API search
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const allItems = [...COMMANDS, ...QUICK_ACTIONS];

  const filtered = search
    ? allItems.filter((item) => {
        const q = search.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      })
    : allItems;

  // Build search result items
  const searchItems: CommandItem[] = [];
  if (searchResults) {
    (searchResults.transactions || []).forEach((t: any) => {
      searchItems.push({
        id: `tx-${t.id}`,
        label: t.counterpartyName || t.description,
        description: `${formatMoney(t.amount, t.currency)} · ${timeAgo(t.createdAt)} · ${t.reference}`,
        icon: Receipt,
        keywords: [],
        section: "Transactions",
      });
    });
    (searchResults.beneficiaries || []).forEach((b: any) => {
      searchItems.push({
        id: `ben-${b.id}`,
        label: b.name,
        description: `${b.account} · ${b.bank || b.type}`,
        icon: User,
        keywords: [],
        section: "Beneficiaries",
      });
    });
    (searchResults.merchants || []).forEach((m: any) => {
      searchItems.push({
        id: `mer-${m.id}`,
        label: m.name,
        description: `${m.category} · ★ ${m.rating} · ${m.qrCode}`,
        icon: StoreIcon,
        keywords: [],
        section: "Merchants",
      });
    });
    (searchResults.people || []).forEach((p: any) => {
      searchItems.push({
        id: `per-${p.id}`,
        label: `${p.firstName} ${p.lastName}`,
        description: p.email,
        icon: User,
        keywords: [],
        section: "People",
      });
    });
  }

  const combinedFiltered = [...filtered, ...searchItems];

  // Group by section
  const grouped = combinedFiltered.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const flatFiltered = Object.values(grouped).flat();

  const execute = (item: CommandItem) => {
    setOpen(false);
    if (item.action) {
      item.action();
    }
    if (COMMANDS.includes(item)) {
      setView(item.id as View);
    } else if (item.id === "qa-send") setView("send");
    else if (item.id === "qa-qr") setView("pay");
    else if (item.id === "qa-statement") setView("statement");
    else if (item.id === "qa-exchange") setView("exchange");
    else if (item.id.startsWith("tx-")) setView("transactions");
    else if (item.id.startsWith("ben-")) setView("send");
    else if (item.id.startsWith("mer-")) setView("pay");
    else if (item.id.startsWith("per-")) setView("send");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatFiltered[activeIndex]) execute(flatFiltered[activeIndex]);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden top-[15%] translate-y-0" style={{ top: "15%" }} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search views, transactions, people, merchants..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="py-12 text-center">
              {searching ? (
                <>
                  <Loader2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </>
              ) : (
                <>
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No results for "{search}"</p>
                </>
              )}
            </div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-2">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section}
                </p>
                {items.map((item) => {
                  runningIndex++;
                  const idx = runningIndex;
                  const Icon = item.icon;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => execute(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className={cn("text-xs truncate", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {item.description}
                        </p>
                      </div>
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-primary-foreground/70 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 w-4 items-center justify-center rounded border bg-muted font-mono text-[9px]">
                <ArrowUp className="h-2 w-2" />
              </kbd>
              <kbd className="inline-flex h-4 w-4 items-center justify-center rounded border bg-muted font-mono text-[9px]">
                <ArrowDown className="h-2 w-2" />
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="inline-flex h-4 items-center justify-center rounded border bg-muted font-mono text-[9px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="hidden sm:inline">Press Ctrl+K anywhere</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
