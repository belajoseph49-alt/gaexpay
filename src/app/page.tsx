"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/gaexpay/app-shell";
import { Landing } from "@/components/gaexpay/landing";

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Only render after client mount to avoid SSR hydration mismatches
  // caused by browser extensions (translation, ad-blockers, etc.)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("gxp_entered")) {
      setEntered(true);
    }
  }, []);

  // Show a minimal loading state during SSR and before client mount
  if (!mounted) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex items-center gap-2">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl shadow-lg"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 158), oklch(0.6 0.16 175))" }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path
                d="M4 7.5C4 6.12 5.12 5 6.5 5h8.8c1.1 0 2 .9 2 2v.5c0 1.1-.9 2-2 2H8.5C7.12 9.5 6 10.62 6 12s1.12 2.5 2.5 2.5h6.8c1.1 0 2 .9 2 2v.5c0 1.1-.9 2-2 2H6.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18.5" cy="12" r="1.4" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            Gaex<span className="text-primary">Pay</span>
          </span>
        </div>
      </div>
    );
  }

  if (!entered) {
    return <Landing onEnter={() => { sessionStorage.setItem("gxp_entered", "1"); setEntered(true); }} />;
  }

  return <AppShell />;
}
