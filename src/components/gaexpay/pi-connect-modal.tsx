"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  Check,
  ArrowRight,
  Sparkles,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PiConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: (username: string, balance: number) => void;
}

type Step = "intro" | "username" | "connecting" | "success";

const PI_STORAGE_KEY = "gxp_pi_connected";
const PI_BALANCE_KEY = "gxp_pi_balance";

function PiMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <span
      className={`inline-grid place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 font-bold text-white ${className}`}
      aria-hidden="true"
    >
      π
    </span>
  );
}

export function PiConnectModal({ open, onOpenChange, onConnected }: PiConnectModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [alreadyConnected, setAlreadyConnected] = useState<string | null>(null);

  // On open, check if already connected
  useEffect(() => {
    if (open) {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem(PI_STORAGE_KEY)
        : null;
      const savedBal = typeof window !== "undefined"
        ? window.localStorage.getItem(PI_BALANCE_KEY)
        : null;
      if (saved) {
        setAlreadyConnected(saved);
        setBalance(savedBal ? Number(savedBal) : 0);
        setStep("success");
      } else {
        setStep("intro");
        setUsername("");
        setError(null);
        setBalance(0);
        setAlreadyConnected(null);
      }
    }
  }, [open]);

  const handleAuthorize = () => {
    setStep("username");
    setError(null);
  };

  const handleConnect = useCallback(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter your Pi Network username.");
      return;
    }
    if (trimmed.length < 3) {
      setError("Pi username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setError("Only letters, numbers, dots, dashes and underscores are allowed.");
      return;
    }
    setError(null);
    setStep("connecting");
    // Simulate Pi Network handshake (~2s)
    const bal = Math.floor(100 + Math.random() * 1900);
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(PI_STORAGE_KEY, trimmed);
        window.localStorage.setItem(PI_BALANCE_KEY, String(bal));
      } catch {
        // ignore storage errors (private mode etc.)
      }
      setBalance(bal);
      setStep("success");
      onConnected?.(trimmed, bal);
    }, 2000);
  }, [username, onConnected]);

  const handleDone = () => {
    onOpenChange(false);
  };

  const handleDisconnect = () => {
    try {
      window.localStorage.removeItem(PI_STORAGE_KEY);
      window.localStorage.removeItem(PI_BALANCE_KEY);
    } catch {
      // ignore
    }
    setAlreadyConnected(null);
    setBalance(0);
    setUsername("");
    setStep("intro");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {/* Pi branded header */}
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 text-white">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <PiMark className="h-11 w-11 ring-2 ring-white/30" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                Pi Network
              </p>
              <DialogTitle className="text-lg font-bold text-white">
                Connect your Pi account
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* STEP 1 — INTRO */}
            {step === "intro" && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DialogDescription className="text-sm text-muted-foreground">
                  Link your Pi Network account to GaexPay and unlock Pi Coin
                  payments, transfers, trading and cash-out — fully integrated
                  with your existing wallet.
                </DialogDescription>

                <ul className="mt-4 space-y-2.5">
                  {[
                    "Securely import your Pi balance into GaexPay",
                    "Pay, send and receive Pi Coin like any other currency",
                    "Swap Pi for 18+ fiat or 13+ cryptocurrencies",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-600">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="text-foreground/90">{line}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  <p className="text-xs text-muted-foreground">
                    GaexPay never stores your Pi password. We use a read-only
                    OAuth-style link that you can revoke at any time.
                  </p>
                </div>

                <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAuthorize}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                  >
                    Authorize <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </DialogFooter>
              </motion.div>
            )}

            {/* STEP 2 — USERNAME */}
            {(step === "username" || step === "connecting") && (
              <motion.div
                key="username"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <DialogHeader>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Enter the Pi Network username you want to link. This is the
                    handle shown in your Pi app profile.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="pi-username" className="text-xs font-medium">
                    Pi Network username
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">@</span>
                    <Input
                      id="pi-username"
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="your_pi_handle"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && step !== "connecting") {
                          e.preventDefault();
                          handleConnect();
                        }
                      }}
                      disabled={step === "connecting"}
                      aria-invalid={!!error}
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-destructive" role="alert">
                      {error}
                    </p>
                  )}
                </div>

                <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("intro")}
                    disabled={step === "connecting"}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConnect}
                    disabled={step === "connecting" || !username.trim()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                  >
                    {step === "connecting" ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        Connect Pi <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}

            {/* STEP 3 — SUCCESS */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 18 }}
                  className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-500/30"
                >
                  <Check className="h-8 w-8" strokeWidth={3} />
                </motion.div>

                <DialogTitle className="mt-4 text-lg font-bold">
                  Pi Network connected!
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Your Pi account
                  {alreadyConnected || username ? (
                    <>
                      {" "}
                      <span className="font-semibold text-foreground">
                        @{alreadyConnected || username}
                      </span>{" "}
                      is linked to GaexPay.
                    </>
                  ) : null}
                </DialogDescription>

                {/* Balance card */}
                <div className="mt-5 overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PiMark className="h-7 w-7" />
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">Pi Balance</p>
                        <p className="text-base font-bold tabular-nums">
                          π {balance.toLocaleString("en-US")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">≈ USD</p>
                      <p className="text-sm font-semibold tabular-nums">
                        ${(balance * 47.35).toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 font-medium text-violet-600">
                    <Sparkles className="h-3 w-3" /> Ready to use
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <Wallet className="h-3 w-3" /> Pay · Send · Swap · Cash out
                  </span>
                </div>

                <DialogFooter className="mt-6 flex-row gap-2 sm:justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDone}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                  >
                    Done
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
