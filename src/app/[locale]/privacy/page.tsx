import type { Metadata } from "next";
import { LegalLayout } from "@/components/gaexpay/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How GaexPay collects, uses, shares and protects your personal and financial information when you use our wallet, payments, crypto and marketplace services.",
  alternates: { canonical: "https://gaexpay.app/privacy" },
  openGraph: {
    title: "Privacy Policy · GaexPay",
    description:
      "How GaexPay collects, uses, shares and protects your personal and financial information.",
    type: "article",
  },
};

const toc = [
  { id: "introduction", label: "1. Introduction" },
  { id: "information-we-collect", label: "2. Information We Collect" },
  { id: "how-we-use", label: "3. How We Use Information" },
  { id: "legal-basis", label: "4. Legal Basis for Processing" },
  { id: "data-sharing", label: "5. Data Sharing & Disclosure" },
  { id: "international-transfers", label: "6. International Data Transfers" },
  { id: "retention", label: "7. Data Retention" },
  { id: "security", label: "8. Data Security" },
  { id: "your-rights", label: "9. Your Privacy Rights" },
  { id: "cookies", label: "10. Cookies & Tracking" },
  { id: "children", label: "11. Children's Privacy" },
  { id: "changes", label: "12. Changes to This Policy" },
  { id: "contact", label: "13. Contact Information" },
];

const relatedLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/licenses", label: "Licenses" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How GaexPay collects, uses, shares and safeguards your personal and financial data."
      lastUpdated="2025-01-15"
      icon="shield"
      toc={toc}
      relatedLinks={relatedLinks}
    >
      <h2 id="introduction">1. Introduction</h2>
      <p>
        GaexPay Inc. (“GaexPay”, “we”, “us” or “our”) is a cross-platform
        digital wallet and payments company headquartered at 1209 Orange
        Street, Wilmington, Delaware, USA, with operating subsidiaries in
        Nigeria, Kenya, the European Union (Ireland) and the United Kingdom.
        We provide multi-currency wallets, instant peer-to-peer transfers,
        mobile money, bill payments, virtual and physical cards,
        cryptocurrency buy, sell, swap, staking and cash-out services,
        QR-code merchant checkout, an online marketplace and a social
        payments network (together, the “<strong>Services</strong>”).
      </p>
      <p>
        We recognise that you trust us with sensitive personal and financial
        information. This Privacy Policy (“<strong>Policy</strong>”) explains,
        in plain language, what data we collect, why we collect it, the legal
        basis on which we process it, who we share it with, how long we keep
        it and the rights you have over it. This Policy applies to all
        visitors and users of the GaexPay website at gaexpay.app, the GaexPay
        installable web app (PWA), and any GaexPay-branded mobile or desktop
        application (collectively, the “<strong>App</strong>”).
      </p>
      <p>
        This Policy is issued by GaexPay Inc. as the data controller of your
        personal data, except where a GaexPay subsidiary acts as data
        controller for data processed in its own jurisdiction. Where this is
        the case, the subsidiary’s local privacy notice supplements this
        Policy.
      </p>
      <p>
        <strong>Please read this Policy carefully.</strong> By creating a
        GaexPay account, accessing the App or using any of the Services, you
        acknowledge that you have read, understood and agreed to the
        collection, use, sharing and processing of your personal data as
        described in this Policy. If you do not agree, you must not use the
        Services.
      </p>

      <h2 id="information-we-collect">2. Information We Collect</h2>
      <p>
        We collect only the personal data we need to operate a regulated
        financial service. The categories of data we may collect, receive
        and process include:
      </p>

      <h3 id="info-personal">2.1 Personal Information</h3>
      <p>Information you provide directly when registering or updating your account:</p>
      <ul>
        <li>Full legal name, date of birth, nationality and gender</li>
        <li>Email address, mobile phone number and mailing address</li>
        <li>Government-issued identification number (e.g. national ID, passport, driver’s licence) and a scanned image or live selfie capture of the document</li>
        <li>Selfie photograph and liveness video used for biometric identity verification</li>
        <li>Place of birth, tax identification number (TIN) and country of tax residence</li>
        <li>For business accounts: legal entity name, registration number, registered address, beneficial ownership structure, and the personal data of each director, authorised signer and ultimate beneficial owner (UBO) owning 25% or more</li>
        <li>Profile picture, username and (optionally) a short bio for the social payments network</li>
      </ul>

      <h3 id="info-financial">2.2 Financial Information</h3>
      <p>Information needed to fund, operate and settle transactions on your account:</p>
      <ul>
        <li>Linked bank account details (IBAN, account number, sort code, routing number, bank name and branch)</li>
        <li>Linked card data (PAN is tokenised — we store only the last four digits, card brand and expiry; full card numbers are handled exclusively by our PCI-DSS Level 1 card processor)</li>
        <li>Mobile money account numbers and provider identifiers (MTN MoMo, Orange Money, Airtel Money, Moov, M-PESA, Telecel, etc.)</li>
        <li>Cryptocurrency wallet addresses (public keys only) for self-custody deposits and withdrawals</li>
        <li>Income source, occupation and expected monthly transaction volume, collected during onboarding risk assessment</li>
      </ul>

      <h3 id="info-transaction">2.3 Transaction Information</h3>
      <p>Records generated when you use the Services, including:</p>
      <ul>
        <li>Transaction type (transfer, top-up, withdrawal, swap, stake, payment, refund), amount, currency, timestamp and status</li>
        <li>Sender, recipient, counterparty wallet ID and (where applicable) beneficiary name and bank details</li>
        <li>Payment method, card token, mobile money reference and blockchain transaction hash</li>
        <li>Fees, FX rate applied, network fee and any promotional credits applied</li>
        <li>Merchant name, merchant category code (MCC), biller name and bill reference for merchant and bill payments</li>
        <li>QR-code scan metadata for in-store checkout</li>
        <li>Dispute reason, evidence and resolution outcome</li>
      </ul>

      <h3 id="info-device">2.4 Device & Technical Information</h3>
      <p>Collected automatically when you install or access the App:</p>
      <ul>
        <li>Device fingerprint (hashed device ID, manufacturer, model, operating system and version)</li>
        <li>Browser type and version, screen resolution, language and time zone</li>
        <li>IP address at the time of each request, with approximate geolocation derived from it</li>
        <li>Network carrier and connection type (Wi-Fi, cellular)</li>
        <li>App version, installation ID and whether the App is running as an installed PWA or in a browser tab</li>
        <li>Trusted device list and biometric authenticator metadata (Face ID, Touch ID, Windows Hello) — the biometric template never leaves your device; we only receive a yes/no attestation</li>
      </ul>

      <h3 id="info-usage">2.5 Usage Information</h3>
      <p>Aggregated or pseudonymised data about how you interact with the App:</p>
      <ul>
        <li>Pages viewed, taps, swipe gestures, dwell time and click-paths</li>
        <li>Features used (which wallet, which currency, which tab) and frequency of use</li>
        <li>Error logs, crash reports and performance telemetry</li>
        <li>Cookies and similar technologies — see <a href="/cookies">Cookie Policy</a> for details</li>
      </ul>

      <h3 id="info-derived">2.6 Derived & Inferred Information</h3>
      <ul>
        <li>Risk score, fraud-probability score and AML alert flags produced by our risk engine</li>
        <li>Credit-relevant behaviour derived from your transaction history for internal eligibility decisions (e.g. card limit increases, BNPL) — we do <strong>not</strong> share this with external credit bureaus without your consent</li>
        <li>Language, currency and theme preferences inferred from device settings</li>
      </ul>

      <h3 id="info-third-party">2.7 Information From Third Parties</h3>
      <p>We may receive information about you from:</p>
      <ul>
        <li>Identity verification providers (e.g. Smile Identity, Veriff, Onfido) returning a verification result</li>
        <li>Sanctions and PEP screening databases (e.g. Refinitiv World-Check, Dow Jones Risk &amp; Compliance)</li>
        <li>Bank and card networks confirming fund availability or returns</li>
        <li>Crypto compliance tools (e.g. Chainalysis, TRM Labs) flagging wallet addresses associated with illicit activity</li>
        <li>Other GaexPay users (e.g. when someone sends money to your phone number, we receive your phone number from their device)</li>
        <li>Public social media handles, if you link them to your GaexPay profile</li>
      </ul>

      <h2 id="how-we-use">3. How We Use Information</h2>
      <p>We process your personal data for the following purposes:</p>

      <h3>3.1 Account Provisioning &amp; Authentication</h3>
      <ul>
        <li>Creating, verifying and maintaining your GaexPay account</li>
        <li>Authenticating you on each sign-in using password, PIN, OTP, TOTP authenticator, passkey or biometric</li>
        <li>Managing trusted devices and prompting re-verification when an unfamiliar device is detected</li>
      </ul>

      <h3>3.2 Processing Transactions</h3>
      <ul>
        <li>Executing transfers, top-ups, withdrawals, swaps, stakes, payments, refunds and chargebacks</li>
        <li>Converting between fiat and crypto at the agreed FX rate</li>
        <li>Generating receipts, statements and tax documents</li>
      </ul>

      <h3>3.3 KYC / KYB Verification &amp; Compliance</h3>
      <ul>
        <li>Verifying your identity, age, address and source of funds</li>
        <li>Performing ongoing sanctions, PEP, adverse-media and AML screening</li>
        <li>Filing Suspicious Activity Reports (SARs) and Currency Transaction Reports (CTRs) to regulators where required</li>
        <li>Responding to lawful requests from financial intelligence units and law enforcement</li>
      </ul>

      <h3>3.4 Security &amp; Fraud Prevention</h3>
      <ul>
        <li>Detecting, preventing and investigating fraud, account takeover and unauthorised access</li>
        <li>Operating our real-time fraud-scoring engine across every transaction</li>
        <li>Blocking or stepping up transactions that match risk patterns</li>
      </ul>

      <h3>3.5 Customer Support</h3>
      <ul>
        <li>Responding to support tickets, in-app chat, email and phone enquiries</li>
        <li>Resolving disputes and chargebacks</li>
        <li>Maintaining a record of communications for quality, training and regulatory purposes</li>
      </ul>

      <h3>3.6 Product Improvement &amp; Analytics</h3>
      <ul>
        <li>Aggregating and analysing usage patterns to improve usability, reliability and feature design</li>
        <li>Running A/B experiments on new features</li>
        <li>Diagnosing crashes and performance issues</li>
      </ul>

      <h3>3.7 Marketing &amp; Communications</h3>
      <ul>
        <li>Sending service-critical notifications (security alerts, transaction confirmations, regulatory notices) — these are <strong>not</strong> optional</li>
        <li>Sending promotional messages, product updates and newsletters — only with your opt-in consent, which you can withdraw at any time from <em>Settings → Notifications</em></li>
        <li>Showing personalised in-app offers (e.g. fee discounts on corridors you use) — you can disable personalisation in <em>Settings → Preferences</em></li>
      </ul>

      <h3>3.8 Legal &amp; Regulatory Obligations</h3>
      <ul>
        <li>Complying with anti-money-laundering (AML), counter-terrorism-financing (CTF), sanctions and tax-reporting laws</li>
        <li>Maintaining records required by financial regulators in each jurisdiction we operate in</li>
        <li>Cooperating with law enforcement and regulators in response to valid legal process</li>
      </ul>

      <h2 id="legal-basis">4. Legal Basis for Processing</h2>
      <p>
        If you are in the European Economic Area (EEA), the United Kingdom or
        any jurisdiction whose privacy law is modelled on the GDPR, we process
        your personal data only where we have a lawful basis under Article 6
        of the GDPR. The table below identifies the lawful basis for each
        processing purpose.
      </p>
      <table>
        <thead>
          <tr>
            <th>Processing Purpose</th>
            <th>Lawful Basis</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account provisioning, transaction execution, support</td>
            <td>Performance of a contract (Art. 6(1)(b))</td>
            <td>The GaexPay Terms of Service</td>
          </tr>
          <tr>
            <td>KYC/KYB, AML, sanctions screening, fraud detection, regulatory reporting</td>
            <td>Legal obligation (Art. 6(1)(c))</td>
            <td>AML/CTF laws, payment-services regulations</td>
          </tr>
          <tr>
            <td>Security, fraud prevention, network integrity</td>
            <td>Legitimate interests (Art. 6(1)(f))</td>
            <td>Protecting our users, our network and our business</td>
          </tr>
          <tr>
            <td>Marketing communications &amp; personalised offers</td>
            <td>Consent (Art. 6(1)(a))</td>
            <td>Opt-in toggle at sign-up</td>
          </tr>
          <tr>
            <td>Product analytics &amp; A/B testing</td>
            <td>Consent or legitimate interests (where strictly pseudonymised)</td>
            <td>Cookie consent banner + analytics configuration</td>
          </tr>
          <tr>
            <td>Biometric identity verification</td>
            <td>Explicit consent (Art. 9(2)(a)) — special-category data</td>
            <td>Separate biometric consent at onboarding</td>
          </tr>
          <tr>
            <td>Responding to law-enforcement requests</td>
            <td>Legal obligation / vital interests</td>
            <td>Court orders, MLAT requests</td>
          </tr>
        </tbody>
      </table>
      <p>
        For users in California (CCPA/CPRA), the legal basis concepts map to
        our “business purpose” and “commercial purpose” disclosures under
        Cal. Civ. Code § 1798.140. For users in Nigeria, the processing
        grounds are those permitted under the Nigeria Data Protection Act
        2023 and the NDPR Regulations 2020.
      </p>

      <h2 id="data-sharing">5. Data Sharing &amp; Disclosure</h2>
      <p>
        We do <strong>not</strong> sell your personal data. We share your data
        only with the categories of recipients below, and only to the extent
        necessary to provide the Services or to comply with the law.
      </p>

      <h3>5.1 Payment Processors &amp; Card Networks</h3>
      <ul>
        <li>Card processors (PCI-DSS Level 1) that tokenise and route card payments</li>
        <li>Card networks (Visa, Mastercard, Verve, UnionPay) for authorisation, clearing and settlement</li>
        <li>Banking-as-a-service partners that hold customer funds in segregated accounts</li>
      </ul>

      <h3>5.2 Banks &amp; Settlement Rails</h3>
      <ul>
        <li>Your bank and the beneficiary’s bank for SWIFT/SEACH/SEPA transfers</li>
        <li>Correspondent banks that intermediate cross-border payments</li>
        <li>Mobile money operators (MTN, Orange, Airtel, Moov, Safaricom, Telecel) for wallet-to-wallet transfers</li>
      </ul>

      <h3>5.3 Cryptocurrency Networks</h3>
      <ul>
        <li>Public blockchains (Bitcoin, Ethereum, Polygon, BNB Smart Chain, Solana, Tron, Stellar, Base) — any address you transact with is recorded on-chain and is publicly visible</li>
        <li>Liquidity providers and DEX aggregators (1inch, Uniswap, PancakeSwap) for swap execution</li>
        <li>Staking validators and protocol smart contracts</li>
        <li>Crypto compliance tools (Chainalysis, TRM Labs) for address risk scoring</li>
      </ul>

      <h3>5.4 Regulators &amp; Law Enforcement</h3>
      <ul>
        <li>Central banks and financial conduct authorities (e.g. CBN, CBK, FCA, Central Bank of Ireland, FinCEN) in the jurisdictions where we operate</li>
        <li>Financial Intelligence Units (e.g. NFIU, FIU Ireland, UK FIU, FinCEN) for SAR/CTR filings</li>
        <li>Law-enforcement agencies in response to subpoenas, court orders, MLAT requests or other valid legal process</li>
        <li>Tax authorities in response to lawful information requests</li>
      </ul>

      <h3>5.5 Identity &amp; Compliance Vendors</h3>
      <ul>
        <li>KYC/KYB providers (Smile Identity, Veriff, Onfido, Persona)</li>
        <li>Sanctions &amp; PEP screening databases (Refinitiv World-Check, Dow Jones)</li>
        <li>Address verification and credit-reference agencies (where permitted)</li>
      </ul>

      <h3>5.6 Infrastructure &amp; Service Providers</h3>
      <ul>
        <li>Cloud-hosting providers that store encrypted data (e.g. AWS, GCP) under data-processing agreements</li>
        <li>Analytics providers (privacy-preserving, aggregated only)</li>
        <li>Customer-support tooling (ticketing, in-app chat)</li>
        <li>Email and SMS gateway providers for transactional and marketing messages</li>
      </ul>

      <h3>5.7 Marketplace &amp; Social Counterparties</h3>
      <ul>
        <li>Marketplace sellers see your shipping address and order reference (not your full payment instrument) when you purchase from them</li>
        <li>Other GaexPay users in your social payments network see your display name, profile photo, username and (if you choose) your unified payment address</li>
        <li>Live-stream creators you donate to see your display name and the donation amount</li>
      </ul>

      <h3>5.8 Corporate Transactions</h3>
      <p>
        In connection with a merger, acquisition, financing, restructuring or
        sale of all or part of our business, we may share your data with
        prospective counterparties under confidentiality agreements. We will
        notify you via email and in the App before your data is transferred
        to a successor entity following a completed transaction.
      </p>

      <h3>5.9 With Your Consent</h3>
      <p>
        We may share your data with any other third party where you have
        given us explicit consent to do so (for example, when you link a
        third-party app via the GaexPay developer API and authorise it to
        access your account).
      </p>

      <h2 id="international-transfers">6. International Data Transfers</h2>
      <p>
        GaexPay is a global service. Your personal data may be processed in
        countries other than your country of residence, including the United
        States, Nigeria, Kenya, Ireland, the United Kingdom and the
        cloud-hosting regions used by our infrastructure providers. These
        countries may have data-protection laws that differ from those in
        your jurisdiction.
      </p>
      <p>
        Where we transfer personal data from the EEA, the UK or Switzerland
        to a country that has not received an adequacy decision from the
        European Commission, we rely on:
      </p>
      <ul>
        <li>The European Commission’s Standard Contractual Clauses (SCCs), as adopted under Implementing Decision (EU) 2021/914</li>
        <li>The UK International Data Transfer Agreement (IDTA) or the UK Addendum to the SCCs for transfers from the UK</li>
        <li>An approved certification mechanism such as the EU-US Data Privacy Framework, where the recipient is certified</li>
        <li>A derogation under Article 49 of the GDPR (for occasional, necessary transfers)</li>
      </ul>
      <p>
        For transfers into Nigeria, we apply the Nigeria Data Protection
        Commission’s approved model contractual clauses. A copy of the
        relevant safeguards can be requested from{" "}
        <a href="mailto:dpo@gaexpay.app">dpo@gaexpay.app</a>.
      </p>

      <h2 id="retention">7. Data Retention</h2>
      <p>
        We retain your personal data only for as long as necessary to fulfil
        the purposes outlined in this Policy, to comply with our legal and
        regulatory obligations, and to resolve disputes. Typical retention
        periods are summarised below.
      </p>
      <table>
        <thead>
          <tr>
            <th>Data Category</th>
            <th>Retention Period</th>
            <th>Basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account data (profile, contact details, preferences)</td>
            <td>Lifetime of account + 30 days post-closure</td>
            <td>Contract / legitimate interests</td>
          </tr>
          <tr>
            <td>KYC/KYB documents (ID images, selfies, verification results)</td>
            <td>5 years after account closure (longer in some jurisdictions)</td>
            <td>AML/CFT regulatory requirement</td>
          </tr>
          <tr>
            <td>Transaction records</td>
            <td>7 years after the transaction date</td>
            <td>Financial-record-keeping laws</td>
          </tr>
          <tr>
            <td>Suspicious Activity Reports &amp; AML case files</td>
            <td>5 years (minimum) after filing</td>
            <td>AML/CFT regulatory requirement</td>
          </tr>
          <tr>
            <td>Device fingerprint &amp; fraud signals</td>
            <td>Rolling 24-month window</td>
            <td>Legitimate interests (fraud prevention)</td>
          </tr>
          <tr>
            <td>Support communications (tickets, chat transcripts)</td>
            <td>3 years after ticket closure</td>
            <td>Quality, dispute resolution</td>
          </tr>
          <tr>
            <td>Marketing-consent records &amp; communications logs</td>
            <td>Until consent is withdrawn + 2 years</td>
            <td>Consent / regulatory evidence</td>
          </tr>
          <tr>
            <td>Server &amp; application logs</td>
            <td>13 months</td>
            <td>Security &amp; operational reliability</td>
          </tr>
          <tr>
            <td>Biometric verification data</td>
            <td>Deleted within 30 days of a successful verification (we keep only a yes/no attestation)</td>
            <td>Explicit consent / regulatory minimisation</td>
          </tr>
          <tr>
            <td>Closed-account residual data</td>
            <td>Up to 10 years as required by local AML/tax law</td>
            <td>Legal obligation</td>
          </tr>
        </tbody>
      </table>
      <p>
        When the retention period expires, we either irreversibly delete the
        data or fully anonymise it so that it can no longer be linked to you.
      </p>

      <h2 id="security">8. Data Security</h2>
      <p>
        Protecting your personal and financial data is foundational to
        GaexPay. We use a defence-in-depth strategy combining technical,
        organisational and physical safeguards.
      </p>

      <h3>8.1 Encryption</h3>
      <ul>
        <li>
          <strong>Data in transit:</strong> all network traffic between your
          device and our infrastructure is encrypted with TLS 1.3 using
          strong AEAD cipher suites. HSTS is enforced with preload.
        </li>
        <li>
          <strong>Data at rest:</strong> all personal and financial data is
          encrypted at rest using <strong>AES-256-GCM</strong> with
          envelope encryption. Data-encryption keys are rotated annually and
          managed in a FIPS 140-2 Level 3 hardware security module (HSM).
        </li>
        <li>
          <strong>Field-level encryption:</strong> the most sensitive fields
          (full ID numbers, full bank account numbers) receive an additional
          layer of application-level encryption before being written to the
          database, so even database administrators cannot read them without
          the application key.
        </li>
        <li>
          <strong>Tokenisation:</strong> card PANs are never stored by us.
          Our PCI-DSS Level 1 card processor returns a network token that we
          store instead.
        </li>
      </ul>

      <h3>8.2 Authentication &amp; Access Control</h3>
      <ul>
        <li>Two-factor authentication (2FA) is mandatory for all accounts and supports TOTP authenticator apps, hardware security keys (WebAuthn / FIDO2) and passkeys</li>
        <li>Biometric authentication (Face ID, Touch ID, Windows Hello) is supported for device unlock; the biometric template never leaves your device</li>
        <li>Adaptive step-up authentication is triggered for high-risk transactions or new devices</li>
        <li>Internal access follows the principle of least privilege and is gated by role-based access control (RBAC) with mandatory MFA</li>
        <li>Every internal access to a customer record is logged in an immutable audit trail</li>
      </ul>

      <h3>8.3 Fraud Detection &amp; Monitoring</h3>
      <ul>
        <li>A real-time fraud-scoring engine evaluates every transaction using device fingerprint, behavioural biometrics, velocity rules and ML models</li>
        <li>An AML transaction-monitoring system screens for structuring, layering and integration patterns</li>
        <li>A 24/7 Security Operations Centre (SOC) responds to alerts within minutes</li>
      </ul>

      <h3>8.4 Certifications &amp; Standards</h3>
      <ul>
        <li>PCI-DSS Level 1 (via our card processor) for card data handling</li>
        <li>ISO/IEC 27001:2022 for our information security management system</li>
        <li>SOC 2 Type II annual audit</li>
        <li>GDPR, CCPA/CPRA, NDPR/Nigeria Data Protection Act 2023 compliance programmes</li>
      </ul>

      <h3>8.5 Breach Notification</h3>
      <p>
        In the event of a personal-data breach likely to result in a risk to
        your rights and freedoms, we will notify the relevant supervisory
        authority within 72 hours of becoming aware of it and will notify
        affected users without undue delay, in line with Article 34 of the
        GDPR and equivalent laws.
      </p>

      <h2 id="your-rights">9. Your Privacy Rights</h2>
      <p>
        Depending on where you live, you may have some or all of the
        following rights over your personal data. You can exercise any of
        them from <em>Settings → Privacy</em> in the App, or by emailing{" "}
        <a href="mailto:privacy@gaexpay.app">privacy@gaexpay.app</a>.
      </p>
      <ul>
        <li>
          <strong>Right of access</strong> — receive a copy of the personal
          data we hold about you, in a structured, machine-readable format.
        </li>
        <li>
          <strong>Right to rectification</strong> — correct inaccurate or
          incomplete data.
        </li>
        <li>
          <strong>Right to erasure (“right to be forgotten”)</strong> —
          request deletion of your data, subject to legal hold requirements
          (e.g. AML record-keeping).
        </li>
        <li>
          <strong>Right to data portability</strong> — receive your data in a
          portable format and transmit it to another controller.
        </li>
        <li>
          <strong>Right to object</strong> — object to processing based on
          legitimate interests or for direct marketing.
        </li>
        <li>
          <strong>Right to restrict processing</strong> — request that we
          limit our processing to storage only while a dispute is resolved.
        </li>
        <li>
          <strong>Right to withdraw consent</strong> — withdraw any consent
          you previously gave (e.g. for marketing or biometric processing);
          withdrawal does not affect the lawfulness of processing before the
          withdrawal.
        </li>
        <li>
          <strong>Right to lodge a complaint</strong> — with your local data
          protection authority. A list of EU supervisory authorities is at{" "}
          <a href="https://edpb.europa.eu/about-edpb/board/members_en" rel="noopener noreferrer">edpb.europa.eu</a>.
          For Nigeria, the authority is the Nigeria Data Protection Commission
          (NDPC).
        </li>
        <li>
          <strong>Rights under CCPA/CPRA (California residents)</strong> —
          the right to know, delete, correct, opt-out of “sale or sharing”
          (we do not sell data) and limit use of sensitive personal
          information. To exercise these, email{" "}
          <a href="mailto:privacy@gaexpay.app">privacy@gaexpay.app</a>.
        </li>
      </ul>
      <p>
        We will respond to verifiable requests within 30 days (or 45 days
        where permitted by law for complex requests). We may need to verify
        your identity before disclosing or modifying your data.
      </p>

      <h2 id="cookies">10. Cookies &amp; Similar Technologies</h2>
      <p>
        We use cookies, localStorage tokens, SDK fingerprints and similar
        technologies to keep you logged in, remember your preferences,
        measure how the App performs and (with your consent) personalise
        content. A detailed breakdown of every cookie we set, its purpose,
        duration and category, is available in our{" "}
        <a href="/cookies">Cookie Policy</a>.
      </p>
      <p>
        You can withdraw your cookie consent at any time from{" "}
        <em>Settings → Privacy → Cookie preferences</em> or by clearing
        cookies in your browser.
      </p>

      <h2 id="children">11. Children’s Privacy</h2>
      <p>
        The Services are not directed at children under the age of 18 (or the
        age of legal capacity in your jurisdiction). We do not knowingly
        collect personal data from children. If you believe a child has
        provided us with personal data, please contact{" "}
        <a href="mailto:privacy@gaexpay.app">privacy@gaexpay.app</a> and we
        will promptly delete it. Student and teen wallet products, where
        available, are operated jointly with a parent or guardian who is the
        accountholder of record.
      </p>

      <h2 id="changes">12. Changes to This Policy</h2>
      <p>
        We may update this Policy from time to time to reflect changes in our
        practices, the Services, or applicable law. When we make material
        changes, we will:
      </p>
      <ul>
        <li>Bump the “Last updated” date at the top of this page</li>
        <li>Notify you by email and via an in-app banner at least 30 days before the changes take effect</li>
        <li>Where the change requires new consent, prompt you to re-consent before continuing to use the Services</li>
      </ul>
      <p>
        We encourage you to review this Policy periodically. Continued use of
        the Services after the effective date constitutes acceptance of the
        updated Policy.
      </p>

      <h2 id="contact">13. Contact Information</h2>
      <p>
        If you have any questions about this Policy, want to exercise your
        privacy rights, or wish to file a complaint about how we handle your
        personal data, please contact our Data Protection Officer:
      </p>
      <p>
        <strong>GaexPay Inc. — Data Protection Officer</strong><br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        Email: <a href="mailto:dpo@gaexpay.app">dpo@gaexpay.app</a><br />
        Privacy inbox: <a href="mailto:privacy@gaexpay.app">privacy@gaexpay.app</a><br />
        Phone (US): +1 (302) 555-0142<br />
        Phone (EU): +353 1 555 0142
      </p>
      <p>
        Our EU representative (Article 27 GDPR) is GaexPay Ireland Ltd.,
        5 Harbourmaster Place, IFSC, Dublin 1, Ireland.
      </p>
      <p>
        If you are unsatisfied with our response, you have the right to lodge
        a complaint with your local data protection authority.
      </p>
    </LegalLayout>
  );
}
