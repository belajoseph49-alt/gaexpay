"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight client-side QR code renderer.
 *
 * Uses the `qrcode` library (browser build) to render a QR code as an SVG
 * data URL. Falls back to a placeholder if the library fails to load.
 */
export function QrCode({
  value,
  size = 200,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QR = await import("qrcode");
        const url = await QR.toDataURL(value, {
          width: size,
          margin: 1,
          color: { dark: "#1e1b4b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: "#e9e5ff", borderRadius: 8 }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR code"
      width={size}
      height={size}
      className={className}
    />
  );
}
