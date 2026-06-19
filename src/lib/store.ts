"use client";

import { create } from "zustand";

export type View =
  | "dashboard"
  | "wallets"
  | "wallet-detail"
  | "send"
  | "transactions"
  | "cards"
  | "pay"
  | "savings"
  | "budgets"
  | "scheduled"
  | "analytics"
  | "exchange"
  | "statement"
  | "achievements"
  | "merchant"
  | "merchant-qr"
  | "kyc"
  | "settings"
  | "support"
  | "admin"
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
}));
