"use client";

/**
 * src/hooks/use-translation.ts
 *
 * Lightweight i18n hook bound to the GaexPay Zustand store.
 *
 * Usage:
 *   const { t, language, isRTL } = useTranslation();
 *   <h1>{t("dashboard.goodMorning")}, {name} 👋</h1>
 *   <p>{t("dashboard.acrossWallets", { count: 3 })}</p>
 *
 * If the active language is missing a key, the English fallback is used.
 * If English is also missing, the raw key is returned (visible to devs).
 */

import { useLocale } from "next-intl";
import {
  translations,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from "@/lib/i18n/translations";

export function useTranslation() {
  const locale = useLocale() as LanguageCode;
  const language = locale;

  const dict = translations[language] || translations[DEFAULT_LANGUAGE];

  const t = (key: string, params?: Record<string, string | number> & { defaultValue?: string }): string => {
    let text = dict[key] ?? translations[DEFAULT_LANGUAGE][key];
    if (text === undefined) {
      text = params?.defaultValue ?? key;
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (k === "defaultValue") continue;
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  };

  return {
    t,
    language,
    isRTL: language === "ar",
  };
}
