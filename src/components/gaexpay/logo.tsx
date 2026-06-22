"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * GaexPay Logo — premium animated brand mark.
 *
 * The icon is a stylized "G" combined with a payment-arrow motif:
 *   • The "G" arc (270°) symbolizes the wallet / circle of money.
 *   • The horizontal bar + chevron on the right edge turns the G's spine
 *     into an arrow pointing right → payment / transfer direction.
 *   • A small inner dot represents closure / settled balance.
 *
 * Fill: emerald → teal → cyan linear gradient (vivid on light + dark).
 *
 * Animation layers (toggled via `animated` prop):
 *   • gxp-gradient-animate — the background gradient slowly cycles hue.
 *   • gxp-glow             — outer emerald box-shadow breathes.
 *   • gxp-shimmer          — a soft white highlight sweeps across every 3.5s.
 *
 * Static contexts (print, favicon export) pass `animated={false}`.
 *
 * Crispness: built on a 40×40 viewBox, scales cleanly from 16px (favicon)
 * to 128px+ (hero) because everything is vector geometry.
 */

export interface LogoProps {
  className?: string;
  /** Icon edge length in px. Default 32. */
  size?: number;
  /** Whether to render the "GaexPay" wordmark next to the icon. Default true. */
  showText?: boolean;
  /** Whether shimmer / glow / gradient animations run. Default true. */
  animated?: boolean;
  /** Scale the wordmark relative to the icon. Default 1. */
  textScale?: number;
}

export function Logo({
  className,
  size = 32,
  showText = true,
  animated = true,
  textScale = 1,
}: LogoProps) {
  // The internal viewBox is 40×40. Stroke widths are tuned for that grid
  // so the mark stays crisp at every render size.
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <LogoMark size={size} animated={animated} />
      {showText && (
        <span
          className="font-bold tracking-tight text-foreground"
          style={{ fontSize: `${(size * 0.56) * textScale}px`, lineHeight: 1 }}
          suppressHydrationWarning
        >
          Gaex<span className="text-primary" suppressHydrationWarning>Pay</span>
        </span>
      )}
    </div>
  );
}

/**
 * Just the icon mark (no wordmark). Useful for favicons, app icons,
 * avatars and anywhere space is tight.
 */
export function LogoMark({
  size = 32,
  animated = true,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  // Unique ID per instance so multiple logos on the same page don't collide
  // on their in-SVG gradient definitions.
  const reactId = useId();
  const gradId = `gxp-stroke-${reactId.replace(/[:]/g, "")}`;
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center rounded-[28%] shrink-0 overflow-hidden",
        animated && "gxp-glow gxp-gradient-animate",
        className,
      )}
      style={{
        width: size,
        height: size,
        // The gradient is expressed as a CSS background so the
        // gxp-gradient-animate keyframe (which animates background-position)
        // can shift it. The SVG inside paints the mark on top.
        backgroundImage:
          "linear-gradient(135deg, #34d399 0%, #10b981 45%, #14b8a6 70%, #06b6d4 100%)",
      }}
      aria-hidden="true"
    >
      {/* Subtle top sheen for depth — gives the mark a glassy premium feel */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[28%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0))",
        }}
      />

      {/* The G + arrow mark, vector so it scales perfectly */}
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        fill="none"
        className="relative"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ecfeff" />
          </linearGradient>
        </defs>

        {/* G arc — 270° from top sweeping CCW to the right edge */}
        <path
          d="M 21 11 A 10 10 0 1 0 29 20"
          stroke={`url(#${gradId})`}
          strokeWidth="2.9"
          strokeLinecap="round"
          fill="none"
        />

        {/* G horizontal bar — the inner spine of the G */}
        <path
          d="M 29 20 L 21 20"
          stroke={`url(#${gradId})`}
          strokeWidth="2.9"
          strokeLinecap="round"
          fill="none"
        />

        {/* Arrow chevron — sits at the right edge, pointing right,
            representing payment / money-flow direction */}
        <path
          d="M 26.5 16.5 L 30 20 L 26.5 23.5"
          stroke={`url(#${gradId})`}
          strokeWidth="2.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Center dot — closure, "settled" feeling */}
        <circle cx="20" cy="20" r="1.35" fill="#ffffff" />
      </svg>

      {/* Shimmer sweep — light highlight crossing the mark every 3.5s */}
      {animated && <span className="gxp-shimmer-overlay" aria-hidden="true" />}
    </span>
  );
}

export default Logo;
