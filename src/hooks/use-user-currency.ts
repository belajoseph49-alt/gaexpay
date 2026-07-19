"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "gxp_default_currency";

// Currency options with flags and symbols
const CURRENCY_OPTIONS = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  { code: "XAF", name: "Franc CFA (Central)", symbol: "FCFA", flag: "🇨🇲" },
  { code: "XOF", name: "Franc CFA (West)", symbol: "CFA", flag: "🇨🇮" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", flag: "🇬🇭" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", flag: "🇺🇬" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", flag: "🇹🇿" },
  { code: "RWF", name: "Rwandan Franc", symbol: "RF", flag: "🇷🇼" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", flag: "🇪🇹" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", flag: "🇪🇬" },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH", flag: "🇲🇦" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
];

/**
 * Hook to get/set the user's preferred default currency.
 * Stored in localStorage so it persists across sessions.
 * Falls back to NGN only if user hasn't chosen yet.
 */
export function useUserCurrency() {
  const [currency, setCurrencyState] = useState<string>("NGN");
  const [hasChosen, setHasChosen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCurrencyState(stored);
        setHasChosen(true);
      } else {
        // Show picker if user hasn't chosen yet
        setShowPicker(true);
      }
    }
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    setHasChosen(true);
    setShowPicker(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  return {
    currency,
    hasChosen,
    showPicker,
    setShowPicker,
    setCurrency,
    options: CURRENCY_OPTIONS,
  };
}

export { CURRENCY_OPTIONS };
