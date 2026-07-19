# Task 22-a — Legal Pages Specialist

**Agent:** Legal Pages Specialist
**Task:** Create 4 complete legal pages (Privacy Policy, Terms of Service, Cookie Policy, Licenses) with full professional content.
**Date:** 2025-01-15

## Work Log

1. **Read worklog & project context.** Read `/home/z/my-project/worklog.md` (Phases 1–2 complete; 12 views + admin panel + auth + crypto + marketplace already live). Inspected `src/app/layout.tsx`, `src/app/page.tsx`, `src/middleware.ts`, `src/components/gaexpay/logo.tsx`, `src/components/ui/button.tsx`, `eslint.config.mjs`, `tsconfig.json`, `package.json` and `globals.css` to understand conventions and available dependencies.

2. **Discovery: `@tailwindcss/typography` is NOT installed.** The task spec asked for `prose prose-sm dark:prose-invert max-w-none` styling, but the typography plugin isn’t in `package.json` and the instructions forbid adding new npm packages. Solution: added a custom `.legal-prose` block to `src/app/globals.css` (~160 lines) that styles `h1`/`h2`/`h3`/`h4`/`p`/`ul`/`ol`/`li`/`a`/`strong`/`blockquote`/`code`/`table`/`hr`/`sup` with the same look-and-feel the typography plugin would give, plus a `.legal-toc-link` helper for the sidebar. Honours light/dark themes via CSS variables.

3. **Built `src/components/gaexpay/legal-layout.tsx`** — a reusable, Server-Component-safe layout that all 4 pages share:
   - Sticky top bar with GaexPay `Logo` + horizontal legal-page nav (Privacy/Terms/Cookies/Licenses).
   - Hero section with lucide icon, title, subtitle, “Last updated” date (formatted `<time>`), and GaexPay Inc. attribution.
   - Sticky 16rem TOC sidebar on `lg:` desktops with anchor links (`scroll-margin-top: 6rem` so headings aren’t hidden under the sticky header) and a Related Links block.
   - Mobile-friendly: TOC hidden on `<lg`, related links render as outline buttons below content.
   - Footer with logo, copyright year, Back-to-Home button, and a bottom row linking to all 4 legal pages + legal@gaexpay.app.
   - Props: `title`, `subtitle`, `lastUpdated`, `icon` (`shield`/`file`/`cookie`/`scale`), `toc: {id,label}[]`, `relatedLinks`, `children`.

4. **Created `src/app/privacy/page.tsx`** — full Privacy Policy (13 sections):
   - Introduction & effective date (GaexPay Inc. with US/Nigeria/Kenya/EU/UK subsidiaries).
   - Information we collect (2.1 Personal, 2.2 Financial, 2.3 Transaction, 2.4 Device, 2.5 Usage, 2.6 Derived, 2.7 Third-party).
   - How we use information (8 sub-purposes: account/auth, transactions, KYC/KYB, security/fraud, support, analytics, marketing, legal).
   - Legal basis for processing — table mapping each purpose to GDPR Article 6 basis, plus CCPA and NDPR notes.
   - Data sharing — 9 recipient categories (payment processors, banks, crypto networks, regulators, KYC vendors, infra, marketplace/social, corporate transactions, consent).
   - International data transfers — SCCs, UK IDTA, EU-US DPF, Article 49 derogations, NDPC model clauses.
   - Data retention — 10-row table with category, period, basis.
   - Data security — AES-256-GCM at rest, TLS 1.3 in transit, field-level encryption, tokenisation, 2FA, biometric attestation, RBAC, fraud-scoring engine, AML monitoring, PCI-DSS L1, ISO 27001, SOC 2 Type II, 72-hour breach notification.
   - Privacy rights — access/rectification/erasure/portability/objection/restriction/withdrawal/complaint/CCPA.
   - Cookies summary + link to /cookies.
   - Children’s privacy.
   - Changes to policy.
   - Contact info (DPO, EU representative).

5. **Created `src/app/terms/page.tsx`** — full Terms of Service (21 sections):
   - Introduction & acceptance.
   - Definitions table (12 defined terms).
   - Registration & eligibility.
   - Account types (Personal, Business, Pro/Enterprise).
   - KYC/KYB verification requirements.
   - Wallet services & multi-currency (e-money, safeguarding, no FDIC).
   - Crypto services — buy/sell/swap/stake/cash-out with risk acknowledgement, self-custody, slippage, forks/airdrops.
   - Mobile money & bill payment.
   - Marketplace & social network with dispute policy, content rules, live-stream donations.
   - Fees & commissions (10 fee types) with reference to Fee Schedule.
   - Transaction limits & processing times (11-row table).
   - User responsibilities.
   - Prohibited activities (15 prohibitions: AML, sanctions, fraud, structuring, unlicensed MSB, market manipulation, etc.).
   - Security responsibilities (mandatory 2FA, device security, 60-day reporting under EFTA/PSR).
   - Intellectual property.
   - Disclaimers & limitation of liability (as-is, $100/12-month cap, force majeure).
   - Indemnification.
   - Dispute resolution (governing law Delaware, informal resolution, AAA arbitration, class-action waiver, EU/UK consumer carve-out).
   - Suspension & termination.
   - Changes to terms.
   - Contact info.

