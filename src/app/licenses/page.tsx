import type { Metadata } from "next";
import { LegalLayout } from "@/components/gaexpay/legal-layout";

export const metadata: Metadata = {
  title: "Licenses & Open-Source Notices",
  description:
    "Open-source licenses, third-party services, trademark notices and copyright attribution used in the GaexPay app.",
  alternates: { canonical: "https://gaexpay.app/licenses" },
  openGraph: {
    title: "Licenses · GaexPay",
    description:
      "Open-source licenses, third-party services, trademark notices and copyright attribution used in the GaexPay app.",
    type: "article",
  },
};

const toc = [
  { id: "introduction", label: "1. Introduction" },
  { id: "copyright", label: "2. Copyright Notice" },
  { id: "trademarks", label: "3. Trademark Notices" },
  { id: "open-source", label: "4. Open-Source Software" },
  { id: "core-frameworks", label: "5. Core Frameworks" },
  { id: "ui-libraries", label: "6. UI & Styling Libraries" },
  { id: "data-state", label: "7. Data, State & Forms" },
  { id: "crypto-web3", label: "8. Crypto & Web3 Tooling" },
  { id: "ai-sdk", label: "9. AI & SDK Integrations" },
  { id: "third-party-services", label: "10. Third-Party Services" },
  { id: "attribution", label: "11. Attribution Requirements" },
  { id: "contact", label: "12. Contact Information" },
];

const relatedLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
];

