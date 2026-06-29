"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, FileText, Users, UserCheck, CheckCircle2, Clock, XCircle,
  ShieldCheck, ChevronRight, ChevronLeft, Loader2, Plus, Trash2,
  Crosshair, MapPin, Globe, Briefcase, AlertCircle, Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { CURRENCIES, formatDate } from "@/lib/gaexpay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageUpload, detectGpsAddress } from "./kyc-shared";
import { useTranslation } from "@/hooks/use-translation";

// ---- Static config ---------------------------------------------------------

const COMPANY_TYPES = [
  { id: "llc", label: "LLC — Limited Liability Company" },
  { id: "corporation", label: "Corporation" },
  { id: "partnership", label: "Partnership" },
  { id: "sole_proprietor", label: "Sole Proprietor" },
  { id: "other", label: "Other" },
];

const INDUSTRIES = [
  "Technology", "Financial Services", "Retail / E-commerce", "Healthcare",
  "Education", "Real Estate", "Manufacturing", "Logistics / Transport",
  "Agriculture", "Hospitality / Tourism", "Media / Entertainment",
  "Construction", "Energy / Utilities", "Telecommunications", "Other",
];

const DIRECTOR_ROLES = [
  "CEO", "CFO", "Director", "Secretary", "Managing Director", "Chairman", "Other",
];

const LEGAL_DOCS = [
  {
    type: "certificate_of_incorporation",
    label: "Certificate of Incorporation",
    desc: "Official company registration certificate",
  },
  {
    type: "tax_registration_certificate",
    label: "Tax Registration Certificate",
    desc: "TIN / VAT registration document",
  },
  {
    type: "memorandum_articles",
    label: "Memorandum & Articles of Association",
    desc: "Company constitution / bylaws",
  },
  {
    type: "business_license",
    label: "Business License / Operating Permit",
    desc: "Sector-specific operating license",
  },
];

const WIZARD_STEPS = [
  { id: 0, label: "Company Info", icon: Building2 },
  { id: 1, label: "Legal Documents", icon: FileText },
  { id: 2, label: "Directors", icon: Users },
  { id: 3, label: "Beneficial Owners", icon: UserCheck },
  { id: 4, label: "Review", icon: CheckCircle2 },
];

// ---- Types -----------------------------------------------------------------

interface Director {
  fullName: string;
  idNumber: string;
  role: string;
  dob: string;
  nationality: string;
  idDocument: string;
}

interface BeneficialOwner {
  fullName: string;
  idNumber: string;
  ownershipPercent: string;
  dob: string;
  nationality: string;
  idDocument: string;
}

interface LegalDoc {
  type: string;
  fileName: string;
  dataUrl: string;
}

interface KybStatusResponse {
  accountType: string;
  hasProfile: boolean;
  profile: any | null;
  kybStatus: string;
  kybTier: number;
  kybSubmittedAt: string | null;
  kybVerifiedAt: string | null;
  kybRejectionReason: string | null;
}

// ---- Main view -------------------------------------------------------------

