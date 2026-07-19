"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  QrCode, ScanLine, Receipt, Smartphone, Zap, Tv, Wifi, Droplet, GraduationCap,
  Trophy, Landmark, Store, ChevronRight, Check, Loader2, X, Flame, Phone,
  FileWarning, ScrollText, Building2, BookOpen, School, FileText, Home,
  Fuel, Car, Bus, Film, Gamepad2, HeartPulse, Dumbbell, Dice5, Gift, Key,
  Package, ShieldCheck, ArrowLeft, Camera, RefreshCw, Printer, Hash, Calendar,
  Wallet, Database, AlertCircle, Globe2, Signal, Clock, ArrowDownRight, ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFetch } from "@/hooks/use-fetch";
import { BILL_CATEGORIES, formatMoney, timeAgo } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import { getSupportedPaymentMethods, getAvailableMobileMoneyProviders } from "@/lib/gaexpay";
import { QrCode as QrCodeImage } from "@/components/gaexpay/qr-code";

const BILLER_ICONS: Record<string, any> = {
  electricity: Zap, water: Droplet, internet: Wifi, tv: Tv,
  education: GraduationCap, betting: Trophy, government: Landmark,
  gas: Flame, phone: Phone, taxes: FileWarning, customs: Package,
  fines: FileWarning, permits: ScrollText, social: Building2,
  university: BookOpen, college: BookOpen, school: School, exams: FileText,
  loan: Building2, insurance: ShieldCheck, mortgage: Home,
  fuel: Fuel, toll: Car, transport: Bus,
  streaming: Film, gaming: Gamepad2,
  health: HeartPulse, gym: Dumbbell,
  donations: Gift, rent: Key, other: Receipt,
};

const NETWORKS = [
  { id: "mtn", name: "MTN", color: "#FFCC00" },
  { id: "airtel", name: "Airtel", color: "#E40000" },
  { id: "glo", name: "Glo", color: "#43B02A" },
  { id: "9mobile", name: "9mobile", color: "#0066B3" },
];

const DATA_PLANS = [
  { id: "daily_100", label: "100 MB · 1 Day", amount: 100 },
  { id: "daily_200", label: "350 MB · 1 Day", amount: 200 },
  { id: "weekly_500", label: "1.5 GB · 7 Days", amount: 500 },
  { id: "weekly_1000", label: "3.5 GB · 7 Days", amount: 1000 },
  { id: "monthly_2000", label: "5 GB · 30 Days", amount: 2000 },
  { id: "monthly_3500", label: "10 GB · 30 Days", amount: 3500 },
  { id: "monthly_5000", label: "20 GB · 30 Days", amount: 5000 },
  { id: "monthly_10000", label: "50 GB · 30 Days", amount: 10000 },
];