6. **Created `src/app/cookies/page.tsx`** — full Cookie Policy (9 sections):
   - What are cookies (first-party vs third-party, session vs persistent).
   - Types of cookies (Essential/Functional/Analytics/Marketing) with consent-required column.
   - **Cookies We Set** table — 19 entries with name, purpose, duration, type/category (session, CSRF, theme, lang, currency, sidebar, consent, device_id, dfp, recent, pp, pwa, anon_id, ab, mp, localStorage entries for auth/store/tour, Cache Storage for PWA shell).
   - Third-party cookies table — 10 providers (CoinGecko, Stripe, Paystack/Flutterwave, Smile/Veriff/Onfido, Cloudflare, reCAPTCHA, Plausible, Meta Pixel, Google Ads, YouTube/Vimeo).
   - Managing cookies in Chrome / Firefox / Safari (macOS+iOS) / Edge — numbered browser-specific steps with official help-page links.
   - Cookie preferences (banner + Settings path + clearing gxp_consent).
   - Similar technologies (localStorage, IndexedDB, Cache Storage, Service Worker, fingerprinting, pixel tags).
   - Changes & contact.

7. **Created `src/app/licenses/page.tsx`** — full licenses & open-source notices (12 sections):
   - Introduction.
   - Copyright notice © 2024–{current year} GaexPay Inc.
   - Trademark notices — 35-row table of all marks used (Visa/Mastercard/Verve/UnionPay, MTN/Orange/Airtel/Moov/M-PESA/Telecel, Bitcoin/Ethereum/USDT/USDC/Polygon/BNB/Solana/Tron/Stellar/Base, Uniswap/PancakeSwap/1inch, Chainalysis/TRM, Smile/Veriff/Onfido, Refinitiv/Dow Jones, Stripe/Paystack/Flutterwave, CoinGecko, AWS, Cloudflare, reCAPTCHA).
   - Open-source software intro.
   - Core frameworks table — Next.js 16, React 19, TypeScript 5, Bun, Node.js, next-intl, NextAuth.js, next-themes.
   - UI/styling/animation table — Tailwind CSS 4, shadcn/ui, Radix UI, lucide-react, Framer Motion 12, tw-animate-css, class-variance-authority, clsx, tailwind-merge, cmdk, vaul, embla-carousel, sonner, react-day-picker, input-otp, @hookform/resolvers.
   - Data/state/forms/validation table — Prisma 6, Zod 4, react-hook-form, Zustand 5, TanStack Query/Table, Recharts, @reactuses/core, date-fns, uuid, @dnd-kit/*, react-resizable-panels, @mdxeditor/editor, react-syntax-highlighter, react-markdown.
   - Crypto/QR/Web3 tooling table — qrcode, sharp, node:crypto, cuid2.
   - AI & SDK integrations table — z-ai-web-dev-sdk 0.0.18 (server-side only), CoinGecko API.
   - Third-party services table — 16 services.
   - Attribution requirements — MIT/Apache 2.0/ISC/BSD licence obligations preserved.
   - Contact info.

8. **Lint & runtime verification.**
   - `bun run lint` → exit_code 0, no errors.
   - Started dev server with `NODE_OPTIONS=--max-old-space-size=4096` (the pre-existing dev server had crashed with V8 heap OOM from accumulated state across many prior sessions, unrelated to my code).
   - All 4 pages verified returning HTTP 200 with clean compile logs:
     - `GET /privacy 200 in 3.4s (compile: 2.1s, render: 1245ms)` — 219,846 bytes
     - `GET /terms 200 in 819ms (render: 762ms)` — 234,760 bytes
     - `GET /cookies 200 in 1265ms (render: 1190ms)` — 192,102 bytes
     - `GET /licenses 200 in 1489ms (render: 1410ms)` — 243,019 bytes
   - No runtime errors in dev.log.

## Files Created

| File | Purpose |
|---|---|
| `src/components/gaexpay/legal-layout.tsx` | Shared server-component layout for all 4 legal pages |
| `src/app/privacy/page.tsx` | Privacy Policy (13 sections) |
| `src/app/terms/page.tsx` | Terms of Service (21 sections) |
| `src/app/cookies/page.tsx` | Cookie Policy (9 sections, 19+10-row cookie tables) |
| `src/app/licenses/page.tsx` | Licenses & open-source notices (12 sections) |

## Files Modified

| File | Change |
|---|---|
| `src/app/globals.css` | Added `.legal-prose` + `.legal-toc-link` typography block (~160 lines) at the end of the file |

## Stage Summary

- **5 new files, 1 modified file.** All 4 legal pages are public, server-rendered, no auth required (the existing middleware only enforces security headers + CSRF on `/api/*` mutations, not on page routes).
- **Lint: 0 errors.** Runtime: all 4 pages return HTTP 200 with no errors.
- **Design:** Each page uses `LegalLayout` → sticky top bar with logo + legal nav, hero with lucide icon (shield/scale/cookie/file), last-updated date, sticky TOC sidebar on `lg:`, `.legal-prose` content with tables/blockquotes/code, footer with back-to-home button + 4-page footer nav. Fully responsive (mobile-first) and supports light/dark mode via CSS variables.
- **Content depth:** Privacy Policy covers all 13 requested topics. Terms of Service covers all 21 requested topics including KYC/KYB, crypto, marketplace/social, fees, prohibited activities (AML/sanctions/fraud), security responsibilities, dispute resolution (Delaware governing law + AAA arbitration + class-action waiver), suspension/termination. Cookie Policy covers all 8 requested topics + browser-specific guides for Chrome/Firefox/Safari/Edge with official help-page links. Licenses page covers all 5 requested topics with 35-row trademark table + 5 sub-sections of open-source packages (60+ packages) + 16-service third-party table + attribution-requirements section per licence type.
- **No new npm packages installed.** `@tailwindcss/typography` was unavailable so custom `.legal-prose` CSS was added instead.
- **Existing features untouched.** No changes to `/`, no API routes modified, no existing components altered.
