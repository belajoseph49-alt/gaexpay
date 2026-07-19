// @ts-nocheck
/**
 * GaexPay — PWA Icon Generator
 *
 * Generates PNG icons at multiple sizes from an inline SVG (emerald gradient
 * background + white GaexPay "G" logo path). Uses the `sharp` package.
 *
 * Output:
 *   public/icon-192.png          (192x192, maskable + any)
 *   public/icon-512.png          (512x512, maskable + any)
 *   public/apple-touch-icon.png  (180x180, iOS home screen)
 *   public/favicon-32.png        (32x32, browser tab)
 *   public/screenshot-wide.png   (1280x720, desktop install card)
 *   public/screenshot-narrow.png (720x1280, mobile install card)
 *
 * Run with:
 *   bun run scripts/generate-icons.ts
 */

import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PUBLIC_DIR = path.resolve(import.meta.dir, "..", "public");

// --- Brand SVG definitions --------------------------------------------------

// The GaexPay "G" mark — matches the inline SVG used in src/components/gaexpay/logo.tsx
// so install icons are visually consistent with the in-app brand.
const GAEXPAY_G_PATH =
  "M4 7.5C4 6.12 5.12 5 6.5 5h8.8c1.1 0 2 .9 2 2v.5c0 1.1-.9 2-2 2H8.5C7.12 9.5 6 10.62 6 12s1.12 2.5 2.5 2.5h6.8c1.1 0 2 .9 2 2v.5c0 1.1-.9 2-2 2H6.5";
const GAEXPAY_DOT_CX = 18.5;
const GAEXPAY_DOT_CY = 12;
const GAEXPAY_DOT_R = 1.4;

