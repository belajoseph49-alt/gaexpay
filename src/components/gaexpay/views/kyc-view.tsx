"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, CheckCircle2, Clock, XCircle, FileCheck, IdCard,
  MapPin, Camera, ChevronRight, ChevronLeft, Lock, Globe, Award,
  User, Calendar, Phone, Crosshair, Sparkles, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { KYC_TIERS, CURRENCIES, formatDate } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";
import {
  ImageUpload, WebcamCapture, detectGpsAddress,
} from "./kyc-shared";

// ---- Static config ---------------------------------------------------------

const DOC_TYPES = [
  { id: "national_id", label: "National ID Card", icon: IdCard, hasBack: true },
  { id: "passport", label: "International Passport", icon: IdCard, hasBack: false },
  { id: "drivers_license", label: "Driver's License", icon: IdCard, hasBack: true },
  { id: "voters_card", label: "Voter's Card", icon: IdCard, hasBack: true },
];

const WIZARD_STEPS = [
  { id: 0, label: "Personal Info", icon: User },
  { id: 1, label: "ID Document", icon: IdCard },
  { id: 2, label: "Selfie", icon: Camera },
  { id: 3, label: "Review", icon: CheckCircle2 },
];

// ---- Main view -------------------------------------------------------------

interface KycStatusResponse {
  accountType: string;
  kycStatus: string;
  kycTier: number;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycRejectionReason: string | null;
  currentTier: { tier: number; name: string; dailyLimit: number; requirements: string[] };
  nextTier: { tier: number; name: string; dailyLimit: number; requirements: string[] } | null;
  dailyLimit: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasAddress: boolean;
  documents: Array<{
    id: string;
    type: string;
    documentNumber: string | null;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
  }>;
}

