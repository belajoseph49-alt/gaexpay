import type { Metadata } from "next";
import { LegalLayout } from "@/components/gaexpay/legal-layout";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The cookies and similar technologies GaexPay uses, what each one does, how long it lasts, and how to manage or disable cookies in your browser.",
  alternates: { canonical: "https://gaexpay.app/cookies" },
  openGraph: {
    title: "Cookie Policy · GaexPay",
    description:
      "The cookies and similar technologies GaexPay uses, what each one does, and how to manage them.",
    type: "article",
  },
};

const toc = [
  { id: "what-are-cookies", label: "1. What Are Cookies" },
  { id: "types", label: "2. Types of Cookies We Use" },
  { id: "cookie-table", label: "3. Cookies We Set" },
  { id: "third-party", label: "4. Third-Party Cookies" },
  { id: "manage", label: "5. Managing Cookies in Your Browser" },
  { id: "preferences", label: "6. Cookie Preferences" },
  { id: "similar-tech", label: "7. Similar Technologies" },
  { id: "changes", label: "8. Changes to This Policy" },
  { id: "contact", label: "9. Contact Information" },
];

const relatedLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/licenses", label: "Licenses" },
];

export default function CookiePolicyPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="The cookies and similar technologies GaexPay uses, what each one does, and how to manage them."
      lastUpdated="2025-01-15"
      icon="cookie"
      toc={toc}
      relatedLinks={relatedLinks}
    >
      <h2 id="what-are-cookies">1. What Are Cookies</h2>
      <p>
        A cookie is a small text file that a website or app stores on your
        device when you visit. Cookies allow the site to remember your
        actions and preferences over time, so you don’t have to re-enter
        them on every page. Most modern browsers also support a range of
        similar storage mechanisms — including <code>localStorage</code>,
        <code>sessionStorage</code>, IndexedDB, the Cache API, SDK
        fingerprints and pixel tags — that perform the same remembering
        function. In this Policy, “<strong>cookies</strong>” covers all of
        these technologies unless the distinction matters.
      </p>
      <p>
        Cookies fall into two broad types:
      </p>
      <ul>
        <li>
          <strong>First-party cookies</strong> are set by the website you are
          visiting (in this case, gaexpay.app).
        </li>
        <li>
          <strong>Third-party cookies</strong> are set by a domain other than
          the one you are visiting — typically by embedded content,
          analytics, ad networks or social-share widgets.
        </li>
      </ul>
      <p>
        Cookies can also be classified by duration: <strong>session
        cookies</strong> are deleted when you close your browser, while
        <strong> persistent cookies</strong> remain on your device until
        they expire or you delete them.
      </p>
      <p>
        GaexPay uses cookies and similar technologies to keep you signed in,
        remember your preferences, secure the App against fraud and (with
        your consent) measure how the App is used. We do <strong>not</strong>{" "}
        use cookies to sell your data or to show you cross-site advertising.
      </p>

      <h2 id="types">2. Types of Cookies We Use</h2>
      <p>
        We group the cookies we use into four categories. The category
        determines whether the cookie is set automatically (because it is
        strictly necessary) or only after you consent.
      </p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Purpose</th>
            <th>Consent Required?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Essential</strong></td>
            <td>Required for the App to function. Without these, you could not sign in, the App would not be secure, and core features like the wallet and transactions would break.</td>
            <td>No — strictly necessary</td>
          </tr>
          <tr>
            <td><strong>Functional</strong></td>
            <td>Remember your non-essential preferences (theme, language, currency, sidebar state) so they persist between sessions.</td>
            <td>Yes (opt-in)</td>
          </tr>
          <tr>
            <td><strong>Analytics</strong></td>
            <td>Aggregate, pseudonymised measurement of how the App is used, so we can improve performance and features. No individual is identified.</td>
            <td>Yes (opt-in)</td>
          </tr>
          <tr>
            <td><strong>Marketing</strong></td>
            <td>Personalised in-app offers and remarketing on third-party platforms. We only set marketing cookies if you opt in, and we never sell your data.</td>
            <td>Yes (opt-in)</td>
          </tr>
        </tbody>
      </table>

      <h2 id="cookie-table">3. Cookies We Set</h2>
      <p>
        The table below lists every cookie and similar technology that
        GaexPay sets on your device. Names that look like{" "}
        <code>gxp_*</code> are first-party. Cookies from third parties are
        listed in Section 4.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>gxp_session</code></td>
            <td>Holds your authenticated session ID so you stay logged in across page reloads.</td>
            <td>Session (deleted on browser close)</td>
            <td>Essential · First-party · HTTP-only · Secure</td>
          </tr>
          <tr>
            <td><code>gxp_csrf</code></td>
            <td>CSRF protection token — paired with the SameSite=<code>Lax</code> session cookie to prevent cross-site request forgery on mutations.</td>
            <td>Session</td>
            <td>Essential · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_theme</code></td>
            <td>Remembers your light/dark/system theme choice.</td>
            <td>365 days</td>
            <td>Functional · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_lang</code></td>
            <td>Remembers your selected display language.</td>
            <td>365 days</td>
            <td>Functional · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_currency</code></td>
            <td>Remembers your default display currency.</td>
            <td>365 days</td>
            <td>Functional · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_sidebar</code></td>
            <td>Remembers whether the desktop sidebar is collapsed.</td>
            <td>365 days</td>
            <td>Functional · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_consent</code></td>
            <td>Stores your cookie-consent choices (which categories you accepted).</td>
            <td>180 days</td>
            <td>Essential · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_device_id</code></td>
            <td>A hashed device fingerprint used for trusted-device list and adaptive authentication. No biometric data is stored here.</td>
            <td>730 days</td>
            <td>Essential · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_dfp</code></td>
            <td>Behavioural-biometric signals (typing cadence, touch pressure) hashed and used only for fraud scoring. Not linked to your identity outside the risk engine.</td>
            <td>Session</td>
            <td>Essential · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_recent</code></td>
            <td>Remembers your recently-viewed wallets, beneficiaries and merchants for quick access.</td>
            <td>30 days</td>
            <td>Functional · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_pp</code></td>
            <td>Payment-provider token — used to pre-fill the payment sheet for repeat top-ups. The token does <strong>not</strong> contain your full card number.</td>
            <td>365 days</td>
            <td>Essential · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_pwa</code></td>
            <td>Stores the installable-PWA dismissal state and install-prompt frequency cap.</td>
            <td>365 days</td>
            <td>Functional · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_anon_id</code></td>
            <td>Pseudonymous analytics ID used only when you opt in to analytics. Not linked to your account identity.</td>
            <td>390 days</td>
            <td>Analytics · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_ab</code></td>
            <td>A/B experiment assignment (e.g. <code>new-send-flow=variant_b</code>).</td>
            <td>30 days</td>
            <td>Analytics · First-party</td>
          </tr>
          <tr>
            <td><code>gxp_mp</code></td>
            <td>Marketing attribution — records which campaign brought you to the App, only when you opt in to marketing.</td>
            <td>90 days</td>
            <td>Marketing · First-party</td>
          </tr>
          <tr>
            <td><code>localStorage["gxp_auth_v1"]</code></td>
            <td>Client-side flag indicating that a session exists. The real auth token lives in the HTTP-only cookie; this flag is just used to drive the UI.</td>
            <td>Until logout</td>
            <td>Essential · First-party · localStorage</td>
          </tr>
          <tr>
            <td><code>localStorage["gxp_store_v1"]</code></td>
            <td>Zustand-persisted UI state (active view, drawer state, last-selected wallet).</td>
            <td>Until cleared</td>
            <td>Functional · First-party · localStorage</td>
          </tr>
          <tr>
            <td><code>localStorage["gxp_tour_seen"]</code></td>
            <td>Remembers that you have completed the onboarding tour.</td>
            <td>Until cleared</td>
            <td>Functional · First-party · localStorage</td>
          </tr>
          <tr>
            <td><code>Cache Storage ["gxp-shell-*"]</code></td>
            <td>Precached app shell, icons and offline pages for the PWA. Stored by the service worker so the App works offline.</td>
            <td>Until a new version is released</td>
            <td>Essential · First-party · Cache API</td>
          </tr>
        </tbody>
      </table>

      <h2 id="third-party">4. Third-Party Cookies</h2>
      <p>
        Some features of the App embed content or services from third
        parties. These third parties may set their own cookies when you
        interact with that content. GaexPay does not control these cookies;
        they are governed by the third party’s own cookie policy.
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Duration</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CoinGecko API</td>
            <td>Live cryptocurrency prices on the markets, swap and trade screens. CoinGecko’s API may set anonymous rate-limit cookies.</td>
            <td>Session</td>
            <td>Essential · Third-party</td>
          </tr>

          <tr>
            <td>Smile Identity / Veriff / Onfido</td>
            <td>KYC selfie and ID verification in an iframe during onboarding.</td>
            <td>Session</td>
            <td>Essential · Third-party</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>DDoS protection, CDN and bot management. Cloudflare may set <code>__cf_bm</code> and <code>cf_clearance</code> cookies.</td>
            <td>1 year</td>
            <td>Essential · Third-party</td>
          </tr>
          <tr>
            <td>Google (reCAPTCHA)</td>
            <td>Bot detection on the sign-up and password-reset flows.</td>
            <td>180 days</td>
            <td>Essential · Third-party</td>
          </tr>
          <tr>
            <td>Plausible / self-hosted analytics</td>
            <td>Privacy-preserving, cookie-less or single-cookie analytics.</td>
            <td>1 day</td>
            <td>Analytics · Third-party</td>
          </tr>
          <tr>
            <td>Meta (Pixel) — opt-in only</td>
            <td>Marketing attribution on Facebook and Instagram. Only set when you opt in to marketing.</td>
            <td>90 days</td>
            <td>Marketing · Third-party</td>
          </tr>
          <tr>
            <td>Google Ads (gtag) — opt-in only</td>
            <td>Marketing attribution and remarketing. Only set when you opt in to marketing.</td>
            <td>390 days</td>
            <td>Marketing · Third-party</td>
          </tr>
          <tr>
            <td>YouTube / Vimeo</td>
            <td>Embedded help videos in the support section.</td>
            <td>Varies</td>
            <td>Functional · Third-party</td>
          </tr>
        </tbody>
      </table>
      <p>
        We periodically review our third-party providers and remove any that
        do not meet our privacy standards. If a provider changes its cookie
        practices, we update this Policy within 30 days.
      </p>

      <h2 id="manage">5. Managing Cookies in Your Browser</h2>
      <p>
        You can control, block or delete cookies through your browser
        settings. Below are the official help pages for the most popular
        browsers. Blocking essential cookies will prevent you from logging
        in and using the App; blocking non-essential cookies will only
        affect personalisation and analytics.
      </p>

      <h3>5.1 Google Chrome</h3>
      <ol>
        <li>Open Chrome and click the three-dot menu → <em>Settings</em>.</li>
        <li>Go to <em>Privacy and security → Third-party cookies</em>.</li>
        <li>Choose to allow all, block third-party cookies, or block all cookies.</li>
        <li>To clear existing cookies, go to <em>Privacy and security → Clear browsing data → Cookies and other site data</em>.</li>
        <li>Official guide: <a href="https://support.google.com/chrome/answer/95647" rel="noopener noreferrer">support.google.com/chrome/answer/95647</a></li>
      </ol>

      <h3>5.2 Mozilla Firefox</h3>
      <ol>
        <li>Open Firefox and click the hamburger menu → <em>Settings</em>.</li>
        <li>Go to <em>Privacy &amp; Security</em> → <em>Cookies and Site Data</em>.</li>
        <li>Choose <em>Standard</em>, <em>Strict</em> or <em>Custom</em> tracking protection.</li>
        <li>To clear cookies, click <em>Clear Data…</em> and select <em>Cookies and Site Data</em>.</li>
        <li>Official guide: <a href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer" rel="noopener noreferrer">support.mozilla.org</a></li>
      </ol>

      <h3>5.3 Apple Safari (macOS &amp; iOS)</h3>
      <ol>
        <li>On macOS: open Safari → <em>Settings</em> → <em>Privacy</em>.</li>
        <li>Choose <em>Block all cookies</em>, <em>Prevent cross-site tracking</em>, or <em>Hide IP address</em> as desired.</li>
        <li>On iOS: open <em>Settings → Safari</em> and toggle the equivalent switches.</li>
        <li>To clear cookies, use <em>Manage Website Data…</em> → <em>Remove All</em>.</li>
        <li>Official guide: <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" rel="noopener noreferrer">support.apple.com</a></li>
      </ol>

      <h3>5.4 Microsoft Edge</h3>
      <ol>
        <li>Open Edge and click the three-dot menu → <em>Settings</em>.</li>
        <li>Go to <em>Cookies and site permissions → Manage and delete cookies and site data</em>.</li>
        <li>Toggle <em>Block third-party cookies</em> or use <em>Block all cookies</em>.</li>
        <li>To clear cookies, click <em>See all cookies and site data</em> → <em>Remove all</em>.</li>
        <li>Official guide: <a href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" rel="noopener noreferrer">support.microsoft.com</a></li>
      </ol>

      <h3>5.5 Other browsers &amp; in-app browsers</h3>
      <p>
        For Brave, Opera, Vivaldi, Samsung Internet, the in-app browser of
        social-media apps, or any other browser, consult the browser’s own
        help documentation. The settings are usually under a “Privacy” or
        “Site data” menu.
      </p>
      <p>
        <strong>Note on PWA installations:</strong> if you have installed the
        GaexPay PWA, cookies are scoped to the PWA’s storage partition and
        must be cleared from the PWA’s own settings or from your browser’s
        site-data manager. Clearing data from a different browser profile
        will not affect the installed PWA.
      </p>

      <h2 id="preferences">6. Cookie Preferences</h2>
      <p>
        When you first visit the App, we show a cookie-consent banner that
        lets you accept or reject each non-essential category (functional,
        analytics, marketing). Your choice is stored in the{" "}
        <code>gxp_consent</code> cookie for 180 days.
      </p>
      <p>
        You can change your cookie preferences at any time:
      </p>
      <ul>
        <li>In the App: <em>Settings → Privacy → Cookie preferences</em> — opens the same banner again.</li>
        <li>By clearing the <code>gxp_consent</code> cookie, which will re-trigger the consent banner on your next visit.</li>
        <li>By using your browser’s site-data manager to remove individual GaexPay cookies.</li>
      </ul>
      <p>
        Withdrawing consent for analytics or marketing cookies will not
        affect the lawfulness of processing that took place before the
        withdrawal, but it will prevent those cookies from being set on
        future visits.
      </p>

      <h2 id="similar-tech">7. Similar Technologies</h2>
      <p>
        In addition to HTTP cookies, the App uses the following
        device-storage technologies. We list them here for transparency,
        even though the controls in Sections 5 and 6 apply to them as well.
      </p>
      <ul>
        <li>
          <strong>localStorage / sessionStorage</strong> — for UI state,
          onboarding-tour dismissal, and the lightweight session flag.
          Cleared by your browser’s “clear site data” function.
        </li>
        <li>
          <strong>IndexedDB</strong> — for the offline statement cache and
          the AI-assistant message log on your device.
        </li>
        <li>
          <strong>Cache Storage</strong> — used by the service worker to
          precache the app shell, icons and offline fallback page so the
          App works offline.
        </li>
        <li>
          <strong>Service Worker</strong> — registered to enable push
          notifications and background sync. You can unregister it from{" "}
          <em>Settings → Privacy → Service workers</em>.
        </li>
        <li>
          <strong>Device fingerprinting</strong> — a hashed combination of
          device attributes (model, OS, browser, screen, language, time
          zone) used for trusted-device list and fraud scoring. The hash is
          one-way and cannot be reversed to identify you outside the App.
        </li>
        <li>
          <strong>Pixel tags</strong> — 1×1 transparent GIFs embedded in
          transactional emails that tell us whether you opened the email
          (used for security alerts and transactional receipts only — not
          for marketing).
        </li>
      </ul>

      <h2 id="changes">8. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy whenever we add, remove or change a
        cookie. When we make material changes, we will bump the “Last
        updated” date at the top of this page and, where the change affects
        your consent, we will re-display the consent banner on your next
        visit.
      </p>
      <p>
        Continued use of the App after the effective date of an updated
        policy constitutes acceptance of the updated policy to the extent
        that your existing consent remains valid.
      </p>

      <h2 id="contact">9. Contact Information</h2>
      <p>
        If you have questions about this Cookie Policy or about how we use
        cookies and similar technologies, please contact us:
      </p>
      <p>
        <strong>GaexPay Inc.</strong><br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        Email: <a href="mailto:privacy@gaexpay.app">privacy@gaexpay.app</a><br />
        Phone (US): +1 (302) 555-0142
      </p>
      <p>
        EU representative: GaexPay Ireland Ltd., 5 Harbourmaster Place,
        IFSC, Dublin 1, Ireland.
      </p>
    </LegalLayout>
  );
}
