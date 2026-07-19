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
          "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 45%, #6D28D9 70%, #5B21B6 100%)",
      }}
      aria-hidden="true"
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[28%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0))",
        }}
      />

      {/* Modern, premium abstract G & Forward Arrow SVG */}
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        fill="none"
        className="relative"
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id={`${gradId}-1`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d8b4fe" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={`${gradId}-2`} x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Outer continuous ribbon for 'G' */}
        <path
          d="M 28.5 14.5 C 28.5 10 24 8 20 8 C 13.373 8 8 13.373 8 20 C 8 26.627 13.373 32 20 32 C 25.5 32 29 28.5 30 23.5"
          stroke={`url(#${gradId}-1)`}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
          className="drop-shadow-sm"
        />

        {/* Inner intersecting 'Forward/Transfer' arrow */}
        <path
          d="M 14 20 L 22 20 L 27 14"
          stroke={`url(#${gradId}-2)`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Central accent dot */}
        <circle cx="27" cy="23.5" r="1.8" fill="#ffffff" className="drop-shadow-sm" />
      </svg>

      {/* Shimmer sweep — light highlight crossing the mark every 3.5s */}
      {animated && <span className="gxp-shimmer-overlay" aria-hidden="true" />}
    </span>
  );
}

export default Logo;