export function KycView() {
  const { t } = useTranslation();
  const { data, reload, loading } = useFetch<KycStatusResponse>("/api/kyc/status");
  const { data: meData } = useFetch<{ user: any }>("/api/me");
  const [submitting, setSubmitting] = useState(false);
  const { symbol } = useFormatMoney();

  // Wizard state
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dob: "",
    nationality: "Nigeria",
    address: "",
    city: "",
    documentType: "national_id",
    documentNumber: "",
    documentExpiry: "",
    frontImage: "",
    backImage: "",
    selfieImage: "",
  });
  const [submitResult, setSubmitResult] = useState<null | { ok: true; submittedAt: string }>(null);

  // Prefill from /api/me when it loads
  useEffect(() => {
    const u = meData?.user;
    if (u) {
      setForm((f) => ({
        ...f,
        firstName: f.firstName || u.firstName || "",
        lastName: f.lastName || u.lastName || "",
        phone: f.phone || u.phone || "",
        nationality: f.nationality || u.country || "Nigeria",
        address: f.address || u.address || "",
        city: f.city || u.city || "",
        dob: f.dob || u.dob || "",
      }));
    }
  }, [meData]);

  const status = data?.kycStatus ?? "unverified";
  const tier = data?.kycTier ?? 0;
  const completion = Math.min(100, tier * 33 + (status === "verified" ? 1 : 0));
  const isWizardMode =
    submitResult !== null ||
    status === "unverified" ||
    status === "rejected";

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const detectGps = async () => {
    const c = await detectGpsAddress();
    if (!c) {
      toast.error("Could not detect your location. Please enter your address manually.");
      return;
    }
    toast.success(`Location detected: ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`);
    update({
      address:
        form.address ||
        `GPS: ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)} (auto-detected — please refine)`,
    });
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.dob) return "Date of birth is required";
      if (!form.nationality) return "Nationality is required";
      if (!form.address) return "Address is required";
    }
    if (s === 1) {
      if (!form.documentNumber) return "Document number is required";
      if (!form.documentExpiry) return "Document expiry is required";
      if (!form.frontImage) return "Front image is required";
      const doc = DOC_TYPES.find((d) => d.id === form.documentType);
      if (doc?.hasBack && !form.backImage) return "Back image is required for this document";
    }
    if (s === 2) {
      if (!form.selfieImage) return "Selfie is required";
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    // Final validation across all steps
    for (let i = 0; i < WIZARD_STEPS.length - 1; i++) {
      const err = validateStep(i);
      if (err) {
        setStep(i);
        toast.error(err);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dob: form.dob,
          nationality: form.nationality,
          address: form.address,
          city: form.city,
          documentType: form.documentType,
          documentNumber: form.documentNumber,
          documentExpiry: form.documentExpiry,
          frontImage: form.frontImage,
          backImage: form.backImage,
          selfieImage: form.selfieImage,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Submission failed");
      }
      setSubmitResult({ ok: true, submittedAt: new Date().toISOString() });
      toast.success("KYC submitted for review");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success screen ------------------------------------------------------
  if (submitResult) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-0 bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-center text-white">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-white/20 backdrop-blur">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold">Submission Received!</h2>
            <p className="mt-2 text-white/90">
              We&apos;ll review your documents within 24-48 hours. You&apos;ll receive a
              notification as soon as your verification is complete.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setSubmitResult(null);
                  setStep(0);
                  reload();
                }}
              >
                Back to Identity
              </Button>
            </div>
            <p className="mt-4 text-xs text-white/70">
              Submitted at {formatDate(submitResult.submittedAt)}
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("kyc.title")}</h1>
        <p className="text-sm text-muted-foreground">
          Verify your identity to unlock higher limits and all features
        </p>
      </div>

      {/* Status banner */}
      <Card
        className={cn(
          "relative overflow-hidden border-0 p-6 text-white",
          status === "verified"
            ? "bg-gradient-to-br from-emerald-600 to-teal-700"
            : status === "pending"
            ? "bg-gradient-to-br from-amber-500 to-orange-600"
            : status === "rejected"
            ? "bg-gradient-to-br from-rose-500 to-red-600"
            : "bg-gradient-to-br from-slate-600 to-slate-800",
        )}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur">
              {status === "verified" ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : status === "pending" ? (
                <Clock className="h-7 w-7" />
              ) : status === "rejected" ? (
                <XCircle className="h-7 w-7" />
              ) : (
                <ShieldCheck className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold capitalize">{status}</h2>
                <Badge className="bg-white/20 text-white border-0">Tier {tier}</Badge>
              </div>
              <p className="text-sm text-white/80">
                {status === "verified"
                  ? "Your identity is fully verified. All features unlocked."
                  : status === "pending"
                  ? "Your documents are under review. This usually takes 24-48 hours."
                  : status === "rejected"
                  ? "Your last submission was rejected. Please review and resubmit."
                  : "Complete verification to unlock all features."}
              </p>
              {data?.kycRejectionReason && status === "rejected" && (
                <p className="mt-1 text-xs text-white/90">
                  Reason: {data.kycRejectionReason}
                </p>
              )}
              {data?.kycVerifiedAt && status === "verified" && (
                <p className="text-xs text-white/70 mt-0.5">
                  Verified on {formatDate(data.kycVerifiedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Verification Progress</p>
            <p className="text-2xl font-bold">{completion}%</p>
          </div>
        </div>
        <Progress value={completion} className="mt-4 h-1.5 bg-white/20" />
      </Card>

      {/* Tier table — always visible */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">Verification Tiers &amp; Limits</h3>
          {data?.nextTier && status !== "pending" && (
            <Badge className="bg-primary/10 text-primary border-0">
              <Sparkles className="mr-1 h-3 w-3" />
              Next: {data.nextTier.name} · {symbol}
              {data.nextTier.dailyLimit.toLocaleString()}/day
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Upgrade your tier to access more features
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {KYC_TIERS.map((t) => {
            const unlocked = tier >= t.tier;
            const current = tier === t.tier;
            return (
              <div
                key={t.tier}
                className={cn(
                  "rounded-xl border p-4 transition",
                  current
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : unlocked
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "opacity-60",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {t.tier === 3 ? (
                      <Award className="h-4 w-4 text-amber-500" />
                    ) : t.tier === 0 ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    <span className="font-semibold text-sm">{t.name}</span>
                  </div>
                  {current && <Badge className="text-[10px]">Current</Badge>}
                  {unlocked && !current && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">Daily limit</p>
                <p className="text-lg font-bold tabular-nums">
                  {symbol}
                  {t.daily.toLocaleString()}
                </p>
                <div className="mt-3 space-y-1">
                  {t.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {data?.nextTier && status !== "pending" && (
          <div className="mt-4 rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold mb-1">
              To reach Tier {data.nextTier.tier} ({data.nextTier.name}):
            </p>
            <ul className="space-y-1">
              {data.nextTier.requirements.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Wizard OR documents list */}
      {isWizardMode ? (
        <Card className="p-5">
          {/* Wizard header */}
          <div className="mb-6">
            <h3 className="font-semibold mb-1">Complete Your Verification</h3>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step].label}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {WIZARD_STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-2 transition",
                      active
                        ? "border-primary bg-primary/5"
                        : done
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border opacity-60",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {/* STEP 0: Personal info */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">First name</Label>
                      <Input
                        value={form.firstName}
                        onChange={(e) => update({ firstName: e.target.value })}
                        disabled
                        className="mt-1 bg-muted/40"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Last name</Label>
                      <Input
                        value={form.lastName}
                        onChange={(e) => update({ lastName: e.target.value })}
                        disabled
                        className="mt-1 bg-muted/40"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        Date of birth
                      </Label>
                      <Input
                        type="date"
                        value={form.dob}
                        onChange={(e) => update({ dob: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <Globe className="mr-1 inline h-3 w-3" />
                        Nationality
                      </Label>
                      <Select
                        value={form.nationality}
                        onValueChange={(v) => update({ nationality: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.filter((c) => (c as any).type === "fiat").map((c) => (
                            <SelectItem key={c.code} value={(c as any).country}>
                              {(c as any).flag} {(c as any).country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      Residential address
                    </Label>
                    <div className="mt-1 flex gap-2">
                      <Textarea
                        rows={2}
                        value={form.address}
                        onChange={(e) => update({ address: e.target.value })}
                        placeholder="House number, street, district…"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={detectGps}
                        className="shrink-0 self-end"
                      >
                        <Crosshair className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Use the crosshair to auto-detect your GPS coordinates.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => update({ city: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <Phone className="mr-1 inline h-3 w-3" />
                        Phone
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => update({ phone: e.target.value })}
                        disabled
                        className="mt-1 bg-muted/40"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: ID document */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Document type</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {DOC_TYPES.map((d) => {
                        const Icon = d.icon;
                        const active = form.documentType === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => update({ documentType: d.id })}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition",
                              active
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                : "border-border hover:border-primary/40 hover:bg-muted/30",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium leading-tight">
                              {d.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Document number</Label>
                      <Input
                        value={form.documentNumber}
                        onChange={(e) => update({ documentNumber: e.target.value })}
                        placeholder="e.g. A12345678"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Expiry date</Label>
                      <Input
                        type="date"
                        value={form.documentExpiry}
                        onChange={(e) => update({ documentExpiry: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ImageUpload
                      label="Front of document"
                      value={form.frontImage}
                      onChange={(v) => update({ frontImage: v })}
                      hint="JPG/PNG · max 2 MB"
                    />
                    {DOC_TYPES.find((d) => d.id === form.documentType)?.hasBack ? (
                      <ImageUpload
                        label="Back of document"
                        value={form.backImage}
                        onChange={(v) => update({ backImage: v })}
                        hint="JPG/PNG · max 2 MB"
                      />
                    ) : (
                      <div className="hidden sm:block" />
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Selfie */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Liveness check tips
                    </p>
                    <ul className="space-y-0.5 text-xs text-amber-700/90 dark:text-amber-400/90">
                      <li>• Look straight at the camera</li>
                      <li>• Remove glasses, hats, or face coverings</li>
                      <li>• Ensure good, even lighting on your face</li>
                      <li>• Keep a neutral expression</li>
                    </ul>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block text-xs">Capture via webcam</Label>
                      <WebcamCapture
                        onCapture={(dataUrl) => update({ selfieImage: dataUrl })}
                      />
                    </div>
                    <div>
                      <ImageUpload
                        label="Or upload a selfie photo"
                        value={form.selfieImage}
                        onChange={(v) => update({ selfieImage: v })}
                        hint="JPG/PNG · max 2 MB"
                      />
                    </div>
                  </div>
                  {form.selfieImage && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Selfie captured. Ready to continue.
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Review */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">Personal Info</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd>{form.firstName} {form.lastName}</dd>
                      <dt className="text-muted-foreground">Date of birth</dt>
                      <dd>{form.dob}</dd>
                      <dt className="text-muted-foreground">Nationality</dt>
                      <dd>{form.nationality}</dd>
                      <dt className="text-muted-foreground">Address</dt>
                      <dd className="truncate">{form.address}</dd>
                      <dt className="text-muted-foreground">Phone</dt>
                      <dd>{form.phone}</dd>
                    </dl>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">ID Document</h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="capitalize">
                        {DOC_TYPES.find((d) => d.id === form.documentType)?.label}
                      </dd>
                      <dt className="text-muted-foreground">Number</dt>
                      <dd>{form.documentNumber}</dd>
                      <dt className="text-muted-foreground">Expiry</dt>
                      <dd>{form.documentExpiry}</dd>
                    </dl>
                    <div className="mt-3 flex gap-2">
                      {form.frontImage && (
                        <img
                          src={form.frontImage}
                          alt="Front"
                          className="h-16 w-20 rounded object-cover"
                        />
                      )}
                      {form.backImage && (
                        <img
                          src={form.backImage}
                          alt="Back"
                          className="h-16 w-20 rounded object-cover"
                        />
                      )}
                      {form.selfieImage && (
                        <img
                          src={form.selfieImage}
                          alt="Selfie"
                          className="h-16 w-20 rounded object-cover"
                        />
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                    <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    By submitting, you confirm the information is accurate. Your
                    documents will be reviewed within 24-48 hours.
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Wizard nav */}
          <div className="mt-6 flex items-center justify-between">
            <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < WIZARD_STEPS.length - 1 ? (
              <Button onClick={next}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                )}
                Submit for review
              </Button>
            )}
          </div>
        </Card>
      ) : (
        // ---- Submitted documents list (pending / verified states) ----
        <Card className="p-5">
          <h3 className="font-semibold mb-1">Submitted Documents</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Your verification documents
          </p>
          <div className="space-y-2">
            {(!data?.documents || data.documents.length === 0) && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "No documents submitted yet"}
              </div>
            )}
            {data?.documents.map((d) => {
              const Icon =
                DOC_TYPES.find((t) => t.id === d.type)?.icon || FileCheck;
              const sc: Record<string, { color: string; icon: any }> = {
                approved: {
                  color: "text-emerald-600 bg-emerald-500/10",
                  icon: CheckCircle2,
                },
                pending: {
                  color: "text-amber-600 bg-amber-500/10",
                  icon: Clock,
                },
                rejected: {
                  color: "text-rose-600 bg-rose-500/10",
                  icon: XCircle,
                },
              };
              const s = sc[d.status] ?? sc.pending;
              const SIcon = s.icon;
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {d.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.documentNumber && `#${d.documentNumber} · `}
                      {d.reviewedAt
                        ? `Reviewed ${formatDate(d.reviewedAt)}`
                        : "Awaiting review"}
                    </p>
                  </div>
                  <Badge className={cn("border-0", s.color)} variant="outline">
                    <SIcon className="mr-1 h-3 w-3" /> {d.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Compliance badges */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "AML Compliant", desc: "Anti-Money Laundering checks" },
          { icon: Lock, title: "PCI-DSS", desc: "Card data security standard" },
          { icon: Globe, title: "ISO 27001", desc: "Information security mgmt" },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title} className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