// Quick actions — emerald-forward tonal palette (NO blue, NO indigo)
const QUICK_ACTIONS = [
  { id: "airtime", label: "Airtime", icon: Smartphone, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { id: "airtime", label: "Data", icon: Database, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  { id: "bills", label: "Electricity", icon: Zap, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { id: "bills", label: "TV", icon: Tv, tone: "bg-rose-500/15 text-rose-500" },
  { id: "bills", label: "Water", icon: Droplet, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  { id: "bills", label: "Internet", icon: Wifi, tone: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400" },
];

export function PayView() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("qr");
  const { data: meData } = useFetch<any>("/api/auth/me");
  
  const country = meData?.user?.country;
  const methods = getSupportedPaymentMethods(country);
  const showMobileFeatures = methods.includes("momo");

  // Filter actions based on region
  const filteredActions = QUICK_ACTIONS.filter(a => {
    if ((a.id === "airtime" || a.id === "data") && !showMobileFeatures) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("pay.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("pay.subtitle")}</p>
      </div>

      {/* QR scan CTA hero */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setTab("qr")}
        className="group block w-full text-left"
      >
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white shadow-premium-lg card-lift">
          <div className="absolute inset-0 opacity-30 mesh-bg" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-4 top-8 h-20 w-20 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="grid h-14 w-14 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30">
                <QrCode className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold">{t("pay.scanPay")}</h3>
                <p className="text-xs sm:text-sm text-white/80 truncate">
                  Pay any GaexPay merchant instantly by scanning their QR code
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-3 py-1.5 text-xs font-medium ring-1 ring-white/30 group-hover:translate-x-1 transition">
              <ScanLine className="h-3.5 w-3.5" /> {t("common.open", { defaultValue: "Open" })}
            </div>
          </div>
        </Card>
      </motion.button>

      {/* Quick actions grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:grid-cols-6">
        {filteredActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={`${a.label}-${i}`}
              onClick={() => setTab(a.id)}
              className="group flex flex-col items-center gap-2"
            >
              <div className={cn(
                "grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl border border-border/60 card-lift shadow-premium-sm transition group-hover:scale-105",
                a.tone,
              )}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[11px] sm:text-xs font-medium">{t(`pay.quickActions.${a.label}`, { defaultValue: a.label })}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="qr" className="rounded-xl py-2"><QrCode className="h-4 w-4 mr-1.5" /> {t("pay.scanPay")}</TabsTrigger>
          <TabsTrigger value="merchants" className="rounded-xl py-2"><Store className="h-4 w-4 mr-1.5" /> {t("pay.merchants")}</TabsTrigger>
          <TabsTrigger value="bills" className="rounded-xl py-2"><Receipt className="h-4 w-4 mr-1.5" /> {t("pay.bills")}</TabsTrigger>
          {showMobileFeatures && <TabsTrigger value="airtime" className="rounded-xl py-2"><Smartphone className="h-4 w-4 mr-1.5" /> {t("pay.airtime")}</TabsTrigger>}
          <TabsTrigger value="esim" className="rounded-xl py-2"><Wifi className="h-4 w-4 mr-1.5" /> eSim</TabsTrigger>
        </TabsList>
        <TabsContent value="qr" className="mt-4"><QrPay /></TabsContent>
        <TabsContent value="merchants" className="mt-4"><MerchantsPay /></TabsContent>
        <TabsContent value="bills" className="mt-4"><BillsPay /></TabsContent>
        {showMobileFeatures && <TabsContent value="airtime" className="mt-4"><AirtimePay country={country} /></TabsContent>}
        <TabsContent value="esim" className="mt-4"><ESimPay /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// QrPay — REAL camera-based QR scanner (BarcodeDetector) with
// graceful fallback to manual entry when the browser doesn't
// expose `BarcodeDetector` (e.g. Firefox / iOS Safari).
// ============================================================
function QrPay() {
  const { t } = useTranslation();
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop the camera + detector — called on unmount, on cancel, and on
  // successful detection so the stream is released back to the OS.
  const stopScan = useCallback(() => {
    setScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;
  }, []);

  // Look up a scanned (or manually entered) code against the merchant catalog.
  const handleQrResult = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      let merchantId = trimmed;
      let amountFromQr = "";
      // If it's a URL with payment params, peel them out so a printed
      // GaexPay QR (e.g. https://gaexpay.app/pay?merchant=GXP-MER-001&amount=1500)
      // auto-fills the amount.
      if (trimmed.startsWith("http")) {
        try {
          const url = new URL(trimmed);
          merchantId =
            url.searchParams.get("merchant") ||
            url.searchParams.get("id") ||
            url.searchParams.get("account") ||
            trimmed;
          amountFromQr = url.searchParams.get("amount") || "";
        } catch {
          /* fall through with merchantId = trimmed */
        }
      } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        // JSON payload (the format /api/merchant-qr emits).
        try {
          const parsed = JSON.parse(trimmed);
          merchantId =
            parsed.merchantId || parsed.qrCode || parsed.account || parsed.id || trimmed;
          amountFromQr = parsed.amount ? String(parsed.amount) : "";
        } catch {
          /* fall through */
        }
      }

      try {
        const res = await fetch(
          `/api/merchants/lookup?id=${encodeURIComponent(merchantId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.merchant) {
          setFound(data.merchant);
          if (amountFromQr) setAmount(amountFromQr);
        } else {
          // Unknown merchant — let the user proceed with manual entry so
          // they can still pay an arbitrary code (we treat it as unverified).
          setFound({
            name: "Unknown Merchant",
            account: merchantId,
            category: "unknown",
            rating: 0,
            manual: true,
          });
        }
      } catch {
        setFound({
          name: "QR Code",
          account: merchantId,
          category: "unknown",
          rating: 0,
          manual: true,
        });
      }
    },
    [],
  );

  // Start the camera + (if available) the BarcodeDetector polling loop.
  const startScan = useCallback(async () => {
    setError(null);
    setFound(null);
    setDone(null);
    setScanning(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* autoplay can reject silently; the play() promise resolves once
             the video element is ready, even if muted+playsInline is set */
        });
      }

      // Native BarcodeDetector — Chrome, Edge, Opera. Not on Firefox/Safari.
      const hasDetector =
        typeof window !== "undefined" && "BarcodeDetector" in window;
      if (hasDetector) {
        try {
          // @ts-expect-error — BarcodeDetector is not in TS lib yet
          detectorRef.current = new window.BarcodeDetector({
            formats: ["qr_code"],
          });
        } catch {
          detectorRef.current = null;
        }
      }

      if (detectorRef.current) {
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return;
          if (videoRef.current.readyState < 2) return; // not enough data yet
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code) {
                stopScan();
                handleQrResult(code);
              }
            }
          } catch {
            /* transient detect error — ignore, the interval will retry */
          }
        }, 350);
      } else {
        // No native detector — keep the camera preview running so the user
        // sees the scanning frame, but they must enter the code manually.
        setError(
          "Live QR detection isn't supported on this browser. Keep the camera on the QR, then type the code printed below it.",
        );
      }
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Grant access in your browser settings, or enter the merchant code manually below."
          : e?.name === "NotFoundError"
            ? "No camera found on this device. Enter the merchant code manually below."
            : e?.message || "Failed to access camera.";
      setError(msg);
      setScanning(false);
      stopScan();
    }
  }, [handleQrResult, stopScan]);

  // Cleanup camera + interval when the component unmounts or scanning ends.
  useEffect(() => {
    return () => stopScan();
  }, [stopScan]);

  // Also stop scanning if the user navigates away while found/done panels
  // are open — `useEffect` cleanup handles unmount; this guards tab switch.
  useEffect(() => {
    if ((found || done) && scanning) stopScan();
  }, [found, done, scanning, stopScan]);

  const pay = async () => {
    if (!found || !amount) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/pay-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency: userCur,
          type: "payment",
          category: "shopping",
          counterpartyName: found.name,
          method: "qr",
          description: `QR payment to ${found.name}${found.manual ? " (unverified)" : ""}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Payment failed");
      setDone({
        amount: Number(amount),
        currency: userCur,
        merchant: found.name,
        reference: data.transaction?.reference,
        transactionId: data.transaction?.id,
        paidAt: data.transaction?.completedAt || new Date().toISOString(),
      });
      setFound(null);
      setAmount("");
      toast.success(`${fmt(Number(amount))} paid to ${found.name}`);
    } catch (e: any) {
      setError(e?.message || "Payment failed. Please try again.");
      toast.error(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const reset = () => {
    setFound(null);
    setDone(null);
    setAmount("");
    setError(null);
    setManualCode("");
  };

  return (
    <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
      {!found && !done && (
        <div className="text-center">
          {/* ── Camera preview / scanning frame ── */}
          <div className="relative mx-auto mb-4 aspect-square w-full max-w-[18rem] overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-muted/20">
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  playsInline
                  muted
                />
                {/* Subtle dim overlay so the scanning frame pops */}
                <div className="absolute inset-0 bg-black/15" />
                {/* Animated corner brackets */}
                <div className="scan-corner absolute left-3 top-3 h-8 w-8 rounded-tl-lg border-t-4 border-l-4 border-primary" />
                <div className="scan-corner absolute right-3 top-3 h-8 w-8 rounded-tr-lg border-t-4 border-r-4 border-primary" />
                <div className="scan-corner absolute bottom-3 left-3 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-primary" />
                <div className="scan-corner absolute bottom-3 right-3 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-primary" />
                {/* Animated scan line */}
                <div className="animate-scan absolute left-3 right-3 h-0.5 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary/60" />
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center px-4">
                  <ScanLine className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("pay.scanInstructions")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-left text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {scanning ? (
            <Button variant="outline" className="w-full rounded-xl" onClick={stopScan}>
              <X className="h-4 w-4 mr-2" /> {t("pay.stopScanning")}
            </Button>
          ) : (
            <Button className="w-full rounded-xl shadow-premium-sm h-12" onClick={startScan}>
              <Camera className="h-4 w-4 mr-2" /> {t("pay.startScanning")}
            </Button>
          )}

          {/* ── Manual entry fallback ── */}
          <div className="mt-5 text-left">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("pay.orEnterCode", { defaultValue: "or enter code manually" })}</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                className="rounded-xl"
                placeholder={t("pay.merchantId", { defaultValue: "Merchant ID, QR code, or URL" })}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualCode.trim()) {
                    handleQrResult(manualCode);
                    setManualCode("");
                  }
                }}
              />
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => {
                  if (manualCode.trim()) {
                    handleQrResult(manualCode);
                    setManualCode("");
                  }
                }}
              >
                {t("common.search", { defaultValue: "Look up" })}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment confirmation form ── */}
      {found && !done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-4 flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground"
              onClick={() => {
                setFound(null);
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.back")}
            </Button>
            <h3 className="font-semibold">{t("pay.confirmPayment")}</h3>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-center">
            <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Store className="h-6 w-6" />
            </div>
            <p className="font-semibold">{found.name}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {t("nav.merchantDashboard", { defaultValue: "Merchant" })} · {found.category}
            </p>
            <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
              {found.rating > 0 && (
                <>
                  <span className="text-amber-500">★ {found.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">·</span>
                </>
              )}
              {found.manual ? (
                <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400 rounded-full">
                  {t("pay.unverified", { defaultValue: "Unverified" })}
                </Badge>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t("pay.verifiedMerchant")}</span>
              )}
            </div>
            {found.account && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {t("pay.accountNumber", { defaultValue: "Account" })}: {found.account}
              </p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <Label>{t("pay.amountToPay")} ({userCur})</Label>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg text-muted-foreground">{symbol}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="border-0 bg-transparent p-0 text-3xl font-bold tabular-nums text-center focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 rounded-lg border border-border/60 py-1.5 text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-600 transition"
                >
                  {symbol}
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={pay} disabled={!amount || paying} className="mt-4 w-full rounded-xl shadow-premium-sm h-12">
            {paying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Paying...
              </>
            ) : (
              <>Pay {amount ? fmt(Number(amount)) : ""}</>
            )}
          </Button>
        </motion.div>
      )}

      {/* ── Receipt / success screen ── */}
      {done && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-2"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow shadow-premium-lg"
            >
              <Check className="h-8 w-8" strokeWidth={3} />
            </motion.div>
            <h3 className="text-xl font-bold">{t("pay.paymentSuccess", { defaultValue: "Payment Successful" })}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pay.paidTo", { amount: fmt(done.amount), to: done.merchant, defaultValue: `${fmt(done.amount)} paid to ${done.merchant}` })}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="space-y-2.5">
              <ReceiptRow icon={Hash} label="Reference" value={done.reference || "—"} mono />
              <ReceiptRow
                icon={Store}
                label="Merchant"
                value={done.merchant}
              />
              <ReceiptRow
                icon={Wallet}
                label="Amount"
                value={fmt(done.amount)}
              />
              <ReceiptRow
                icon={Calendar}
                label="Date"
                value={new Date(done.paidAt).toLocaleString()}
              />
              <ReceiptRow
                icon={Check}
                label="Status"
                value={<span className="font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" /> {t("statement.print", { defaultValue: "Print" })}
            </Button>
            <Button className="flex-1 rounded-xl shadow-premium-sm" onClick={reset}>
              <RefreshCw className="h-4 w-4 mr-2" /> {t("common.add", { defaultValue: "New Payment" })}
            </Button>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

function ReceiptRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className={cn("text-right text-foreground", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

// ============================================================
// MerchantsPay — browse verified merchants
// ============================================================
function MerchantsPay() {
  const { data } = useFetch<{ merchants: any[] }>("/api/merchants");
  const merchants = data?.merchants ?? [];
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{t("pay.browseMerchants", { defaultValue: "Browse and pay verified merchants" })}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {merchants.length === 0 &&
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        {merchants.map((m) => (
          <Card key={m.id} className="card-premium border-border/60 shadow-premium-sm cursor-pointer p-4 card-lift">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="capitalize text-xs text-muted-foreground">{m.category}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] rounded-full">
                    ★ {m.rating.toFixed(1)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 rounded-full">
                    Verified
                  </Badge>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// BillsPay — REAL bill payment with category grid, expandable
// sections, processing state, printable receipt, and recent
// payment history.
// ============================================================
function BillsPay() {
  const { fmt, symbol } = useFormatMoney();
  const { data } = useFetch<{ billers: any[]; categories: any[] }>("/api/billers");
  const historyFetch = useFetch<{ transactions: any[] }>("/api/bills");
  const billers = data?.billers ?? [];
  const history = historyFetch.data?.transactions ?? [];

  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [account, setAccount] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paying, setPaying] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [receipt, setReceipt] = useState<any>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const categoryGroups = [
    { label: "Utilities", cats: ["electricity", "water", "gas", "internet", "tv", "phone"] },
    { label: "Government & Taxes", cats: ["taxes", "customs", "fines", "permits", "social", "government"] },
    { label: "Education", cats: ["education", "university", "college", "school", "exams"] },
    { label: "Financial", cats: ["loan", "insurance", "mortgage"] },
    { label: "Transport", cats: ["fuel", "toll", "transport"] },
    { label: "Entertainment & Health", cats: ["streaming", "gaming", "health", "gym"] },
    { label: "Other", cats: ["betting", "donations", "rent", "other"] },
  ];

  // Tonal icon tiles for biller categories
  const CAT_TONES: Record<string, string> = {
    electricity: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    water: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    gas: "bg-rose-500/15 text-rose-500",
    internet: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
    tv: "bg-rose-500/15 text-rose-500",
    phone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    education: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    betting: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    government: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    taxes: "bg-rose-500/15 text-rose-500",
    customs: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    fines: "bg-rose-500/15 text-rose-500",
    permits: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    social: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    university: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    college: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    school: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    exams: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    loan: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    insurance: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    mortgage: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    fuel: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    toll: "bg-rose-500/15 text-rose-500",
    transport: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    streaming: "bg-rose-500/15 text-rose-500",
    gaming: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
    health: "bg-rose-500/15 text-rose-500",
    gym: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    donations: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    rent: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    other: "bg-muted text-muted-foreground",
  };

  const resetForm = () => {
    setSelected(null);
    setAccount("");
    setPhone("");
    setAmount("");
    setDescription("");
    setReceipt(null);
    setPayError(null);
    setProcessingStep("");
  };

  const pay = async () => {
    if (!selected || !account || !amount) return;
    setPaying(true);
    setPayError(null);
    setProcessingStep("Validating biller...");
    try {
      // Real processing animation steps — gives the user feedback while
      // the single network round-trip happens.
      const steps = [
        "Validating biller...",
        "Verifying account number...",
        "Checking wallet balance...",
        "Processing payment...",
        "Generating receipt...",
      ];
      let stepIdx = 0;
      const stepInterval = setInterval(() => {
        stepIdx = Math.min(stepIdx + 1, steps.length - 1);
        setProcessingStep(steps[stepIdx]);
      }, 350);

      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billerId: selected.id,
          accountNumber: account,
          amount: Number(amount),
          phone: phone || undefined,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok) {
        throw new Error(data?.error || "Bill payment failed");
      }

      setReceipt(data.receipt);
      toast.success(
        `${symbol}${Number(amount).toLocaleString()} paid to ${selected.name}`,
      );
      // Refresh history
      historyFetch.reload();
    } catch (e: any) {
      setPayError(e?.message || "Payment failed. Please try again.");
      toast.error(e?.message || "Bill payment failed");
    } finally {
      setPaying(false);
      setProcessingStep("");
    }
  };

  // ── Receipt view ──
  if (receipt) {
    return (
      <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow shadow-premium-lg"
            >
              <Check className="h-8 w-8" strokeWidth={3} />
            </motion.div>
            <h3 className="text-xl font-bold">{t("pay.paymentSuccess", { defaultValue: "Bill Payment Successful" })}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pay.paidTo", { amount: fmt(receipt.amount), to: receipt.billerName, defaultValue: `${fmt(receipt.amount)} paid to ${receipt.billerName}` })}
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="mb-3 border-b pb-3 text-center">
              <p className="font-semibold">{receipt.billerName}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {receipt.billerCategory} · GaexPay
              </p>
            </div>
            <div className="space-y-2.5">
              <ReceiptRow icon={Hash} label="Reference" value={receipt.reference} mono />
              <ReceiptRow icon={Receipt} label="Account" value={receipt.accountNumber} mono />
              <ReceiptRow icon={Wallet} label="Amount" value={fmt(receipt.amount)} />
              {receipt.fee > 0 && (
                <ReceiptRow icon={Package} label="Fee" value={fmt(receipt.fee)} />
              )}
              <ReceiptRow
                icon={Wallet}
                label="Total debited"
                value={<span className="font-bold">{fmt(receipt.total)}</span>}
              />
              <ReceiptRow
                icon={Calendar}
                label="Date"
                value={new Date(receipt.paidAt).toLocaleString()}
              />
              <ReceiptRow
                icon={Check}
                label="Status"
                value={
                  <span className="font-semibold capitalize text-emerald-600 dark:text-emerald-400">
                    {receipt.status}
                  </span>
                }
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> {t("statement.print", { defaultValue: "Print" })}
            </Button>
            <Button className="flex-1 rounded-xl shadow-premium-sm" onClick={resetForm}>
              <Receipt className="h-4 w-4 mr-2" /> {t("pay.payBill", { defaultValue: "Pay Another" })}
            </Button>
          </div>
        </motion.div>
      </Card>
    );
  }

  // ── Biller form (selected biller) ──
  if (selected) {
    const biller = selected;
    const tone = CAT_TONES[biller.category] || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    return (
      <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
        <div className="mb-4 flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <div className={cn("grid h-9 w-9 place-items-center rounded-lg", tone)}>
              {(() => {
                const Icon = BILLER_ICONS[biller.category] || Receipt;
                return <Icon className="h-4 w-4" />;
              })()}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{biller.name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">
                {biller.category} · {biller.flag} {biller.country}
              </p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {payError && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p>{payError}</p>
              <button
                onClick={() => setPayError(null)}
                className="mt-1 text-[11px] underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>
              {biller.accountLabel}
              <span className="ml-1 text-rose-500">*</span>
            </Label>
            <Input
              className="rounded-xl"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={biller.accountLabel}
              disabled={paying}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone / Email (optional)</Label>
            <Input
              className="rounded-xl"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="For receipt delivery"
              disabled={paying}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Amount ({symbol})
              <span className="ml-1 text-rose-500">*</span>
            </Label>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg text-muted-foreground">{symbol}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ${biller.minAmount.toLocaleString()}`}
                  disabled={paying}
                  className="border-0 bg-transparent p-0 text-3xl font-bold tabular-nums text-center focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 rounded-lg border border-border/60 py-1.5 text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-600 transition"
                >
                  {symbol}
                  {v.toLocaleString()}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Range: {symbol}{biller.minAmount.toLocaleString()} – {symbol}{biller.maxAmount.toLocaleString()}
              {biller.fee > 0 && ` · Fee: ${symbol}${biller.fee}`}
              {" · "}{biller.estimatedTime}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              className="rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. March electricity bill"
              disabled={paying}
              maxLength={120}
            />
          </div>
        </div>

        {amount && (
          <div className="mt-4 rounded-xl border border-border/60 bg-card p-4 text-sm shadow-premium-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Amount</span>
              <span className="font-medium tabular-nums">{symbol}{Number(amount).toLocaleString()}</span>
            </div>
            {biller.fee > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fee</span>
                <span className="font-medium tabular-nums">{symbol}{biller.fee}</span>
              </div>
            )}
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-bold tabular-nums">{symbol}{(Number(amount) + (biller.fee || 0)).toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button
          onClick={pay}
          disabled={!account || !amount || paying}
          className="mt-4 w-full rounded-xl shadow-premium-sm h-12"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {processingStep || "Processing..."}
            </>
          ) : (
            <>Pay {amount ? fmt(Number(amount)) : "Bill"}</>
          )}
        </Button>
      </Card>
    );
  }

  // ── Default: category grid + recent history ──
  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {categoryGroups.map((group) => {
          const groupCats = BILL_CATEGORIES.filter((c) => group.cats.includes(c.id));
          if (groupCats.length === 0) return null;
          return (
            <div key={group.label}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupCats.map((catItem) => {
                  const catBillers = billers.filter((b) => b.category === catItem.id);
                  const isExpanded = expandedCat === catItem.id;
                  const tone = CAT_TONES[catItem.id] || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                  return (
                    <div key={catItem.id} className="space-y-2">
                      <Card
                        className="card-premium border-border/60 shadow-premium-sm cursor-pointer p-4 card-lift"
                        onClick={() =>
                          setExpandedCat(isExpanded ? null : catItem.id)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tone)}>
                            <span className="text-xl">{catItem.icon}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{catItem.label}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {catBillers.length > 0
                                ? `${catBillers.length} biller${catBillers.length === 1 ? "" : "s"}`
                                : catItem.desc}
                            </p>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </div>
                      </Card>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-2"
                        >
                          {catBillers.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                              No billers seeded in this category yet.
                              <br />
                              <button
                                className="mt-1 underline"
                                onClick={() =>
                                  setSelected({
                                    id: `manual-${catItem.id}`,
                                    name: catItem.label,
                                    category: catItem.id,
                                    accountLabel: "Reference Number",
                                    minAmount: 100,
                                    maxAmount: 500000,
                                    fee: 0,
                                    estimatedTime: "Instant",
                                    country: "Nigeria",
                                    flag: "🇳🇬",
                                  })
                                }
                              >
                                Pay a custom {catItem.label.toLowerCase()} bill
                              </button>
                            </p>
                          ) : (
                            <ScrollArea className="max-h-72 rounded-lg border">
                              <div className="space-y-1 p-2">
                                {catBillers.map((b) => {
                                  const Icon = BILLER_ICONS[b.category] || Receipt;
                                  const bTone = CAT_TONES[b.category] || "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                                  return (
                                    <button
                                      key={b.id}
                                      onClick={() => setSelected(b)}
                                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-muted"
                                    >
                                      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md", bTone)}>
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                          {b.name}
                                        </p>
                                        <p className="truncate text-[11px] text-muted-foreground">
                                          {b.flag} {b.country} · {b.accountLabel}
                                        </p>
                                      </div>
                                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                    </button>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent bill payments ── */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Bill Payments
          </h3>
          <Card className="card-premium border-border/60 shadow-premium-sm p-3">
            <ScrollArea className="max-h-96">
              <div className="space-y-1">
                {history.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/60"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-500">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tx.counterpartyName || "Bill payment"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {tx.counterpartyAccount} · {timeAgo(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        -{formatMoney(tx.amount, tx.currency)}
                      </p>
                      <span className={cn(
                        "inline-block rounded-full px-1.5 py-0.5 text-[9px] uppercase",
                        tx.status === "completed" ? "pill-success" : tx.status === "pending" ? "pill-warning" : "pill-danger",
                      )}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AirtimePay — Airtime + Data tabs (real POST through
// /api/pay-merchant with type airtime/data).
// ============================================================
function AirtimePay({ country }: { country?: string }) {
  return (
    <Tabs defaultValue="airtime">
      <TabsList className="grid w-full grid-cols-2 h-auto">
        <TabsTrigger value="airtime" className="rounded-xl py-2">
          <Phone className="h-4 w-4 mr-1.5" /> Airtime
        </TabsTrigger>
        <TabsTrigger value="data" className="rounded-xl py-2">
          <Database className="h-4 w-4 mr-1.5" /> Data
        </TabsTrigger>
      </TabsList>
      <TabsContent value="airtime" className="mt-4">
        <AirtimeForm country={country} />
      </TabsContent>
      <TabsContent value="data" className="mt-4">
        <DataForm country={country} />
      </TabsContent>
    </Tabs>
  );
}

function NetworkPicker({ value, onChange, disabled, country }: { value: string; onChange: (v: string) => void; disabled?: boolean; country?: string }) {
  const networks = getAvailableMobileMoneyProviders(country);
  return (
    <div className="grid grid-cols-4 gap-2">
      {networks.map((n) => (
        <button
          key={n.id}
          onClick={() => onChange(n.id)}
          disabled={disabled}
          className={cn(
            "rounded-xl border p-2.5 text-center transition card-lift",
            value === n.id
              ? "border-primary ring-2 ring-primary/20 bg-primary/5"
              : "border-border/60 hover:bg-muted/40",
          )}
        >
          <div className="mx-auto mb-1.5 h-2 w-8 rounded-full" style={{ background: n.color }} />
          <span className="text-[10px] font-medium">{n.name}</span>
        </button>
      ))}
    </div>
  );
}

function AirtimeForm({ country }: { country?: string }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [network, setNetwork] = useState(getAvailableMobileMoneyProviders(country)[0]?.id || "mtn");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<any>(null);

  const pay = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/pay-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          currency: userCur,
          type: "airtime",
          category: "general",
          counterpartyName: `${network.toUpperCase()} - ${phone}`,
          method: "wallet",
          provider: network,
          description: `Airtime topup ${phone} (${network.toUpperCase()})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Airtime purchase failed");
      setDone({
        amount: Number(amount),
        currency: userCur,
        phone,
        network: network.toUpperCase(),
        reference: data.transaction?.reference,
        paidAt: data.transaction?.completedAt || new Date().toISOString(),
      });
      toast.success(`${symbol}${Number(amount).toLocaleString()} airtime sent to ${phone}`);
      setPhone("");
      setAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Airtime purchase failed");
    } finally {
      setPaying(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow shadow-premium-lg"
            >
              <Check className="h-8 w-8" strokeWidth={3} />
            </motion.div>
            <h3 className="text-xl font-bold">Airtime Purchased</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {fmt(done.amount)} sent to {done.phone}
            </p>
          </div>
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="space-y-2.5">
              <ReceiptRow icon={Hash} label="Reference" value={done.reference} mono />
              <ReceiptRow icon={Phone} label="Number" value={done.phone} mono />
              <ReceiptRow icon={Smartphone} label="Network" value={done.network} />
              <ReceiptRow icon={Wallet} label="Amount" value={fmt(done.amount)} />
              <ReceiptRow
                icon={Calendar}
                label="Date"
                value={new Date(done.paidAt).toLocaleString()}
              />
            </div>
          </div>
          <Button className="mt-4 w-full rounded-xl shadow-premium-sm h-12" onClick={() => setDone(null)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Buy More
          </Button>
        </motion.div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Select Network</Label>
          <NetworkPicker value={network} onChange={setNetwork} country={country} />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            className="rounded-xl"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            disabled={paying}
          />
        </div>
        <div className="space-y-2">
          <Label>Amount ({symbol})</Label>
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg text-muted-foreground">{symbol}</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={paying}
                className="border-0 bg-transparent p-0 text-3xl font-bold tabular-nums text-center focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[100, 200, 500, 1000, 2000, 5000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                className="flex-1 rounded-lg border border-border/60 py-1.5 text-xs font-medium hover:bg-emerald-500/10 hover:text-emerald-600 transition"
              >
                {symbol}
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Zap className="h-4 w-4 shrink-0" /> Get 2% bonus airtime on every top-up with GaexPay.
        </div>
        <Button
          onClick={pay}
          disabled={!phone || !amount || paying}
          className="w-full rounded-xl shadow-premium-sm h-12"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...
            </>
          ) : (
            "Buy Airtime"
          )}
        </Button>
      </div>
    </Card>
  );
}

function DataForm({ country }: { country?: string }) {
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [network, setNetwork] = useState(getAvailableMobileMoneyProviders(country)[0]?.id || "mtn");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<any>(null);

  const selectedPlan = DATA_PLANS.find((p) => p.id === plan);

  const pay = async () => {
    if (!phone || !selectedPlan) return;
    setPaying(true);
    try {
      const res = await fetch("/api/pay-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedPlan.amount,
          currency: userCur,
          type: "airtime",
          category: "general",
          counterpartyName: `${network.toUpperCase()} Data - ${phone}`,
          method: "wallet",
          provider: network,
          description: `${selectedPlan.label} data bundle for ${phone} (${network.toUpperCase()})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Data purchase failed");
      setDone({
        amount: selectedPlan.amount,
        currency: userCur,
        phone,
        network: network.toUpperCase(),
        plan: selectedPlan.label,
        reference: data.transaction?.reference,
        paidAt: data.transaction?.completedAt || new Date().toISOString(),
      });
      toast.success(`${selectedPlan.label} data sent to ${phone}`);
      setPhone("");
      setPlan("");
    } catch (e: any) {
      toast.error(e?.message || "Data purchase failed");
    } finally {
      setPaying(false);
    }
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white pulse-glow shadow-premium-lg"
            >
              <Database className="h-8 w-8" strokeWidth={2.5} />
            </motion.div>
            <h3 className="text-xl font-bold">Data Purchased</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {done.plan} sent to {done.phone}
            </p>
          </div>
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="space-y-2.5">
              <ReceiptRow icon={Hash} label="Reference" value={done.reference} mono />
              <ReceiptRow icon={Phone} label="Number" value={done.phone} mono />
              <ReceiptRow icon={Smartphone} label="Network" value={done.network} />
              <ReceiptRow icon={Database} label="Plan" value={done.plan} />
              <ReceiptRow icon={Wallet} label="Amount" value={fmt(done.amount)} />
              <ReceiptRow
                icon={Calendar}
                label="Date"
                value={new Date(done.paidAt).toLocaleString()}
              />
            </div>
          </div>
          <Button className="mt-4 w-full rounded-xl shadow-premium-sm h-12" onClick={() => setDone(null)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Buy More
          </Button>
        </motion.div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md p-6 card-premium border-border/60 shadow-premium-md">
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Select Network</Label>
          <NetworkPicker value={network} onChange={setNetwork} country={country} />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            className="rounded-xl"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0801 234 5678"
            disabled={paying}
          />
        </div>
        <div className="space-y-2">
          <Label>Select Data Plan</Label>
          <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 pr-1">
            {DATA_PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition card-lift",
                  plan === p.id
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {symbol}
                  {p.amount.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={pay}
          disabled={!phone || !selectedPlan || paying}
          className="w-full rounded-xl shadow-premium-sm h-12"
        >
          {paying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Purchasing...
            </>
          ) : selectedPlan ? (
            `Buy ${selectedPlan.label} · ${fmt(selectedPlan.amount)}`
          ) : (
            "Buy Data"
          )}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================
// ESimPay — buy an eSim data plan for any supported destination.
// ============================================================
function ESimPay() {
  const { fmtRaw } = useFormatMoney();
  const { data, reload, loading } = useFetch<{ countries: any[]; purchases: any[] }>("/api/esim");
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState<any>(null);
  const [showPurchases, setShowPurchases] = useState(false);

  const countries = data?.countries ?? [];
  const purchases = data?.purchases ?? [];

  const buy = async () => {
    if (!selectedCountry || !selectedPlan) return;
    setBuying(true);
    try {
      const res = await fetch("/api/esim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: selectedCountry.code, planId: selectedPlan.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to purchase eSim");
        return;
      }
      setPurchased(json.purchase);
      setSelectedCountry(null);
      setSelectedPlan(null);
      toast.success("eSim activated! Scan the QR to install.");
      reload();
    } catch {
      toast.error("Network error");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-premium-lg">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 text-3xl backdrop-blur ring-1 ring-white/30">📶</div>
            <div>
              <h3 className="font-bold">Travel data, instantly</h3>
              <p className="text-xs text-white/80">
                Buy an eSim data plan for 190+ countries. No SIM swap, no roaming fees.
              </p>
            </div>
          </div>
          {purchases.length > 0 && (
            <Button size="sm" variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/30 rounded-xl" onClick={() => setShowPurchases(!showPurchases)}>
              My eSims ({purchases.length})
            </Button>
          )}
        </div>
      </Card>

      {showPurchases && purchases.length > 0 && (
        <Card className="p-4 space-y-3 card-premium border-border/60 shadow-premium-sm">
          <h4 className="font-semibold text-sm">Your eSims</h4>
          {purchases.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.flag}</span>
                <div>
                  <p className="text-sm font-medium">{p.planLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.countryName} · {fmtRaw(p.price, p.currency)} · Activated {new Date(p.activatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className={cn(
                "border-0 rounded-full",
                p.status === "active" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
              )}>
                {p.status}
              </Badge>
            </div>
          ))}
        </Card>
      )}

      {!purchased ? (
        <Card className="p-5 card-premium border-border/60 shadow-premium-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm mb-3">1. Pick destination</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : (
                  countries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setSelectedCountry(c); setSelectedPlan(null); }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border p-2 transition card-lift",
                        selectedCountry?.code === c.code
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "border-border/60 hover:bg-muted/50",
                      )}
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className="text-[10px] font-medium leading-tight text-center">{c.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">2. Choose a plan</h4>
              {!selectedCountry ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  <Globe2 className="h-6 w-6 mr-2" /> Select a country
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCountry.plans.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlan(p)}
                      className={cn(
                        "w-full text-left rounded-xl border p-3 transition card-lift",
                        selectedPlan?.id === p.id
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "border-border/60 hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.coverage}</p>
                        </div>
                        <p className="font-bold tabular-nums">{fmtRaw(p.price, "USD")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedPlan && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-muted-foreground">Selected plan</p>
                <p className="font-semibold">
                  {selectedCountry.flag} {selectedCountry.name} · {selectedPlan.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Signal className="inline h-3 w-3 mr-1" />
                  {selectedPlan.coverage} · <Clock className="inline h-3 w-3 mx-1" />
                  Valid {selectedPlan.durationDays} days
                </p>
              </div>
              <Button onClick={buy} disabled={buying} className="rounded-xl shadow-premium-sm">
                {buying ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                Buy · {fmtRaw(selectedPlan.price, "USD")}
              </Button>
            </motion.div>
          )}
        </Card>
      ) : (
        <Card className="p-5 card-premium border-border/60 shadow-premium-md">
          <div className="flex flex-col items-center text-center py-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl bg-emerald-500/15 p-3 mb-3"
            >
              <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <h3 className="font-bold text-lg">eSim Activated!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Scan this QR with your phone's camera to install the eSim profile.
            </p>
            <div className="rounded-2xl bg-white p-3 shadow-premium-lg ring-1 ring-emerald-500/20 mb-4">
              <QrCodeImage value={purchased.activationQr} size={200} />
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 w-full max-w-md">
              <p className="text-xs text-muted-foreground">Activation code</p>
              <code className="text-xs font-mono break-all">{purchased.activationQr}</code>
            </div>
            <Button className="mt-4 rounded-xl shadow-premium-sm" onClick={() => setPurchased(null)}>Buy another</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
