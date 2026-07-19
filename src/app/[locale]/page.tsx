"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/gaexpay/app-shell";
import { Landing } from "@/components/gaexpay/landing";
import { AuthModal } from "@/components/gaexpay/auth-modal";
import { setAuthed } from "@/lib/auth-client";

type AuthState = "loading" | "guest" | "authed";
type AuthMode = "login" | "signup";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  useEffect(() => {
    setMounted(true);
    // Confirm auth state against the server — the cookie is httpOnly so we
    // cannot read it from JS. /api/auth/me has NO dev fallback, so this is
    // the real source of truth.
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setAuthed();
          setAuthState("authed");
        } else {
          setAuthState("guest");
        }
      })
      .catch(() => setAuthState("guest"));
  }, []);

  // Render nothing during SSR + initial hydration check — avoids flashes of
  // the wrong state and prevents hydration mismatches from browser extensions.
  if (!mounted || authState === "loading") return null;

  if (authState === "authed") return <AppShell />;

  return (
    <>
      <Landing
        onEnter={() => setAuthMode("login")}
        onSignup={() => setAuthMode("signup")}
      />
      <AuthModal
        open={authMode !== null}
        mode={authMode ?? "login"}
        onClose={() => setAuthMode(null)}
        onSuccess={() => {
          setAuthMode(null);
          setAuthState("authed");
          setAuthed();
        }}
      />
    </>
  );
}
