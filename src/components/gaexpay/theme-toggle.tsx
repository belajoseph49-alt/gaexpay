"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Theme toggle.
 *
 * - **Mobile** (`sm:hidden`): a single icon button that flips between light and
 *   dark. No dropdown, no "System" option — the smallest screens get the
 *   simplest possible control. The icon is always Sun (in dark) or Moon (in
 *   light), never the desktop "Monitor" icon.
 *
 * - **Desktop** (`hidden sm:flex`): the full dropdown with Light / Dark /
 *   System options.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // The visual theme that's actually applied (resolves "system" → light|dark).
  const visual = mounted ? (resolvedTheme ?? theme) : undefined;

  return (
    <>
      {/* ── Mobile: simple Sun/Moon toggle ─────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden h-9 w-9 rounded-xl"
        onClick={() => setTheme(visual === "dark" ? "light" : "dark")}
        aria-label={visual === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      >
        {!mounted ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : visual === "dark" ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )}
      </Button>

      {/* ── Desktop: full dropdown ─────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex h-9 w-9 rounded-xl"
            aria-label="Theme"
          >
            {!mounted ? (
              <Monitor className="h-[18px] w-[18px]" />
            ) : theme === "dark" ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : theme === "light" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Monitor className="h-[18px] w-[18px]" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => setTheme("light")}>
            <Sun className="h-4 w-4 mr-2" /> Light
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => setTheme("dark")}>
            <Moon className="h-4 w-4 mr-2" /> Dark
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer rounded-lg" onClick={() => setTheme("system")}>
            <Monitor className="h-4 w-4 mr-2" /> System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
