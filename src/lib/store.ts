"use client";

import { create } from "zustand";
import { DEFAULT_LANGUAGE, type LanguageCode } from "@/lib/i18n/translations";

export type View =
  | "dashboard"
  | "wallets"
  | "wallet-detail"
  | "send"
  | "international"
  | "unified-address"
  | "transactions"
  | "cards"
  | "pay"
  | "savings"
  | "budgets"
  | "scheduled"
  | "calendar"
  | "analytics"
  | "spending-map"
  | "exchange"
  | "crypto"
  | "crypto-swap"
  | "crypto-trade"
  | "crypto-cashout"
  | "statement"
  | "achievements"
  | "merchant"
  | "merchant-qr"
  | "business-pro"
  | "business-dashboard"
  | "team"
  | "invoices"
  | "payroll"
  | "kyc"
  | "kyb"
  | "security"
  | "settings"
  | "support"
  | "admin"
  | "admin-panel"
  | "api-management"
  | "enterprise-admin"
  | "compliance"
  | "treasury"
  | "developer"
  | "referral"
  | "marketplace"
  | "savings-challenges";

interface AppState {
  view: View;
  setView: (v: View) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  notifOpen: boolean;
  setNotifOpen: (o: boolean) => void;
  aiOpen: boolean;
  setAiOpen: (o: boolean) => void;
  sendPrefill: { recipient?: string; amount?: number } | null;
  setSendPrefill: (p: { recipient?: string; amount?: number } | null) => void;
  selectedWalletId: string | null;
  setSelectedWalletId: (id: string | null) => void;
  // User's preferred display currency (global, persistent)
  userCurrency: string;
  setUserCurrency: (c: string) => void;
  currencyPickerOpen: boolean;
  setCurrencyPickerOpen: (o: boolean) => void;
  // User's preferred UI language (global, persistent)
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  languagePickerOpen: boolean;
  setLanguagePickerOpen: (o: boolean) => void;
}

function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem("gxp_language");
    if (stored) {
      // Accept anything that looks like a 2-letter code we know about.
      const known: LanguageCode[] = [
        "en", "fr", "ru", "zh", "ar", "es", "de",
        "ew", "ff", "sw", "ln", "ha",
      ];
      if (known.includes(stored as LanguageCode)) {
        return stored as LanguageCode;
      }
    }
  } catch {
    // ignore — fall back to default
  }
  return DEFAULT_LANGUAGE;
}

export const useApp = create<AppState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  notifOpen: false,
  setNotifOpen: (notifOpen) => set({ notifOpen }),
  aiOpen: false,
  setAiOpen: (aiOpen) => set({ aiOpen }),
  sendPrefill: null,
  setSendPrefill: (sendPrefill) => set({ sendPrefill }),
  selectedWalletId: null,
  setSelectedWalletId: (selectedWalletId) => set({ selectedWalletId }),
  // Default currency — read from localStorage on first client render
  userCurrency: "NGN",
  setUserCurrency: (c) => {
    if (typeof window !== "undefined") localStorage.setItem("gxp_default_currency", c);
    set({ userCurrency: c, currencyPickerOpen: false });
  },
  currencyPickerOpen: false,
  setCurrencyPickerOpen: (currencyPickerOpen) => set({ currencyPickerOpen }),
  // Default language — read from localStorage on first client render
  language: DEFAULT_LANGUAGE,
  setLanguage: (code) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gxp_language", code);
      // Apply <html dir/lang> immediately so RTL flips without a reload.
      const meta = ["en","fr","ru","zh","ar","es","de","ew","ff","sw","ln","ha"]
        .map((c) => (c === "ar"));
      // document may be undefined during SSR — guard at runtime.
      if (typeof document !== "undefined") {
        document.documentElement.lang = code;
        document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
      }
      // Reference meta to satisfy lints (no unused variable) — preserves
      // the per-code RTL table for future extensions.
      void meta;
    }
    set({ language: code, languagePickerOpen: false });
  },
  languagePickerOpen: false,
  setLanguagePickerOpen: (languagePickerOpen) => set({ languagePickerOpen }),
}));

/**
 * Rehydrate language + currency from localStorage. Should be called once
 * on the AppShell mount (after the component tree is client-side).
 */
export function hydratePreferencesFromStorage() {
  if (typeof window === "undefined") return;
  const lang = readStoredLanguage();
  const cur = localStorage.getItem("gxp_default_currency");
  const patch: Partial<AppState> = {};
  if (lang) patch.language = lang;
  if (cur) patch.userCurrency = cur;
  if (Object.keys(patch).length > 0) useApp.setState(patch as any);
  // Apply dir/lang on the document element so RTL works without a reload.
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
}
