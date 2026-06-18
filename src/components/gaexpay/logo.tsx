"use client";

import { cn } from "@/lib/utils";

export function Logo({ className, size = 32, showText = true }: { className?: string; size?: number; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative grid place-items-center rounded-xl shadow-lg shrink-0"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, oklch(0.72 0.17 158), oklch(0.6 0.16 175))",
        }}
      >
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
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
      {showText && (
        <span className="text-lg font-bold tracking-tight">
          Gaex<span className="text-primary">Pay</span>
        </span>
      )}
    </div>
  );
}
