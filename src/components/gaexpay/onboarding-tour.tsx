"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, ChevronRight, ChevronLeft, Check, Wallet, SendHorizontal,
  QrCode, BarChart3, ShieldCheck, PiggyBank,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const TOUR_STEPS = [
  {
    icon: Wallet,
    title: "Welcome to GaexPay!",
    description: "Your borderless digital wallet for Africa and the world. Let's take a quick tour of the key features.",
    color: "from-violet-500 to-purple-600",
    action: null as any,
  },
  {
    icon: SendHorizontal,
    title: "Send & Receive Money",
    description: "Transfer money instantly to anyone — via bank, mobile money (MTN, Orange, Airtel), or GaexPay wallet. It's free between GaexPay users!",
    color: "from-sky-500 to-blue-600",
    action: "send" as any,
  },
  {
    icon: QrCode,
    title: "Pay & Bills",
    description: "Scan QR codes to pay merchants, buy airtime, pay bills (electricity, water, TV, internet), and shop — all from one app.",
    color: "from-fuchsia-500 to-pink-600",
    action: "pay" as any,
  },
  {
    icon: PiggyBank,
    title: "Savings & Budgets",
    description: "Set savings goals with auto-save, create monthly budgets, and track your spending. Watch your financial health score improve!",
    color: "from-violet-500 to-purple-600",
    action: "savings" as any,
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Get AI-powered financial insights, track your health score over time, and see where your money goes with the spending map.",
    color: "from-amber-500 to-orange-600",
    action: "analytics" as any,
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description: "Your money is protected with end-to-end encryption, biometric login, 2FA, and AI fraud detection. You're in safe hands.",
    color: "from-rose-500 to-red-600",
    action: "kyc" as any,
  },
];

export function OnboardingTour() {
  const { setView } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Show onboarding if first time (check localStorage)
    if (typeof window !== "undefined") {
      const seen = localStorage.getItem("gxp_onboarded");
      if (!seen && sessionStorage.getItem("gxp_entered")) {
        const timer = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const close = () => {
    setOpen(false);
    localStorage.setItem("gxp_onboarded", "1");
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      close();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const goToFeature = () => {
    const current = TOUR_STEPS[step];
    if (current.action) {
      close();
      setView(current.action);
    }
  };

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />

          {/* Tour card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed left-1/2 top-1/2 z-[201] w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative overflow-hidden rounded-2xl border bg-card shadow-2xl">
              {/* Progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Close button */}
              <button
                onClick={close}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-muted/50 text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <div className="px-6 pt-10 pb-4 text-center">
                <motion.div
                  key={step}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className={cn(
                    "mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                    current.color,
                  )}
                >
                  <Icon className="h-10 w-10" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 text-center">
                <h2 className="text-xl font-bold">{current.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>

                {/* Step indicator */}
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={close} className="text-xs">
                    Skip tour
                  </Button>
                  <div className="flex gap-2">
                    {step > 0 && (
                      <Button variant="outline" size="sm" onClick={prev}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                      </Button>
                    )}
                    {current.action && (
                      <Button variant="outline" size="sm" onClick={goToFeature}>
                        Try it <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                    <Button size="sm" onClick={next}>
                      {isLast ? (
                        <><Check className="h-4 w-4 mr-1" /> Get Started</>
                      ) : (
                        <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
