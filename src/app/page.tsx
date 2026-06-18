"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/gaexpay/app-shell";
import { Landing } from "@/components/gaexpay/landing";

export default function Home() {
  const [entered, setEntered] = useState(false);

  // Auto-restore session if previously entered
  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("gxp_entered")) {
      setEntered(true);
    }
  }, []);

  if (!entered) {
    return <Landing onEnter={() => { sessionStorage.setItem("gxp_entered", "1"); setEntered(true); }} />;
  }

  return <AppShell />;
}
