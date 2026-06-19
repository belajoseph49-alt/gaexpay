"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/gaexpay/app-shell";
import { Landing } from "@/components/gaexpay/landing";

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && sessionStorage.getItem("gxp_entered")) {
      setEntered(true);
    }
  }, []);

  // During SSR and before mount: render ONLY the SVG logo (no text)
  // Text nodes are what browser extensions modify, causing hydration errors
  if (!mounted) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div
          className="grid h-12 w-12 place-items-center rounded-xl shadow-lg animate-pulse"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.17 158), oklch(0.6 0.16 175))" }}
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
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
      </div>
    );
  }

  if (!entered) {
    return <Landing onEnter={() => { sessionStorage.setItem("gxp_entered", "1"); setEntered(true); }} />;
  }

  return <AppShell />;
}