export default function LicensesPage() {
  return (
    <LegalLayout
      title="Licenses & Open-Source Notices"
      subtitle="Open-source licenses, third-party services, trademarks and attribution notices used in the GaexPay app."
      lastUpdated="2025-01-15"
      icon="file"
      toc={toc}
      relatedLinks={relatedLinks}
    >
      <h2 id="introduction">1. Introduction</h2>
      <p>
        GaexPay is built on a foundation of open-source software and
        third-party services. We are deeply grateful to the maintainers and
        communities that make this possible. This page lists every
        third-party component, library and service we depend on, together
        with the licence under which it is distributed, so that we honour
        each project’s attribution requirements and help our users
        understand what runs underneath the App.
      </p>
      <p>
        Unless otherwise stated, all open-source components listed here are
        used in their original, unmodified binary form as published by their
        authors. Where we have made local modifications, the modification is
        noted next to the package name.
      </p>
      <p>
        The source code for any GPL-licensed component we use is available
        on written request to <a href="mailto:legal@gaexpay.app">legal@gaexpay.app</a>{" "}
        for a period of three years from the date of distribution, as
        required by Section 3 of the GNU General Public License.
      </p>

      <h2 id="copyright">2. Copyright Notice</h2>
      <p>
        Copyright © 2024–{new Date().getFullYear()} GaexPay Inc. All rights
        reserved.
      </p>
      <p>
        The GaexPay App, the GaexPay website at gaexpay.app, the GaexPay
        name and logo, the Gaxie AI assistant, the Gaex Token, the GaexPay
        unified-address system, and all associated source code, designs,
        icons, illustrations, text and documentation (the “<strong>GaexPay
        Materials</strong>”) are the proprietary property of GaexPay Inc.
        and its licensors, protected by United States and international
        copyright, trademark and other intellectual-property laws.
      </p>
      <p>
        No part of the GaexPay Materials may be reproduced, distributed,
        transmitted, displayed, published or broadcast without the prior
        written permission of GaexPay Inc., except as expressly permitted
        by these Terms, by applicable open-source licences listed below, or
        by fair-use provisions of applicable copyright law.
      </p>

      <h2 id="trademarks">3. Trademark Notices</h2>
      <p>
        “GaexPay”, the GaexPay logo, “Gaxie”, “Gaex Token”, “GaexPay Pro”,
        “GaexPay Enterprise”, “GaexPay Pay”, “Gaex Unified Address” and the
        GaexPay brand visuals are trademarks or registered trademarks of
        GaexPay Inc. in the United States and other countries.
      </p>
      <p>
        All other trademarks, service marks, logos, product names and brand
        names appearing in the App are the property of their respective
        owners. Use of these marks does not imply endorsement by the
        trademark owner. The marks we reference include, without limitation:
      </p>
      <table>
        <thead>
          <tr>
            <th>Mark</th>
            <th>Owner</th>
            <th>Purpose on GaexPay</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Visa</td><td>Visa Inc.</td><td>Card network for card payments</td></tr>
          <tr><td>Mastercard</td><td>Mastercard International Inc.</td><td>Card network for card payments</td></tr>
          <tr><td>Verve</td><td>Interswitch Ltd.</td><td>Nigerian card network</td></tr>
          <tr><td>UnionPay</td><td>China UnionPay Co., Ltd.</td><td>Card network</td></tr>
          <tr><td>MTN MoMo / MTN Mobile Money</td><td>MTN Group</td><td>Mobile money transfers</td></tr>
          <tr><td>Orange Money</td><td>Orange S.A.</td><td>Mobile money transfers</td></tr>
          <tr><td>Airtel Money</td><td>Bharti Airtel Ltd.</td><td>Mobile money transfers</td></tr>
          <tr><td>Moov Money</td><td>Moov Africa</td><td>Mobile money transfers</td></tr>
          <tr><td>M-PESA</td><td>Safaricom PLC / Vodafone Group</td><td>Mobile money transfers</td></tr>
          <tr><td>Telecel Cash</td><td>Telecel Group</td><td>Mobile money transfers</td></tr>
          <tr><td>Bitcoin</td><td>Open-source project (no owner)</td><td>Cryptocurrency</td></tr>
          <tr><td>Ethereum</td><td>Ethereum Foundation</td><td>Blockchain network</td></tr>
          <tr><td>USDT / Tether</td><td>Tether Limited</td><td>Stablecoin</td></tr>
          <tr><td>USDC</td><td>Circle Internet Financial</td><td>Stablecoin</td></tr>
          <tr><td>Polygon</td><td>Polygon Labs</td><td>Layer-2 blockchain</td></tr>
          <tr><td>BNB Smart Chain</td><td>BNB Chain Foundation</td><td>Blockchain network</td></tr>
          <tr><td>Solana</td><td>Solana Labs</td><td>Blockchain network</td></tr>
          <tr><td>Tron / TRC20</td><td>TRON Foundation</td><td>Blockchain network</td></tr>
          <tr><td>Stellar</td><td>Stellar Development Foundation</td><td>Blockchain network</td></tr>
          <tr><td>Base</td><td>Coinbase, Inc.</td><td>Layer-2 blockchain</td></tr>
          <tr><td>Uniswap</td><td>Uniswap Labs</td><td>DEX for swaps</td></tr>
          <tr><td>PancakeSwap</td><td>PancakeSwap contributors</td><td>DEX for swaps</td></tr>
          <tr><td>1inch</td><td>1inch Labs</td><td>DEX aggregator for swaps</td></tr>
          <tr><td>Chainalysis</td><td>Chainalysis Inc.</td><td>Crypto compliance tooling</td></tr>
          <tr><td>TRM Labs</td><td>TRM Labs Inc.</td><td>Crypto compliance tooling</td></tr>
          <tr><td>Smile Identity</td><td>Smile Identity Inc.</td><td>KYC verification</td></tr>
          <tr><td>Veriff</td><td>Veriff OÜ</td><td>KYC verification</td></tr>
          <tr><td>Onfido</td><td>Entrust Corporation</td><td>KYC verification</td></tr>
          <tr><td>Refinitiv World-Check</td><td>London Stock Exchange Group</td><td>Sanctions &amp; PEP screening</td></tr>
          <tr><td>Dow Jones Risk &amp; Compliance</td><td>Dow Jones &amp; Company, Inc.</td><td>Sanctions &amp; PEP screening</td></tr>
          <tr><td>Stripe</td><td>Stripe, Inc.</td><td>Card payment processing</td></tr>
          <tr><td>Paystack</td><td>Stripe, Inc.</td><td>African payment processing</td></tr>
          <tr><td>Flutterwave</td><td>Flutterwave Inc.</td><td>African payment processing</td></tr>
          <tr><td>CoinGecko</td><td>CoinGecko Sdn. Bhd.</td><td>Crypto price API</td></tr>
          <tr><td>AWS</td><td>Amazon Web Services, Inc.</td><td>Cloud infrastructure</td></tr>
          <tr><td>Cloudflare</td><td>Cloudflare, Inc.</td><td>CDN &amp; DDoS protection</td></tr>
          <tr><td>Google reCAPTCHA</td><td>Google LLC</td><td>Bot detection</td></tr>
        </tbody>
      </table>

      <h2 id="open-source">4. Open-Source Software</h2>
      <p>
        The GaexPay App is built using the following open-source packages.
        Each entry includes the package name, a short description, its
        copyright holder(s) where known, and the licence under which it is
        distributed. Licence names link to their full text where available.
      </p>

      <h2 id="core-frameworks">5. Core Frameworks &amp; Runtimes</h2>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Description</th>
            <th>Licence</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="https://nextjs.org" rel="noopener noreferrer">Next.js</a> 16</td>
            <td>React meta-framework for the App Router, server components, API routes and PWA support.</td>
            <td>MIT — Vercel, Inc.</td>
          </tr>
          <tr>
            <td><a href="https://react.dev" rel="noopener noreferrer">React</a> 19</td>
            <td>UI rendering library.</td>
            <td>MIT — Meta Platforms, Inc. and affiliates</td>
          </tr>
          <tr>
            <td><a href="https://www.typescriptlang.org" rel="noopener noreferrer">TypeScript</a> 5</td>
            <td>Static-typing superset of JavaScript used throughout the codebase.</td>
            <td>Apache-2.0 — Microsoft Corporation</td>
          </tr>
          <tr>
            <td><a href="https://bun.sh" rel="noopener noreferrer">Bun</a></td>
            <td>JavaScript runtime and package manager used in development.</td>
            <td>MIT — Jarred Sumner</td>
          </tr>
          <tr>
            <td><a href="https://nodejs.org" rel="noopener noreferrer">Node.js</a></td>
            <td>Server-side JavaScript runtime (underpins Next.js server).</td>
            <td>MIT — OpenJS Foundation</td>
          </tr>
          <tr>
            <td><a href="https://next-intl-docs.vercel.app" rel="noopener noreferrer">next-intl</a> 4</td>
            <td>Internationalisation for App Router. Powers the 8 supported languages.</td>
            <td>MIT — Stefan Wüthrich</td>
          </tr>
          <tr>
            <td><a href="https://next-auth.js.org" rel="noopener noreferrer">NextAuth.js</a> 4</td>
            <td>Authentication library (credential, OAuth, TOTP, passkey providers).</td>
            <td>ISC — Iain Collins &amp; contributors</td>
          </tr>
          <tr>
            <td><a href="https://github.com/bkeepers/next-themes" rel="noopener noreferrer">next-themes</a></td>
            <td>Light/dark/system theme switching with no flash of incorrect theme.</td>
            <td>MIT — Brandon Keepers</td>
          </tr>
        </tbody>
      </table>

      <h2 id="ui-libraries">6. UI, Styling &amp; Animation Libraries</h2>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Description</th>
            <th>Licence</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="https://tailwindcss.com" rel="noopener noreferrer">Tailwind CSS</a> 4</td>
            <td>Utility-first CSS framework; powers all styling in the App.</td>
            <td>MIT — Tailwind Labs, LLC</td>
          </tr>
          <tr>
            <td><a href="https://ui.shadcn.com" rel="noopener noreferrer">shadcn/ui</a></td>
            <td>Copy-paste React component collection built on Radix UI. New York style.</td>
            <td>MIT — shadcn</td>
          </tr>
          <tr>
            <td><a href="https://www.radix-ui.com" rel="noopener noreferrer">Radix UI Primitives</a></td>
            <td>Accessible, unstyled component primitives (Dialog, Popover, Select, Tabs, etc.).</td>
            <td>MIT — WorkOS, Inc.</td>
          </tr>
          <tr>
            <td><a href="https://lucide.dev" rel="noopener noreferrer">lucide-react</a></td>
            <td>Beautiful, consistent icon set used throughout the App.</td>
            <td>ISC — Lucide Contributors</td>
          </tr>
          <tr>
            <td><a href="https://www.framer.com/motion" rel="noopener noreferrer">Framer Motion</a> 12</td>
            <td>Animation library — view transitions, hover effects, success animations.</td>
            <td>MIT — Framer</td>
          </tr>
          <tr>
            <td><a href="https://tw-animate-css.analolz.com" rel="noopener noreferrer">tw-animate-css</a></td>
            <td>Tailwind CSS animation utilities.</td>
            <td>MIT — contributors</td>
          </tr>
          <tr>
            <td><a href="https://www.npmjs.com/package/class-variance-authority" rel="noopener noreferrer">class-variance-authority</a></td>
            <td>Component variant tooling used by shadcn/ui and our button component.</td>
            <td>Apache-2.0 — Joe Bell</td>
          </tr>
          <tr>
            <td><a href="https://github.com/lukeed/clsx" rel="noopener noreferrer">clsx</a></td>
            <td>Tiny utility for conditionally building className strings.</td>
            <td>MIT — Luke Edwards</td>
          </tr>
          <tr>
            <td><a href="https://github.com/dcastil/tailwind-merge" rel="noopener noreferrer">tailwind-merge</a></td>
            <td>Intelligently merges Tailwind CSS classes (e.g. <code>p-2 p-4 → p-4</code>).</td>
            <td>MIT — Dany Castillo</td>
          </tr>
          <tr>
            <td><a href="https://cmdk.paco.me" rel="noopener noreferrer">cmdk</a></td>
            <td>Headless command palette used by our global Cmd+K palette.</td>
            <td>MIT — Paco Coursey</td>
          </tr>
          <tr>
            <td><a href="https://vaul.emilkowal.ski" rel="noopener noreferrer">vaul</a></td>
            <td>Drawer component for mobile bottom sheets.</td>
            <td>MIT — Emil Kowalski</td>
          </tr>
          <tr>
            <td><a href="https://www.embla-carousel.com" rel="noopener noreferrer">embla-carousel-react</a></td>
            <td>Lightweight carousel used by the cards view.</td>
            <td>MIT — David Jerleke</td>
          </tr>
          <tr>
            <td><a href="https://sonner.emilkowal.ski" rel="noopener noreferrer">sonner</a></td>
            <td>Toast notification library.</td>
            <td>MIT — Emil Kowalski</td>
          </tr>
          <tr>
            <td><a href="https://react-day-picker.js.org" rel="noopener noreferrer">react-day-picker</a> 9</td>
            <td>Accessible date-picker used in scheduled transfers and statements.</td>
            <td>MIT — Giampaolo Bellavite</td>
          </tr>
          <tr>
            <td><a href="https://input-otp.eguoming.com" rel="noopener noreferrer">input-otp</a></td>
            <td>OTP input component used in the Send flow.</td>
            <td>MIT — Guoming E</td>
          </tr>
          <tr>
            <td><a href="https://github.com/oleg-koval/@hookform/resolvers" rel="noopener noreferrer">@hookform/resolvers</a></td>
            <td>Schema-validation resolvers for react-hook-form (Zod, etc.).</td>
            <td>MIT — Oleg Koval</td>
          </tr>
        </tbody>
      </table>

      <h2 id="data-state">7. Data, State, Forms &amp; Validation</h2>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Description</th>
            <th>Licence</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="https://www.prisma.io" rel="noopener noreferrer">Prisma</a> 6 &amp; <code>@prisma/client</code></td>
            <td>Type-safe ORM for our SQLite database (User, Wallet, Transaction, Card, KycDocument and 14+ models).</td>
            <td>Apache-2.0 — Prisma Inc.</td>
          </tr>
          <tr>
            <td><a href="https://zod.dev" rel="noopener noreferrer">Zod</a> 4</td>
            <td>TypeScript-first schema validation used across API routes and forms.</td>
            <td>MIT — Colin McDonnell</td>
          </tr>
          <tr>
            <td><a href="https://react-hook-form.com" rel="noopener noreferrer">react-hook-form</a> 7</td>
            <td>Performant form library used in the auth modal, send flow and settings.</td>
            <td>MIT — Bill Luo</td>
          </tr>
          <tr>
            <td><a href="https://github.com/pmndrs/zustand" rel="noopener noreferrer">Zustand</a> 5</td>
            <td>Lightweight client-state store for navigation, sidebar, AI-assistant and notification state.</td>
            <td>MIT — Paul Henschel</td>
          </tr>
          <tr>
            <td><a href="https://tanstack.com/query" rel="noopener noreferrer">@tanstack/react-query</a> 5</td>
            <td>Server-state caching, retries and invalidation for API data.</td>
            <td>MIT — Tanner Linsley</td>
          </tr>
          <tr>
            <td><a href="https://tanstack.com/table" rel="noopener noreferrer">@tanstack/react-table</a> 8</td>
            <td>Headless table primitives used by admin tables.</td>
            <td>MIT — Tanner Linsley</td>
          </tr>
          <tr>
            <td><a href="https://www.recharts.org" rel="noopener noreferrer">Recharts</a> 2</td>
            <td>Charting library for the analytics, treasury and admin dashboards.</td>
            <td>MIT — Recharts contributors</td>
          </tr>
          <tr>
            <td><a href="https://react-spectrum.adobe.com/react-aria/useDate.html" rel="noopener noreferrer">@reactuses/core</a></td>
            <td>Collection of React hooks for utilities and effects.</td>
            <td>MIT — reactuses contributors</td>
          </tr>
          <tr>
            <td><a href="https://date-fns.org" rel="noopener noreferrer">date-fns</a> 4</td>
            <td>Modular date-utility library for formatting and arithmetic.</td>
            <td>MIT — Sasha Koss &amp; Lesha Koss</td>
          </tr>
          <tr>
            <td><a href="https://github.com/uuidjs/uuid" rel="noopener noreferrer">uuid</a> 11</td>
            <td>RFC4122 UUID generation for transaction references and device IDs.</td>
            <td>MIT — uuid contributors</td>
          </tr>
          <tr>
            <td><a href="https://github.com/dnd-kit" rel="noopener noreferrer">@dnd-kit/core</a>, <code>@dnd-kit/sortable</code>, <code>@dnd-kit/utilities</code></td>
            <td>Drag-and-drop primitives used by the budget and card reordering UIs.</td>
            <td>MIT — Claus Bovo</td>
          </tr>
          <tr>
            <td><a href="https://github.com/bvaughn/react-resizable-panels" rel="noopener noreferrer">react-resizable-panels</a></td>
            <td>Resizable panel groups used by the admin console layout.</td>
            <td>MIT — Brian Vaughn</td>
          </tr>
          <tr>
            <td><a href="https://mdxeditor.dev" rel="noopener noreferrer">@mdxeditor/editor</a></td>
            <td>MDX editor used by the marketplace seller dashboard for product descriptions.</td>
            <td>MIT — Pekka Enberg</td>
          </tr>
          <tr>
            <td><a href="https://github.com/react-syntax-highlighter/react-syntax-highlighter" rel="noopener noreferrer">react-syntax-highlighter</a></td>
            <td>Code-block renderer used in the developer portal docs.</td>
            <td>MIT — Pekka Enberg &amp; contributors</td>
          </tr>
          <tr>
            <td><a href="https://github.com/remarkjs/react-markdown" rel="noopener noreferrer">react-markdown</a></td>
            <td>Markdown renderer used in the AI-assistant chat and support FAQ.</td>
            <td>MIT — Espen Hovlandsdal</td>
          </tr>
        </tbody>
      </table>

      <h2 id="crypto-web3">8. Crypto, QR &amp; Web3 Tooling</h2>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Description</th>
            <th>Licence</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="https://github.com/soldair/node-qrcode" rel="noopener noreferrer">qrcode</a></td>
            <td>QR-code generation for merchant checkout and P2P payment requests.</td>
            <td>MIT — Ryan Day</td>
          </tr>
          <tr>
            <td><a href="https://sharp.pixelplumbing.com" rel="noopener noreferrer">sharp</a></td>
            <td>High-performance image processing for KYC document and avatar uploads.</td>
            <td>Apache-2.0 — Lovell Fuller</td>
          </tr>
          <tr>
            <td><code>node:crypto</code></td>
            <td>Node.js built-in crypto module — used for AES-256-GCM, HMAC, OTP, TOTP and CSRF tokens.</td>
            <td>MIT — Node.js contributors</td>
          </tr>
          <tr>
            <td><a href="https://github.com/paralleldrive/cuid2" rel="noopener noreferrer">cuid2</a> (via Prisma)</td>
            <td>Collision-resistant ID generator backing Prisma’s <code>@default(cuid())</code>.</td>
            <td>MIT — Eric Elliott</td>
          </tr>
        </tbody>
      </table>

      <h2 id="ai-sdk">9. AI &amp; SDK Integrations</h2>
      <table>
        <thead>
          <tr>
            <th>Package / Service</th>
            <th>Description</th>
            <th>Licence / Terms</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><a href="https://www.npmjs.com/package/z-ai-web-dev-sdk" rel="noopener noreferrer">z-ai-web-dev-sdk</a> 0.0.18</td>
            <td>Server-side SDK powering the Gaxie AI assistant (LLM chat completions), image generation and other AI services. Used strictly on the backend; never bundled into client JavaScript.</td>
            <td>Proprietary — Z.ai. Used subject to the Z.ai terms of service.</td>
          </tr>
          <tr>
            <td>CoinGecko Public API</td>
            <td>Live cryptocurrency price, market-cap and historical data for the crypto, swap and trade views.</td>
            <td>CoinGecko API Terms of Service — CoinGecko Sdn. Bhd.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="third-party-services">10. Third-Party Services</h2>
      <p>
        In addition to the open-source libraries listed above, the App
        depends on the following hosted third-party services. Each service
        is governed by its own terms of service and privacy policy, which
        we link to where available.
      </p>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Purpose</th>
            <th>Provider</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>z-ai-web-dev-sdk</td><td>LLM chat completions for the Gaxie AI assistant.</td><td>Z.ai</td></tr>
          <tr><td>CoinGecko API</td><td>Live crypto prices, market data and historical charts.</td><td>CoinGecko Sdn. Bhd.</td></tr>
          <tr><td>Smile Identity</td><td>Selfie &amp; ID verification for African markets.</td><td>Smile Identity Inc.</td></tr>
          <tr><td>Veriff</td><td>Selfie &amp; ID verification for EU and global markets.</td><td>Veriff OÜ</td></tr>
          <tr><td>Onfido</td><td>Document &amp; biometric verification.</td><td>Entrust Corporation</td></tr>
          <tr><td>Refinitiv World-Check</td><td>Sanctions, PEP and adverse-media screening.</td><td>LSEG (London Stock Exchange Group)</td></tr>
          <tr><td>Dow Jones Risk &amp; Compliance</td><td>Sanctions, PEP and adverse-media screening.</td><td>Dow Jones &amp; Company, Inc.</td></tr>
          <tr><td>Chainalysis</td><td>Crypto address risk scoring.</td><td>Chainalysis Inc.</td></tr>
          <tr><td>TRM Labs</td><td>Crypto address risk scoring.</td><td>TRM Labs Inc.</td></tr>
          <tr><td>Stripe</td><td>Card payment processing (global).</td><td>Stripe, Inc.</td></tr>
          <tr><td>Paystack</td><td>Card &amp; bank payments (Nigeria, Ghana, Kenya, South Africa).</td><td>Stripe, Inc.</td></tr>
          <tr><td>Flutterwave</td><td>Card &amp; bank payments (African markets).</td><td>Flutterwave Inc.</td></tr>
          <tr><td>Cloudflare</td><td>CDN, DDoS protection, WAF, bot management.</td><td>Cloudflare, Inc.</td></tr>
          <tr><td>Amazon Web Services</td><td>Cloud compute, storage, KMS, RDS, S3.</td><td>Amazon Web Services, Inc.</td></tr>
          <tr><td>Google reCAPTCHA</td><td>Bot detection on auth flows.</td><td>Google LLC</td></tr>
          <tr><td>Twilio / SendGrid</td><td>SMS OTP and transactional email delivery.</td><td>Twilio Inc.</td></tr>
          <tr><td>Plausible (self-hosted)</td><td>Privacy-preserving, cookie-less analytics.</td><td>Plausible Insights OÜ</td></tr>
        </tbody>
      </table>

      <h2 id="attribution">11. Attribution Requirements</h2>
      <p>
        Several of the open-source licences listed above require that we
        preserve their copyright notices and licence terms when we
        distribute the software. We honour those requirements here:
      </p>
      <ul>
        <li>
          <strong>MIT licence</strong> — used by Next.js, React, Tailwind
          CSS, shadcn/ui, Radix UI, lucide-react, Framer Motion, Zustand,
          TanStack Query/Table, Recharts, date-fns, uuid, qrcode,
          next-themes, clsx, tailwind-merge, cmdk, vaul, embla-carousel,
          sonner, react-day-picker, input-otp, react-hook-form,
          react-markdown, react-syntax-highlighter, react-resizable-panels,
          @dnd-kit/* and @reactuses/core. The MIT licence permits use,
          modification and redistribution provided the copyright notice and
          permission notice are included in all copies or substantial
          portions of the software. The software is provided “as is”
          without warranty of any kind.
        </li>
        <li>
          <strong>Apache Licence 2.0</strong> — used by TypeScript, Prisma,
          class-variance-authority and sharp. The Apache 2.0 licence
          requires preservation of the NOTICE file, attribution and a copy
          of the licence. It also grants an express grant of patent rights
          from contributors to users.
        </li>
        <li>
          <strong>ISC licence</strong> — used by NextAuth.js and lucide-react
          (some packages). The ISC licence is functionally equivalent to
          the MIT licence and requires preservation of the copyright notice
          and permission notice.
        </li>
        <li>
          <strong>BSD licences</strong> — used by various transitive
          dependencies. The BSD licence requires preservation of the
          copyright notice, conditions and disclaimer; neither the name of
          the copyright holder nor the names of its contributors may be
          used to endorse or promote products derived from this software
          without specific prior written permission.
        </li>
      </ul>
      <p>
        The full text of each licence is available at{" "}
        <a href="https://opensource.org/licenses" rel="noopener noreferrer">opensource.org/licenses</a>{" "}
        or{" "}
        <a href="https://spdx.org/licenses/" rel="noopener noreferrer">spdx.org/licenses</a>.
      </p>

      <h2 id="contact">12. Contact Information</h2>
      <p>
        For any questions about this Licenses page, to request the source
        code of any GPL-licensed component, or to report a missing or
        incorrect attribution, please contact us:
      </p>
      <p>
        <strong>GaexPay Inc.</strong><br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        Email: <a href="mailto:legal@gaexpay.app">legal@gaexpay.app</a><br />
        Email: <a href="mailto:opensource@gaexpay.app">opensource@gaexpay.app</a><br />
        Phone (US): +1 (302) 555-0142
      </p>
      <p>
        If you are an open-source maintainer and believe your package has
        been used without proper attribution, please reach out and we will
        correct the omission within 14 days.
      </p>
    </LegalLayout>
  );
}
