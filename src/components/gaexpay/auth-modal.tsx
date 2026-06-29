"use client";

/**
 * src/components/gaexpay/auth-modal.tsx
 *
 * Combined Sign In / Create Account modal with:
 *   - Account type selector (personal | business) — two large selectable cards
 *   - Password strength meter (4-segment weak/fair/good/strong)
 *   - Show/hide password toggle
 *   - Forgot password flow (email → token → reset)
 *   - "Try Demo Account" button (calls /api/auth/demo)
 *
 * Mobile-first: full-screen on mobile, centered dialog on desktop.
 * Framer Motion animates the gradient header + tab transitions.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  User, Building2, Mail, Lock, Phone, Eye, EyeOff, Shield,
  ArrowRight, Sparkles, Loader2, BadgeCheck, Globe2,
} from "lucide-react";

import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Logo } from "./logo";
import { setAuthed } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";
type AccountType = "personal" | "business";
type Flow = "auth" | "forgot" | "reset";
type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

interface AuthModalProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSuccess: () => void;
}

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------
function evalStrength(pw: string): Strength {
  if (!pw) return { score: 0, label: "—" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}

const STRENGTH_COLORS = [
  "bg-muted",
  "bg-red-500",
  "bg-amber-500",
  "bg-yellow-400",
  "bg-violet-500",
];
const STRENGTH_TEXT = [
  "text-muted-foreground",
  "text-red-500",
  "text-amber-500",
  "text-yellow-500",
  "text-violet-500",
];

// ---------------------------------------------------------------------------
// Account type selector card
// ---------------------------------------------------------------------------
function AccountTypeCard({
  selected, onClick, icon: Icon, title, subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: typeof User;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-1 flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-200",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border bg-background hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg transition-colors",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{subtitle}</div>
      </div>
      {selected && (
        <motion.div
          layoutId="account-type-check"
          className="absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Field component
// ---------------------------------------------------------------------------
function Field({
  label, icon: Icon, ...props
}: { label: string; icon: typeof User } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          {...props}
          className="h-11 rounded-lg pl-9 text-sm"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
export function AuthModal({ open, mode, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<Mode>(mode);
  const [flow, setFlow] = useState<Flow>("auth");

  // Signup state
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot/reset state
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Sync tab when `mode` prop changes (e.g. user clicked "Sign in" vs "Get Started")
  useEffect(() => {
    if (open) {
      setTab(mode);
      setFlow("auth");
      setForgotSent(false);
      setResetDone(false);
    }
  }, [open, mode]);

  const strength = useMemo(() => evalStrength(password), [password]);

  // -------------------------------------------------------------------------
  // Submit handlers
  // -------------------------------------------------------------------------
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!firstName.trim() || !lastName.trim()) return toast.error("Please enter your name");
    if (!EMAIL_RE.test(email)) return toast.error("Please enter a valid email");
    if (phone.replace(/\D/g, "").length < 7) return toast.error("Please enter a valid phone number");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return toast.error("Password must contain a letter and a number");
    }
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    if (accountType === "business" && companyName.trim().length < 2) {
      return toast.error("Please enter your company name");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName, lastName, email, phone, password,
          country: country || undefined,
          accountType,
          companyName: accountType === "business" ? companyName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Signup failed");
      setAuthed();
      toast.success(`Welcome to GaexPay, ${firstName}! 🎉`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!EMAIL_RE.test(loginEmail)) return toast.error("Please enter a valid email");
    if (!loginPassword) return toast.error("Please enter your password");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Login failed");
      setAuthed();
      toast.success(`Welcome back, ${data?.user?.firstName ?? "friend"}!`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Demo login failed");
      setAuthed();
      toast.success("Signed in as demo user");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!EMAIL_RE.test(forgotEmail)) return toast.error("Please enter a valid email");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setForgotSent(true);
      // Dev convenience: pre-fill the reset-token field so the tester can move
      // straight to the reset step without manually copying.
      if (data?.devResetToken) {
        setResetToken(data.devResetToken);
        toast.info("Dev mode: reset token auto-filled");
      } else {
        toast.success("If the email exists, a reset link has been sent.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!resetToken) return toast.error("Reset token is required");
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return toast.error("Password must contain a letter and a number");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      setResetDone(true);
      toast.success("Password reset. Please log in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl [&>button]:top-3 [&>button]:right-3 [&>button]:z-30"
      >
        <DialogTitle className="sr-only">
          {flow === "forgot" ? "Reset password" : flow === "reset" ? "Set new password" : tab === "login" ? "Sign in to GaexPay" : "Create your GaexPay account"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          GaexPay authentication — sign in or create a personal / business account.
        </DialogDescription>

        {/* Gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-6 pb-5 pt-6 text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-purple-300/30 blur-2xl" />
          </div>
          <div className="relative flex items-center justify-between">
            <Logo size={28} className="text-white [&_span]:text-white" />
            <div className="hidden items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium backdrop-blur sm:flex">
              <Shield className="h-3 w-3" /> Bank-grade security
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={flow + tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative mt-4"
            >
              <h2 className="text-xl font-bold leading-tight">
                {flow === "forgot"
                  ? "Forgot password?"
                  : flow === "reset"
                    ? "Set a new password"
                    : tab === "login"
                      ? "Welcome back"
                      : "Create your account"}
              </h2>
              <p className="mt-1 text-xs text-white/80">
                {flow === "forgot"
                  ? "Enter your email and we'll send you a reset link."
                  : flow === "reset"
                    ? "Enter your reset token and a new password."
                    : tab === "login"
                      ? "Sign in to access your wallets, cards and transfers."
                      : "Join 50K+ users banking borderless on Africa."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {/* ---------- FORGOT / RESET flows ---------- */}
          {flow === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              {!forgotSent ? (
                <>
                  <Field
                    label="Email address"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Send reset link
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <div>
                      <p className="font-medium text-foreground">Check your inbox</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        If an account exists for <span className="font-medium">{forgotEmail}</span>, a reset link has been sent.
                        The link expires in 1 hour.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setFlow("auth"); setForgotSent(false); }}
                className="w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {flow === "reset" && (
            <form onSubmit={handleReset} className="space-y-4">
              {!resetDone ? (
                <>
                  <Field
                    label="Reset token"
                    icon={Lock}
                    placeholder="Paste your reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">New password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 rounded-lg pl-9 pr-9 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Reset password
                  </Button>
                </>
              ) : (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    <div>
                      <p className="font-medium text-foreground">Password reset</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Your password has been updated. Please log in with your new password.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => { setFlow("auth"); setResetDone(false); setTab("login"); }}
                className="w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ---------- AUTH (login + signup tabs) ---------- */}
          {flow === "auth" && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as Mode)} className="w-full">
              <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg">
                <TabsTrigger value="login" className="rounded-md text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-md text-sm">Create Account</TabsTrigger>
              </TabsList>

              {/* ---------------- SIGN IN ---------------- */}
              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setFlow("forgot"); setForgotEmail(loginEmail); }}
                        className="text-[11px] font-medium text-primary transition hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="h-11 rounded-lg pl-9 pr-9 text-sm"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sign In <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>

                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-background px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        or
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDemo}
                    disabled={loading}
                    className="h-11 w-full rounded-lg"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                    Try Demo Account
                  </Button>
                </form>
              </TabsContent>

              {/* ---------------- SIGN UP ---------------- */}
              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Account type selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Account type</Label>
                    <div className="flex gap-2.5">
                      <AccountTypeCard
                        selected={accountType === "personal"}
                        onClick={() => setAccountType("personal")}
                        icon={User}
                        title="Compte Personnel"
                        subtitle="For individuals — send, save, spend."
                      />
                      <AccountTypeCard
                        selected={accountType === "business"}
                        onClick={() => setAccountType("business")}
                        icon={Building2}
                        title="Compte Entreprise"
                        subtitle="For businesses — payouts, KYB, team."
                      />
                    </div>
                  </div>

                  {/* Business-only field */}
                  <AnimatePresence initial={false}>
                    {accountType === "business" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Field
                          label="Company name"
                          icon={Building2}
                          placeholder="Acme Inc."
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Names */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="First name"
                      icon={User}
                      placeholder="Adaeze"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                    <Field
                      label="Last name"
                      icon={User}
                      placeholder="Okonkwo"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Contact */}
                  <Field
                    label="Email"
                    icon={Mail}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Phone"
                      icon={Phone}
                      type="tel"
                      autoComplete="tel"
                      placeholder="+234 800 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <Field
                      label="Country (optional)"
                      icon={Globe2}
                      placeholder="Nigeria"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>

                  {/* Password + strength meter */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 rounded-lg pl-9 pr-9 text-sm"
                        placeholder="Min. 8 chars, letter + number"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {password && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex flex-1 gap-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                i <= strength.score ? STRENGTH_COLORS[strength.score] : "bg-muted",
                              )}
                            />
                          ))}
                        </div>
                        <span className={cn("text-[10px] font-medium", STRENGTH_TEXT[strength.score])}>
                          {strength.label}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Confirm password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 rounded-lg pl-9 pr-9 text-sm"
                        placeholder="Re-enter your password"
                        required
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-[10px] text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Account <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Bank-grade security</span>
                    <span className="flex items-center gap-1"><BadgeCheck className="h-3 w-3" /> 50K+ users</span>
                    <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Regulated</span>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
