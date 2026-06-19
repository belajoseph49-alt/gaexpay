"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  X,
  Share,
  PlusSquare,
  Monitor,
  Smartphone,
  Apple,
  Chrome,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// --- types -----------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  platforms: string[];
}

type Platform = "ios" | "android-chrome" | "desktop-chrome" | "other";
type PromptMode = "installable" | "ios-instructions" | null;

// --- helpers ---------------------------------------------------------------

const DISMISS_KEY = "gxp_install_dismissed_v1";
const INSTALLED_KEY = "gxp_install_installed_v1";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return "ios";

  const isAndroid = /Android/i.test(ua);
  if (isAndroid) {
    if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg/i.test(ua)) return "android-chrome";
    return "other"; // other Android browsers also use add-to-home-screen style
  }

  // Desktop
  if (/Chrome/.test(ua) && !/Edg|Edge/.test(ua)) return "desktop-chrome";
  if (/Edg|Edge/.test(ua)) return "desktop-chrome"; // Edge supports same API
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// --- component -------------------------------------------------------------

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [standalone, setStandalone] = useState(false);
  const [mode, setMode] = useState<PromptMode>(null);
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // 1) mount + initial detection
  useEffect(() => {
    setMounted(true);
    setPlatform(detectPlatform());
    setStandalone(isStandalone());

    // If already installed, remember that.
    if (isStandalone()) {
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
  }, []);

  // 2) listen for beforeinstallprompt (Chrome/Edge/Android)
  useEffect(() => {
    if (!mounted || standalone) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop the default mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("installable");
    };

    const onInstalled = () => {
      setMode(null);
      setDeferred(null);
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [mounted, standalone]);

  // 3) decide whether to show the banner after 3s
  useEffect(() => {
    if (!mounted || standalone) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => {
      // If browser already gave us a deferred prompt, prefer that.
      if (deferred) {
        setMode("installable");
        setOpen(true);
        return;
      }
      // iOS never fires beforeinstallprompt → show instructions instead.
      if (platform === "ios") {
        setMode("ios-instructions");
        setOpen(true);
        return;
      }
      // Desktop / Android Chrome without a deferred event yet — still nudge the
      // user (browser menu install) but only after the timeout.
      if (platform === "desktop-chrome" || platform === "android-chrome") {
        setMode("installable");
        setOpen(true);
        return;
      }
      // Other browsers (Firefox, Safari desktop, etc.) — show generic instructions.
      setMode("ios-instructions");
      setOpen(true);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [mounted, standalone, platform, deferred]);

  // 4) actions
  const handleInstallClick = useCallback(async () => {
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") {
          setMode(null);
          setOpen(false);
        }
      } catch {
        /* user dismissed */
      } finally {
        setInstalling(false);
        setDeferred(null);
      }
      return;
    }
    // No deferred event (browser doesn't expose it, or user already dismissed
    // the native one) → fall back to instructions dialog.
    setMode("ios-instructions");
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpenInstructions = useCallback(() => {
    setMode("ios-instructions");
  }, []);

  if (!mounted || standalone) return null;

  const isIOS = platform === "ios";

  // --- banner copy ---------------------------------------------------------
  const platformLabel = isIOS
    ? "iPhone / iPad"
    : platform === "android-chrome"
    ? "Android"
    : platform === "desktop-chrome"
    ? "Desktop"
    : "This device";

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="install-banner"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3 sm:px-4 sm:pb-4 pointer-events-none"
            role="dialog"
            aria-labelledby="install-banner-title"
            aria-describedby="install-banner-desc"
          >
            <div
              className={cn(
                "pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 shadow-2xl backdrop-blur-xl",
                "bg-gradient-to-br from-emerald-950/95 via-emerald-900/95 to-slate-950/95",
              )}
            >
              {/* top accent strip */}
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

              <div className="flex items-start gap-3 p-4">
                {/* icon */}
                <div className="relative mt-0.5 shrink-0">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
                    <Download className="h-5 w-5 text-white" strokeWidth={2.4} />
                  </div>
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 ring-2 ring-emerald-950">
                    <Sparkles className="h-2.5 w-2.5 text-amber-950" />
                  </span>
                </div>

                {/* copy */}
                <div className="min-w-0 flex-1">
                  <h3
                    id="install-banner-title"
                    className="text-sm font-semibold text-white flex items-center gap-2"
                  >
                    Install GaexPay
                    <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      {platformLabel}
                    </span>
                  </h3>
                  <p
                    id="install-banner-desc"
                    className="mt-0.5 text-xs leading-relaxed text-emerald-100/80"
                  >
                    Add GaexPay to your {isIOS ? "Home Screen" : platform === "desktop-chrome" ? "desktop" : "device"} for a
                    faster, full-screen, offline-ready wallet experience.
                  </p>

                  {/* actions */}
                  <div className="mt-3 flex items-center gap-2">
                    {deferred ? (
                      <Button
                        size="sm"
                        onClick={handleInstallClick}
                        disabled={installing}
                        className="h-8 gap-1.5 bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {installing ? "Installing…" : "Install now"}
                      </Button>
                    ) : isIOS ? (
                      <Button
                        size="sm"
                        onClick={handleOpenInstructions}
                        className="h-8 gap-1.5 bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                      >
                        <PlusSquare className="h-3.5 w-3.5" />
                        Add to Home Screen
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleOpenInstructions}
                        className="h-8 gap-1.5 bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Show me how
                      </Button>
                    )}

                    <button
                      onClick={handleDismiss}
                      className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-emerald-100/70 transition hover:bg-white/5 hover:text-white"
                      aria-label="Dismiss install prompt"
                    >
                      <X className="h-3.5 w-3.5" />
                      Not now
                    </button>
                  </div>
                </div>
              </div>

              {/* feature strip */}
              <div className="flex items-center justify-around border-t border-white/5 bg-black/20 px-4 py-2 text-[10px] font-medium text-emerald-100/70">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Offline-ready
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> No app store
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Push notifications
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions dialog (iOS / unsupported browsers) */}
      <Dialog open={mode === "ios-instructions" && !open} onOpenChange={(o) => !o && handleDismiss()}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              {isIOS ? (
                <Apple className="h-6 w-6 text-white" />
              ) : platform === "desktop-chrome" ? (
                <Monitor className="h-6 w-6 text-white" />
              ) : platform === "android-chrome" ? (
                <Chrome className="h-6 w-6 text-white" />
              ) : (
                <Smartphone className="h-6 w-6 text-white" />
              )}
            </div>
            <DialogTitle className="text-lg">
              Install GaexPay on {platformLabel}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to add GaexPay to your {isIOS ? "Home Screen" : platform === "desktop-chrome" ? "desktop" : "device"}.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 pt-2 space-y-3">
            {isIOS ? (
              <>
                <InstructionStep
                  n={1}
                  icon={<Share className="h-4 w-4" />}
                  title="Tap the Share button"
                  description="It's the square with the arrow pointing up, located at the bottom or top of Safari."
                />
                <InstructionStep
                  n={2}
                  icon={<PlusSquare className="h-4 w-4" />}
                  title="Select “Add to Home Screen”"
                  description="Scroll the share sheet and tap “Add to Home Screen”."
                />
                <InstructionStep
                  n={3}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Tap “Add”"
                  description="GaexPay will appear on your Home Screen with its own icon — launch it like a native app."
                />
              </>
            ) : platform === "desktop-chrome" ? (
              <>
                <InstructionStep
                  n={1}
                  icon={<Chrome className="h-4 w-4" />}
                  title="Open the browser menu"
                  description="Click the ⋮ (Chrome) or ⋯ (Edge) icon in the top-right corner of the browser."
                />
                <InstructionStep
                  n={2}
                  icon={<Download className="h-4 w-4" />}
                  title="Choose “Install GaexPay”"
                  description="Select “Install GaexPay…” (Chrome) or “Apps → Install this site as an app” (Edge)."
                />
                <InstructionStep
                  n={3}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Confirm installation"
                  description="GaexPay will open in its own window and add a shortcut to your desktop/taskbar."
                />
              </>
            ) : (
              <>
                <InstructionStep
                  n={1}
                  icon={<Chrome className="h-4 w-4" />}
                  title="Open the browser menu"
                  description="Tap the ⋮ menu icon in the top-right corner of your browser."
                />
                <InstructionStep
                  n={2}
                  icon={<Download className="h-4 w-4" />}
                  title="Tap “Add to Home screen”"
                  description="Or “Install app” on newer Chrome versions."
                />
                <InstructionStep
                  n={3}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Confirm and launch"
                  description="Tap “Add” / “Install”. GaexPay will appear on your home screen with its own icon."
                />
              </>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>Installed apps run full-screen, support offline mode, and can receive push notifications.</span>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                Maybe later
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setMode(null);
                  setOpen(false);
                }}
                className="bg-emerald-500 text-white hover:bg-emerald-600"
              >
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InstructionStep({
  n,
  icon,
  title,
  description,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        {icon}
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
          {n}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
