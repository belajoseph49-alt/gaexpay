"use client";

import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Renders a number that counts up from 0 to `value` with tabular numerals.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1200,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const animated = useCountUp(value, duration, decimals);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(animated);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
