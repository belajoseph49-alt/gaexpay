"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Globe, X } from "lucide-react";
import { CURRENCY_OPTIONS } from "@/hooks/use-user-currency";
import { cn } from "@/lib/utils";

export function CurrencyPicker({
  open,
  onSelect,
  current,
}: {
  open: boolean;
  onSelect: (code: string) => void;
  current?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onSelect(current || "NGN")}
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
              "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[min(440px,calc(100vw-2rem))]",
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
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold leading-tight">Choose Your Currency</h2>
                  <p className="text-[11px] text-primary-foreground/75 leading-tight mt-0.5">
                    Sélectionnez votre devise par défaut
                  </p>
                </div>
                <button
                  onClick={() => onSelect(current || "NGN")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 hover:bg-white/25 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Currency grid — scrollable, fills available space */}
            <div
              className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto overscroll-contain p-3"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="grid grid-cols-2 gap-2">
                {CURRENCY_OPTIONS.map((c) => {
                  const isActive = current === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => onSelect(c.code)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition",
                        isActive
                          ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <span className="text-xl shrink-0">{c.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight">{c.code}</p>
                        <p className="text-[9px] text-muted-foreground truncate leading-tight">{c.name}</p>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">{c.symbol}</span>
                      {isActive && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <p className="text-center text-[10px] text-muted-foreground leading-tight">
                Cette devise sera utilisée pour afficher vos soldes et montants
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
