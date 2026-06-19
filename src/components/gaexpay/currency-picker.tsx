"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed left-1/2 top-1/2 z-[201] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
              {/* Header */}
              <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-6 text-center text-primary-foreground">
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
                <div className="relative">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                    <Globe className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-bold">Choose Your Currency</h2>
                  <p className="mt-1 text-sm text-primary-foreground/80">
                    Sélectionnez votre devise par défaut. Vous pourrez la changer dans les paramètres.
                  </p>
                </div>
              </div>

              {/* Currency grid */}
              <div className="max-h-[400px] overflow-y-auto overscroll-contain p-4">
                <div className="grid grid-cols-2 gap-2">
                  {CURRENCY_OPTIONS.map((c) => {
                    const isActive = current === c.code;
                    return (
                      <button
                        key={c.code}
                        onClick={() => onSelect(c.code)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border p-3 text-left transition",
                          isActive
                            ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <span className="text-2xl shrink-0">{c.flag}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{c.code}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{c.name}</p>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground shrink-0">{c.symbol}</span>
                        {isActive && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-4">
                <p className="text-center text-[11px] text-muted-foreground">
                  Cette devise sera utilisée pour afficher vos soldes et montants
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
