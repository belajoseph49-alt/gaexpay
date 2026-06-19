"use client";

import { useApp } from "@/lib/store";
import { formatMoney as _formatMoney, formatCompact as _formatCompact, CURRENCY_SYMBOL } from "@/lib/gaexpay";

// NGN exchange rates (how many NGN per 1 unit of target currency)
const NGN_RATES: Record<string, number> = {
  NGN: 1, USD: 1540, EUR: 1660, GBP: 1950, GHS: 125, KES: 12,
  XAF: 2.55, XOF: 2.55, ZAR: 82, UGX: 0.42, TZS: 0.61, RWF: 1.28,
  ETB: 27.5, EGP: 32, MAD: 154, CNY: 213, AED: 419, INR: 18.5,
  BWP: 114, BIF: 0.48, AOA: 1.7, MZN: 24, ZMW: 59,
  DZD: 11.4, TND: 493, CAD: 1130, AUD: 1010, CHF: 1710,
  JPY: 9.8, SAR: 410, BRL: 276,
};

/**
 * Convert an amount from NGN to the user's preferred display currency.
 */
export function convertFromNGN(amountNGN: number, targetCurrency: string): number {
  const rate = NGN_RATES[targetCurrency];
  if (!rate || rate === 0) return amountNGN;
  return amountNGN / rate;
}

/**
 * Format money in the user's preferred currency.
 * Use this instead of formatMoney(amount, "NGN") everywhere.
 */
export function useFormatMoney() {
  const { userCurrency } = useApp();
  
  return {
    /** Format an NGN amount in the user's preferred currency */
    fmt: (amountNGN: number, fallbackCurrency?: string) => {
      const target = fallbackCurrency || userCurrency;
      if (target === "NGN") return _formatMoney(amountNGN, "NGN");
      const converted = convertFromNGN(amountNGN, target);
      return _formatMoney(converted, target);
    },
    /** Format money in its original currency (no conversion) */
    fmtRaw: (amount: number, currency: string) => _formatMoney(amount, currency),
    /** Compact format in user's currency */
    fmtCompact: (amountNGN: number) => {
      const target = userCurrency;
      if (target === "NGN") return _formatCompact(amountNGN, "NGN");
      const converted = convertFromNGN(amountNGN, target);
      return _formatCompact(converted, target);
    },
    /** Get the symbol for the user's currency */
    symbol: CURRENCY_SYMBOL[userCurrency] || "",
    /** The user's currency code */
    currency: userCurrency,
    /** Convert from NGN */
    convert: (amountNGN: number) => convertFromNGN(amountNGN, userCurrency),
  };
}
