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

  // Return null during SSR — the page will be entirely client-rendered
  // This prevents ALL hydration mismatches from browser extensions
  if (!mounted) {
    return null;
  }

  if (!entered) {
    return <Landing onEnter={() => { sessionStorage.setItem("gxp_entered", "1"); setEntered(true); }} />;
  }

  return <AppShell />;
}