export function KybView() {
  const { t } = useTranslation();
  const { data, reload, loading } = useFetch<KybStatusResponse>("/api/kyb/status");
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({
    companyName: "",
    companyType: "llc",
    registrationNumber: "",
    taxId: "",
    commercialRegistry: "",
    legalAddress: "",
    legalCity: "",
    legalCountry: "Nigeria",
    website: "",
    industry: "Technology",
  });
  const [legalDocs, setLegalDocs] = useState<LegalDoc[]>(
    LEGAL_DOCS.map((d) => ({ type: d.type, fileName: "", dataUrl: "" })),
  );
  const [directors, setDirectors] = useState<Director[]>([
    {
      fullName: "", idNumber: "", role: "CEO",
      dob: "", nationality: "Nigeria", idDocument: "",
    },
  ]);
  const [beneficialOwners, setBeneficialOwners] = useState<BeneficialOwner[]>([]);
  const [submitResult, setSubmitResult] = useState<null | { ok: true; submittedAt: string }>(null);

  // Prefill from existing profile if any
  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setCompany((c) => ({
        companyName: c.companyName || p.companyName || "",
        companyType: c.companyType || p.companyType || "llc",
        registrationNumber: c.registrationNumber || p.registrationNumber || "",
        taxId: c.taxId || p.taxId || "",
        commercialRegistry: c.commercialRegistry || p.commercialRegistry || "",
        legalAddress: c.legalAddress || p.legalAddress || "",
        legalCity: c.legalCity || p.legalCity || "",
        legalCountry: c.legalCountry || p.legalCountry || "Nigeria",
        website: c.website || p.website || "",
        industry: c.industry || p.industry || "Technology",
      }));
      if (Array.isArray(p.directors) && p.directors.length > 0) {
        setDirectors(
          p.directors.map((d: any) => ({
            fullName: d.fullName ?? "",
            idNumber: d.idNumber ?? "",
            role: d.role ?? "Director",
            dob: d.dob ?? "",
            nationality: d.nationality ?? "Nigeria",
            idDocument: d.idDocument ?? "",
          })),
        );
      }
      if (Array.isArray(p.beneficialOwners) && p.beneficialOwners.length > 0) {
        setBeneficialOwners(
          p.beneficialOwners.map((o: any) => ({
            fullName: o.fullName ?? "",
            idNumber: o.idNumber ?? "",
            ownershipPercent: String(o.ownershipPercent ?? ""),
            dob: o.dob ?? "",
            nationality: o.nationality ?? "Nigeria",
            idDocument: o.idDocument ?? "",
          })),
        );
      }
    }
  }, [data]);

  const status = data?.kybStatus ?? "unverified";
  const tier = data?.kybTier ?? 0;
  const isWizardMode =
    submitResult !== null ||
    status === "unverified" ||
    status === "rejected";

  const updateCompany = (patch: Partial<typeof company>) =>
    setCompany((c) => ({ ...c, ...patch }));

  const detectGps = async () => {
    const c = await detectGpsAddress();
    if (!c) {
      toast.error("Could not detect your location. Please enter your address manually.");
      return;
    }
    toast.success(`Location detected: ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`);
    updateCompany({
      legalAddress:
        company.legalAddress ||
        `GPS: ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)} (auto-detected — please refine)`,
    });
  };

  // ---- Director / owner management ----------------------------------------
  const addDirector = () =>
    setDirectors((arr) => [
      ...arr,
      {
        fullName: "", idNumber: "", role: "Director",
        dob: "", nationality: "Nigeria", idDocument: "",
      },
    ]);
  const removeDirector = (i: number) =>
    setDirectors((arr) => arr.filter((_, idx) => idx !== i));
  const updateDirector = (i: number, patch: Partial<Director>) =>
    setDirectors((arr) => arr.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const addOwner = () =>
    setBeneficialOwners((arr) => [
      ...arr,
      {
        fullName: "", idNumber: "", ownershipPercent: "25",
        dob: "", nationality: "Nigeria", idDocument: "",
      },
    ]);
  const removeOwner = (i: number) =>
    setBeneficialOwners((arr) => arr.filter((_, idx) => idx !== i));
  const updateOwner = (i: number, patch: Partial<BeneficialOwner>) =>
    setBeneficialOwners((arr) =>
      arr.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    );

  // ---- Legal docs ----------------------------------------------------------
  const updateLegalDoc = (type: string, patch: Partial<LegalDoc>) =>
    setLegalDocs((arr) =>
      arr.map((d) => (d.type === type ? { ...d, ...patch } : d)),
    );

  // ---- Validation ----------------------------------------------------------
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!company.companyName) return "Company name is required";
      if (!company.registrationNumber) return "Registration number is required";
      if (!company.taxId) return "Tax ID is required";
      if (!company.legalAddress) return "Legal address is required";
      if (!company.legalCity) return "Legal city is required";
      if (!company.legalCountry) return "Legal country is required";
    }
    if (s === 1) {
      for (const d of legalDocs) {
        if (!d.dataUrl) {
          const label = LEGAL_DOCS.find((x) => x.type === d.type)?.label ?? d.type;
          return `${label} is required`;
        }
      }
    }
    if (s === 2) {
      if (directors.length === 0) return "At least one director is required";
      for (const [i, d] of directors.entries()) {
        if (!d.fullName || !d.idNumber || !d.role || !d.dob || !d.nationality) {
          return `Director #${i + 1} is missing required fields`;
        }
      }
    }
    if (s === 3) {
      let total = 0;
      for (const [i, o] of beneficialOwners.entries()) {
        if (!o.fullName || !o.idNumber || !o.dob || !o.nationality) {
          return `Beneficial owner #${i + 1} is missing required fields`;
        }
        const pct = Number(o.ownershipPercent);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          return `Owner #${i + 1} has an invalid ownership percentage`;
        }
        total += pct;
      }
      if (total > 100) {
        return "Total beneficial ownership cannot exceed 100%";
      }
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

  // ---- Submit --------------------------------------------------------------
  const submit = async () => {
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
      const res = await fetch("/api/kyb/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...company,
          documents: legalDocs.map((d) => ({
            type: d.type,
            fileName: d.fileName,
            dataUrl: d.dataUrl,
          })),
          directors,
          beneficialOwners: beneficialOwners.map((o) => ({
            ...o,
            ownershipPercent: Number(o.ownershipPercent),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Submission failed");
      }
      setSubmitResult({ ok: true, submittedAt: new Date().toISOString() });
      toast.success("KYB submitted for review");
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
          <Card className="border-0 bg-gradient-to-br from-violet-600 to-purple-700 p-8 text-center text-white">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-white/20 backdrop-blur">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold">Submission Received!</h2>
            <p className="mt-2 text-white/90">
              We&apos;ll review your business documents within 24-72 hours. You&apos;ll
              receive a notification as soon as your business verification is complete.
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
        <h1 className="text-2xl font-bold tracking-tight">{t("kyb.title")}</h1>
        <p className="text-sm text-muted-foreground">
          Verify your business to unlock team management, invoicing, payroll & higher limits
        </p>
      </div>

      {/* Status banner */}
      <Card
        className={cn(
          "relative overflow-hidden border-0 p-6 text-white",
          status === "verified"
            ? "bg-gradient-to-br from-violet-600 to-purple-700"
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
                <Building2 className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold capitalize">{status}</h2>
                <Badge className="border-0 bg-white/20 text-white">
                  Tier {tier}
                </Badge>
              </div>
              <p className="text-sm text-white/80">
                {status === "verified"
                  ? "Your business is fully verified. All business features unlocked."
                  : status === "pending"
                  ? "Your business documents are under review. This usually takes 24-72 hours."
                  : status === "rejected"
                  ? "Your last submission was rejected. Please review and resubmit."
                  : "Complete verification to unlock all business features."}
              </p>
              {data?.kybRejectionReason && status === "rejected" && (
                <p className="mt-1 text-xs text-white/90">
                  Reason: {data.kybRejectionReason}
                </p>
              )}
              {data?.kybVerifiedAt && status === "verified" && (
                <p className="mt-0.5 text-xs text-white/70">
                  Verified on {formatDate(data.kybVerifiedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {isWizardMode ? (
        <Card className="p-5">
          {/* Wizard header */}
          <div className="mb-6">
            <h3 className="mb-1 font-semibold">Complete Your Business Verification</h3>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step].label}
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
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
                        ? "border-violet-500/30 bg-violet-500/5"
                        : "border-border opacity-60",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                          ? "bg-violet-500 text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-center text-[10px] font-medium leading-tight">
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
              {/* STEP 0: Company info */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Company name</Label>
                      <Input
                        value={company.companyName}
                        onChange={(e) => updateCompany({ companyName: e.target.value })}
                        placeholder="Acme Holdings Ltd."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Company type</Label>
                      <Select
                        value={company.companyType}
                        onValueChange={(v) => updateCompany({ companyType: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_TYPES.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Industry</Label>
                      <Select
                        value={company.industry}
                        onValueChange={(v) => updateCompany({ industry: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((i) => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Registration number</Label>
                      <Input
                        value={company.registrationNumber}
                        onChange={(e) => updateCompany({ registrationNumber: e.target.value })}
                        placeholder="RC-1234567"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tax ID (TIN)</Label>
                      <Input
                        value={company.taxId}
                        onChange={(e) => updateCompany({ taxId: e.target.value })}
                        placeholder="12345678-0001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Commercial registry #</Label>
                      <Input
                        value={company.commercialRegistry}
                        onChange={(e) => updateCompany({ commercialRegistry: e.target.value })}
                        placeholder="CR-2024-001234"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      Legal address
                    </Label>
                    <div className="mt-1 flex gap-2">
                      <Textarea
                        rows={2}
                        value={company.legalAddress}
                        onChange={(e) => updateCompany({ legalAddress: e.target.value })}
                        placeholder="Registered business address…"
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
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={company.legalCity}
                        onChange={(e) => updateCompany({ legalCity: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <Globe className="mr-1 inline h-3 w-3" />
                        Country
                      </Label>
                      <Select
                        value={company.legalCountry}
                        onValueChange={(v) => updateCompany({ legalCountry: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
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
                    <div>
                      <Label className="text-xs">Website (optional)</Label>
                      <Input
                        value={company.website}
                        onChange={(e) => updateCompany({ website: e.target.value })}
                        placeholder="https://example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: Legal documents */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Upload all four mandatory legal documents. Each file must be a JPG or PNG under 2 MB.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {LEGAL_DOCS.map((d) => {
                      const current = legalDocs.find((x) => x.type === d.type);
                      return (
                        <div key={d.type} className="space-y-1">
                          <ImageUpload
                            label={d.label}
                            value={current?.dataUrl ?? ""}
                            onChange={(v) =>
                              updateLegalDoc(d.type, {
                                dataUrl: v,
                                fileName: d.label,
                              })
                            }
                            hint={d.desc}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Directors */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Add all company directors. At least one is required.
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={addDirector}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add director
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {directors.map((d, i) => (
                      <div key={i} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-xs font-semibold">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            Director #{i + 1}
                          </span>
                          {directors.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDirector(i)}
                              className="h-7 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label className="text-[10px]">Full name</Label>
                            <Input
                              value={d.fullName}
                              onChange={(e) => updateDirector(i, { fullName: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">ID number</Label>
                            <Input
                              value={d.idNumber}
                              onChange={(e) => updateDirector(i, { idNumber: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Role</Label>
                            <Select
                              value={d.role}
                              onValueChange={(v) => updateDirector(i, { role: v })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DIRECTOR_ROLES.map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Date of birth</Label>
                            <Input
                              type="date"
                              value={d.dob}
                              onChange={(e) => updateDirector(i, { dob: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Nationality</Label>
                            <Select
                              value={d.nationality}
                              onValueChange={(v) => updateDirector(i, { nationality: v })}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
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
                          <div>
                            <Label className="text-[10px]">ID document (photo)</Label>
                            <ImageUpload
                              label=""
                              value={d.idDocument}
                              onChange={(v) => updateDirector(i, { idDocument: v })}
                              aspect="3/2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: Beneficial owners */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="mb-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <AlertCircle className="mr-1 inline h-3 w-3" />
                      Beneficial owners
                    </p>
                    <p className="text-xs text-amber-700/90 dark:text-amber-400/90">
                      List every individual who directly or indirectly owns 25% or more of the
                      company. If no single owner holds 25%+, leave this section empty.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Total declared:{" "}
                      <span className="font-semibold">
                        {beneficialOwners.reduce(
                          (s, o) => s + (Number(o.ownershipPercent) || 0),
                          0,
                        )}
                        %
                      </span>
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={addOwner}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add owner
                    </Button>
                  </div>
                  {beneficialOwners.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      No beneficial owners added.
                      <br />
                      <span className="text-xs">
                        Click "Add owner" if any individual owns ≥25% of the company.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {beneficialOwners.map((o, i) => (
                        <div key={i} className="rounded-lg border p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs font-semibold">
                              <UserCheck className="h-3.5 w-3.5 text-primary" />
                              Owner #{i + 1}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeOwner(i)}
                              className="h-7 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-[10px]">Full name</Label>
                              <Input
                                value={o.fullName}
                                onChange={(e) => updateOwner(i, { fullName: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">ID number</Label>
                              <Input
                                value={o.idNumber}
                                onChange={(e) => updateOwner(i, { idNumber: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Ownership %</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={o.ownershipPercent}
                                onChange={(e) => updateOwner(i, { ownershipPercent: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Date of birth</Label>
                              <Input
                                type="date"
                                value={o.dob}
                                onChange={(e) => updateOwner(i, { dob: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px]">Nationality</Label>
                              <Select
                                value={o.nationality}
                                onValueChange={(v) => updateOwner(i, { nationality: v })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
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
                            <div>
                              <Label className="text-[10px]">ID document (photo)</Label>
                              <ImageUpload
                                label=""
                                value={o.idDocument}
                                onChange={(v) => updateOwner(i, { idDocument: v })}
                                aspect="3/2"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="h-4 w-4 text-primary" /> Company Info
                    </h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd>{company.companyName}</dd>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd>{COMPANY_TYPES.find((t) => t.id === company.companyType)?.label}</dd>
                      <dt className="text-muted-foreground">Registration #</dt>
                      <dd>{company.registrationNumber}</dd>
                      <dt className="text-muted-foreground">Tax ID</dt>
                      <dd>{company.taxId}</dd>
                      <dt className="text-muted-foreground">Industry</dt>
                      <dd>{company.industry}</dd>
                      <dt className="text-muted-foreground">Address</dt>
                      <dd className="truncate">{company.legalAddress}, {company.legalCity}, {company.legalCountry}</dd>
                      <dt className="text-muted-foreground">Website</dt>
                      <dd>{company.website || "—"}</dd>
                    </dl>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-primary" /> Legal Documents
                    </h4>
                    <ul className="space-y-1 text-xs">
                      {legalDocs.map((d) => {
                        const label = LEGAL_DOCS.find((x) => x.type === d.type)?.label;
                        return (
                          <li key={d.type} className="flex items-center gap-2">
                            {d.dataUrl ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            <span>{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4 text-primary" /> Directors ({directors.length})
                    </h4>
                    <ul className="space-y-1 text-xs">
                      {directors.map((d, i) => (
                        <li key={i}>
                          {i + 1}. <span className="font-medium">{d.fullName || "—"}</span>
                          <span className="text-muted-foreground"> · {d.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {beneficialOwners.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <UserCheck className="h-4 w-4 text-primary" />
                        Beneficial Owners ({beneficialOwners.length})
                      </h4>
                      <ul className="space-y-1 text-xs">
                        {beneficialOwners.map((o, i) => (
                          <li key={i}>
                            {i + 1}. <span className="font-medium">{o.fullName}</span>
                            <span className="text-muted-foreground"> · {o.ownershipPercent}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                    <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    By submitting, you confirm the information is accurate. Your documents will
                    be reviewed within 24-72 hours.
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
        // ---- Already submitted — show profile summary ----
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Business Profile</h3>
            <Badge variant="outline" className={cn(
              status === "verified" && "border-violet-500/40 text-violet-600",
              status === "pending" && "border-amber-500/40 text-amber-600",
              status === "rejected" && "border-rose-500/40 text-rose-600",
            )}>
              {status === "verified" ? (
                <Award className="mr-1 h-3 w-3" />
              ) : status === "pending" ? (
                <Clock className="mr-1 h-3 w-3" />
              ) : (
                <Briefcase className="mr-1 h-3 w-3" />
              )}
              {status}
            </Badge>
          </div>
          {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
          {data?.profile && (
            <dl className="mt-4 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
              <dt className="text-muted-foreground">Company name</dt>
              <dd className="font-medium">{data.profile.companyName}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="capitalize">{data.profile.companyType?.replace(/_/g, " ") || "—"}</dd>
              <dt className="text-muted-foreground">Industry</dt>
              <dd>{data.profile.industry || "—"}</dd>
              <dt className="text-muted-foreground">Country</dt>
              <dd>{data.profile.legalCountry || "—"}</dd>
              <dt className="text-muted-foreground">Directors</dt>
              <dd>{Array.isArray(data.profile.directors) ? data.profile.directors.length : 0}</dd>
              <dt className="text-muted-foreground">Beneficial owners</dt>
              <dd>{Array.isArray(data.profile.beneficialOwners) ? data.profile.beneficialOwners.length : 0}</dd>
              {data.kybSubmittedAt && (
                <>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd>{formatDate(data.kybSubmittedAt)}</dd>
                </>
              )}
            </dl>
          )}
        </Card>
      )}

      {/* Compliance badges */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "AML Compliant", desc: "Anti-Money Laundering checks" },
          { icon: Briefcase, title: "Corporate Verified", desc: "Business entity verification" },
          { icon: Globe, title: "ISO 27001", desc: "Information security mgmt" },
        ].map((b) => {
          const Icon = b.icon;
          return (
            <Card key={b.title} className="flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-500">
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