// Emerald gradient with full-bleed background and inner logo. The viewBox is
// 512x512 so we can render at any size without re-rasterizing vectors.
const ICON_SVG = (size = 512) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="55%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.10"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${size * 0.012}"/>
      <feOffset dx="0" dy="${size * 0.012}" result="off"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" fill="url(#sheen)"/>

  <!-- Subtle dark base ring for depth -->
  <rect x="${size * 0.5}" y="${size * 0.5}" width="${size - 1}" height="${size - 1}" fill="none" stroke="#022c22" stroke-opacity="0.25" stroke-width="1"/>

  <!-- Logo group, scaled into a centered safe zone (~70% of canvas) -->
  <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${(size * 0.7) / 24})" filter="url(#softShadow)">
    <path d="${GAEXPAY_G_PATH}"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"/>
    <circle cx="${GAEXPAY_DOT_CX}" cy="${GAEXPAY_DOT_CY}" r="${GAEXPAY_DOT_R}" fill="white"/>
  </g>
</svg>
`.trim();

// Apple touch icon — opaque (no alpha), no transparency, full-bleed brand color.
const APPLE_TOUCH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  <g transform="translate(27, 27) scale(${(180 - 54) / 24})">
    <path d="${GAEXPAY_G_PATH}"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"/>
    <circle cx="${GAEXPAY_DOT_CX}" cy="${GAEXPAY_DOT_CY}" r="${GAEXPAY_DOT_R}" fill="white"/>
  </g>
</svg>
`.trim();

// Favicon 32 — simplified (no shadow filter, brighter accent for tiny sizes).
const FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#bg)"/>
  <g transform="translate(5, 5) scale(${22 / 24})">
    <path d="${GAEXPAY_G_PATH}"
          stroke="white"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"/>
    <circle cx="${GAEXPAY_DOT_CX}" cy="${GAEXPAY_DOT_CY}" r="${GAEXPAY_DOT_R + 0.3}" fill="white"/>
  </g>
</svg>
`.trim();

// --- Wide screenshot (1280x720) — desktop install card -----------------------
const WIDE_SCREENSHOT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f0d"/>
      <stop offset="60%" stop-color="#0b1f1a"/>
      <stop offset="100%" stop-color="#0a0f0d"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="18%" r="55%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>

  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#glow)"/>

  <!-- Logo -->
  <g transform="translate(96, 96)">
    <rect width="64" height="64" rx="14" fill="url(#accent)"/>
    <g transform="translate(13, 13) scale(${(64 - 26) / 24})">
      <path d="${GAEXPAY_G_PATH}" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="${GAEXPAY_DOT_CX}" cy="${GAEXPAY_DOT_CY}" r="${GAEXPAY_DOT_R}" fill="white"/>
    </g>
    <text x="84" y="42" font-family="Geist, Inter, system-ui, sans-serif" font-size="32" font-weight="700" fill="#f8fafc">GaexPay</text>
  </g>

  <!-- Hero text -->
  <text x="96" y="320" font-family="Geist, Inter, system-ui, sans-serif" font-size="68" font-weight="700" fill="#f8fafc">Borderless money,</text>
  <text x="96" y="396" font-family="Geist, Inter, system-ui, sans-serif" font-size="68" font-weight="700" fill="url(#accent)">built for everyone.</text>
  <text x="96" y="448" font-family="Geist, Inter, system-ui, sans-serif" font-size="22" fill="#94a3b8">Send, spend, save &amp; exchange across 9+ currencies — crypto, mobile money, cards &amp; QR.</text>

  <!-- Card preview -->
  <g transform="translate(800, 240)">
    <rect width="384" height="240" rx="20" fill="#052e23" stroke="#10b981" stroke-opacity="0.25" stroke-width="1"/>
    <text x="28" y="48" font-family="Geist, Inter, system-ui, sans-serif" font-size="14" fill="#6ee7b7" letter-spacing="2">TOTAL BALANCE</text>
    <text x="28" y="92" font-family="Geist, Inter, system-ui, sans-serif" font-size="40" font-weight="700" fill="#f8fafc">₦ 4,820,150.00</text>
    <text x="28" y="124" font-family="Geist, Inter, system-ui, sans-serif" font-size="14" fill="#94a3b8">≈ $3,140.52 USD</text>
    <rect x="28" y="160" width="160" height="44" rx="10" fill="#10b981"/>
    <text x="108" y="188" font-family="Geist, Inter, system-ui, sans-serif" font-size="16" font-weight="600" fill="#022c22" text-anchor="middle">Send Money</text>
    <rect x="196" y="160" width="160" height="44" rx="10" fill="#ffffff" fill-opacity="0.08"/>
    <text x="276" y="188" font-family="Geist, Inter, system-ui, sans-serif" font-size="16" font-weight="600" fill="#f8fafc" text-anchor="middle">Request</text>
  </g>

  <text x="96" y="640" font-family="Geist, Inter, system-ui, sans-serif" font-size="16" fill="#475569">Installable on Web · iOS · Android · Windows · macOS · Linux</text>
</svg>
`.trim();

// --- Narrow screenshot (720x1280) — mobile install card ----------------------
const NARROW_SCREENSHOT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0f0d"/>
      <stop offset="60%" stop-color="#0b1f1a"/>
      <stop offset="100%" stop-color="#0a0f0d"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="14%" r="70%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>

  <rect width="720" height="1280" fill="url(#bg)"/>
  <rect width="720" height="1280" fill="url(#glow)"/>

  <!-- Header -->
  <g transform="translate(56, 80)">
    <rect width="56" height="56" rx="12" fill="url(#accent)"/>
    <g transform="translate(11, 11) scale(${(56 - 22) / 24})">
      <path d="${GAEXPAY_G_PATH}" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle cx="${GAEXPAY_DOT_CX}" cy="${GAEXPAY_DOT_CY}" r="${GAEXPAY_DOT_R}" fill="white"/>
    </g>
    <text x="72" y="38" font-family="Geist, Inter, system-ui, sans-serif" font-size="28" font-weight="700" fill="#f8fafc">GaexPay</text>
  </g>

  <!-- Hero -->
  <text x="56" y="240" font-family="Geist, Inter, system-ui, sans-serif" font-size="56" font-weight="700" fill="#f8fafc">Borderless</text>
  <text x="56" y="304" font-family="Geist, Inter, system-ui, sans-serif" font-size="56" font-weight="700" fill="url(#accent)">digital wallet.</text>
  <text x="56" y="364" font-family="Geist, Inter, system-ui, sans-serif" font-size="20" fill="#94a3b8">Crypto, mobile money, cards &amp; QR — all in one.</text>

  <!-- Balance card -->
  <g transform="translate(56, 440)">
    <rect width="608" height="280" rx="24" fill="#052e23" stroke="#10b981" stroke-opacity="0.25" stroke-width="1"/>
    <text x="32" y="56" font-family="Geist, Inter, system-ui, sans-serif" font-size="16" fill="#6ee7b7" letter-spacing="2">TOTAL BALANCE</text>
    <text x="32" y="108" font-family="Geist, Inter, system-ui, sans-serif" font-size="48" font-weight="700" fill="#f8fafc">₦ 4,820,150</text>
    <text x="32" y="148" font-family="Geist, Inter, system-ui, sans-serif" font-size="16" fill="#94a3b8">≈ $3,140.52 USD</text>
    <rect x="32" y="184" width="272" height="56" rx="12" fill="#10b981"/>
    <text x="168" y="220" font-family="Geist, Inter, system-ui, sans-serif" font-size="18" font-weight="600" fill="#022c22" text-anchor="middle">Send</text>
    <rect x="320" y="184" width="256" height="56" rx="12" fill="#ffffff" fill-opacity="0.08"/>
    <text x="448" y="220" font-family="Geist, Inter, system-ui, sans-serif" font-size="18" font-weight="600" fill="#f8fafc" text-anchor="middle">Request</text>
  </g>

  <!-- Quick actions -->
  <g transform="translate(56, 760)">
    <rect width="140" height="140" rx="20" fill="#ffffff" fill-opacity="0.04"/>
    <rect x="40" y="44" width="60" height="60" rx="14" fill="#10b981" fill-opacity="0.15"/>
    <text x="70" y="80" font-family="Geist, Inter, system-ui, sans-serif" font-size="28" fill="#34d399" text-anchor="middle">↗</text>
    <text x="70" y="120" font-family="Geist, Inter, system-ui, sans-serif" font-size="14" fill="#f8fafc" text-anchor="middle">Send</text>

    <rect x="156" width="140" height="140" rx="20" fill="#ffffff" fill-opacity="0.04"/>
    <rect x="196" y="44" width="60" height="60" rx="14" fill="#10b981" fill-opacity="0.15"/>
    <text x="226" y="80" font-family="Geist, Inter, system-ui, sans-serif" font-size="26" fill="#34d399" text-anchor="middle">⬇</text>
    <text x="226" y="120" font-family="Geist, Inter, system-ui, sans-serif" font-size="14" fill="#f8fafc" text-anchor="middle">Request</text>

    <rect x="312" width="140" height="140" rx="20" fill="#ffffff" fill-opacity="0.04"/>
    <rect x="352" y="44" width="60" height="60" rx="14" fill="#10b981" fill-opacity="0.15"/>
    <text x="382" y="80" font-family="Geist, Inter, system-ui, sans-serif" font-size="24" fill="#34d399" text-anchor="middle">◆</text>
    <text x="382" y="120" font-family="Geist, Inter, system-ui, sans-serif" font-size="14" fill="#f8faff" text-anchor="middle">Crypto</text>
  </g>

  <text x="56" y="1180" font-family="Geist, Inter, system-ui, sans-serif" font-size="16" fill="#475569">Installable on iOS · Android · Web · Desktop</text>
</svg>
`.trim();

// --- Output helpers ---------------------------------------------------------

async function writePng(filename: string, svg: string, size: number) {
  const outPath = path.join(PUBLIC_DIR, filename);
  await sharp(Buffer.from(svg)).png().resize(size, size).toFile(outPath);
  console.log(`  ✓ ${filename} (${size}x${size})`);
}

async function writePngRaw(filename: string, svg: string, width: number, height: number) {
  const outPath = path.join(PUBLIC_DIR, filename);
  await sharp(Buffer.from(svg)).png().resize(width, height, { fit: "fill" }).toFile(outPath);
  console.log(`  ✓ ${filename} (${width}x${height})`);
}

async function writeSvg(filename: string, svg: string) {
  const outPath = path.join(PUBLIC_DIR, filename);
  await writeFile(outPath, svg, "utf8");
  console.log(`  ✓ ${filename} (svg)`);
}

async function main() {
  console.log("GaexPay — generating PWA icons into /public …");
  await mkdir(PUBLIC_DIR, { recursive: true });

  // Icons
  await writePng("icon-192.png", ICON_SVG(512), 192);
  await writePng("icon-512.png", ICON_SVG(512), 512);
  await writePngRaw("apple-touch-icon.png", APPLE_TOUCH_SVG, 180, 180);
  await writePngRaw("favicon-32.png", FAVICON_SVG, 32, 32);

  // Screenshots referenced in manifest.json
  await writePngRaw("screenshot-wide.png", WIDE_SCREENSHOT_SVG, 1280, 720);
  await writePngRaw("screenshot-narrow.png", NARROW_SCREENSHOT_SVG, 720, 1280);

  // Also write an SVG version of the master icon for crisp in-app use.
  await writeSvg("icon.svg", ICON_SVG(512));

  console.log("\nDone. All PWA icons generated successfully.");
}

main().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
