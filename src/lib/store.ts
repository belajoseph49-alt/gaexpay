"use client";

import { create } from "zustand";

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
  | "referral";

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
}));
