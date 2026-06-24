"use client";

/**
 * src/components/gaexpay/language-picker.tsx
 *
 * Premium language selector — same shape as the CurrencyPicker:
 *   - Bottom-sheet on mobile, centered modal on desktop.
 *   - Search bar that filters by English name, native name, or code.
 *   - Selected state with primary ring + check mark.
 *   - Flags the Arabic entry as RTL.
 *   - On select: setLanguage(code) → updates Zustand + <html dir/lang> +
 *     PATCH /api/settings + toast.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Globe, X, Search, Languages } from "lucide-react";
import { LANGUAGES, LANGUAGE_BY_CODE, type LanguageCode } from "@/lib/i18n/translations";
import { useApp } from "@/lib/store";
import { useTranslation } from "@/hooks/use-translation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function LanguagePicker() {
  const { language, setLanguage, languagePickerOpen, setLanguagePickerOpen } = useApp();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return LANGUAGES;
    const q = query.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [query]);

  async function handleSelect(code: LanguageCode) {
    const meta = LANGUAGE_BY_CODE[code];
    // 1. Optimistically update local state — instant switch.
    setLanguage(code);
    setLanguagePickerOpen(false);
    setQuery("");
    toast.success(t("misc.languageSwitched", { name: meta.nativeName }));
    // 2. Persist server-side (best-effort — never blocks UI).
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language: code }),
      });
    } catch {
      // Network errors are non-fatal; the preference is already applied
      // locally and will sync the next time the user opens the app.
    }
  }

  if (!languagePickerOpen) return null;

  return (
    <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLanguagePickerOpen(false)}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom sheet on mobile, centered modal on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className={cn(
              "fixed z-[201] w-full",
              "bottom-0 left-0 right-0 rounded-t-3xl border bg-card shadow-2xl",
              "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[min(480px,calc(100vw-2rem))]",
            )}
          >
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/70 px-5 py-4 text-primary-foreground sm:rounded-t-2xl">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <div className="relative flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur">
                  <Languages className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold leading-tight">
                    {t("settings.chooseLanguage")}
                  </h2>
                  <p className="text-[11px] text-primary-foreground/75 leading-tight mt-0.5">
                    {t("settings.languageDescription")}
                  </p>
                </div>
                <button
                  onClick={() => setLanguagePickerOpen(false)}
                  aria-label={t("common.close")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 hover:bg-white/25 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="border-b bg-card/50 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="w-full rounded-lg border border-border/60 bg-background/80 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  autoFocus
                />
              </div>
            </div>

            {/* Language list — scrollable */}
            <div
              className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto overscroll-contain p-2"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="space-y-1">
                {filtered.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {query} — no language found
                  </div>
                )}
                {filtered.map((l) => {
                  const isActive = language === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => handleSelect(l.code)}
                      dir={l.rtl ? "rtl" : "ltr"}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        isActive
                          ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                          : "border-transparent hover:bg-muted/50",
                      )}
                    >
                      <span className="text-2xl shrink-0 leading-none">{l.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">
                          {l.nativeName}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight truncate">
                          {l.name} · {l.code.toUpperCase()}
                          {l.rtl && " · RTL"}
                        </p>
                      </div>
                      {isActive ? (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-muted-foreground/60 shrink-0">
                          {l.code}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <p className="text-center text-[10px] text-muted-foreground leading-tight flex items-center justify-center gap-1">
                <Globe className="h-3 w-3" />
                12 languages · العربية RTL
              </p>
            </div>
          </motion.div>
    </>
  );
}
