import type { Metadata } from "next";
import { LegalLayout } from "@/components/gaexpay/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and GaexPay governing your use of our wallet, payments, crypto, marketplace and social payments services.",
  alternates: { canonical: "https://gaexpay.app/terms" },
  openGraph: {
    title: "Terms of Service · GaexPay",
    description:
      "The agreement between you and GaexPay governing your use of our wallet, payments, crypto, marketplace and social payments services.",
    type: "article",
  },
};

const toc = [
  { id: "introduction", label: "1. Introduction & Acceptance" },
  { id: "definitions", label: "2. Definitions" },
  { id: "eligibility", label: "3. Registration & Eligibility" },
  { id: "account-types", label: "4. Account Types" },
  { id: "kyc", label: "5. KYC / KYB Verification" },
  { id: "wallets", label: "6. Wallet Services" },
  { id: "crypto", label: "7. Crypto Services" },
  { id: "momo", label: "8. Mobile Money & Bill Pay" },
  { id: "marketplace", label: "9. Marketplace & Social" },
  { id: "fees", label: "10. Fees & Commissions" },
  { id: "limits", label: "11. Limits & Processing Times" },
  { id: "responsibilities", label: "12. Your Responsibilities" },
  { id: "prohibited", label: "13. Prohibited Activities" },
  { id: "security-resp", label: "14. Security Responsibilities" },
  { id: "ip", label: "15. Intellectual Property" },
  { id: "disclaimers", label: "16. Disclaimers & Liability" },
  { id: "indemnification", label: "17. Indemnification" },
  { id: "disputes", label: "18. Dispute Resolution" },
  { id: "suspension", label: "19. Suspension & Termination" },
  { id: "changes", label: "20. Changes to These Terms" },
  { id: "contact", label: "21. Contact Information" },
];

const relatedLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/licenses", label: "Licenses" },
];

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The agreement between you and GaexPay governing your use of our Services."
      lastUpdated="2025-01-15"
      icon="scale"
      toc={toc}
      relatedLinks={relatedLinks}
    >
      <h2 id="introduction">1. Introduction &amp; Acceptance of Terms</h2>
      <p>
        Welcome to GaexPay. These Terms of Service (“<strong>Terms</strong>”)
        form a legally binding agreement between you (“<strong>you</strong>”,
        “<strong>your</strong>” or the “<strong>User</strong>”) and GaexPay Inc.
        (“<strong>GaexPay</strong>”, “<strong>we</strong>”, “<strong>us</strong>”
        or “<strong>our</strong>”) governing your access to and use of the
        GaexPay website, installable web application (PWA), mobile and desktop
        applications, and any other GaexPay-branded product or feature (the
        “<strong>App</strong>”), and the digital wallet, payments, mobile money,
        card, cryptocurrency, marketplace and social-payments services we offer
        through the App (the “<strong>Services</strong>”).
      </p>
      <p>
        <strong>By creating a GaexPay account, signing in, or otherwise using
        any of the Services, you agree to these Terms and to our Privacy
        Policy and Cookie Policy, which are incorporated by reference.</strong>
        If you do not agree to these Terms, you must not access or use the
        App or the Services. If you are using the Services on behalf of a
        business, you represent and warrant that you have the authority to
        bind that business and that business will be responsible for your
        use of the Services.
      </p>
      <p>
        Some Services (for example, cryptocurrency trading or business
        accounts) may be subject to additional terms (“<strong>Additional
        Terms</strong>”). In the event of a conflict between these Terms and
        any Additional Terms, the Additional Terms prevail with respect to
        the relevant Service.
      </p>

      <h2 id="definitions">2. Definitions</h2>
      <p>In these Terms, capitalised terms have the meanings set out below:</p>
      <table>
        <thead>
          <tr>
            <th>Term</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account</td>
            <td>A registered GaexPay account that gives you access to the Services.</td>
          </tr>
          <tr>
            <td>Wallet</td>
            <td>A virtual store of value, denominated in a supported currency, held with GaexPay and used to send, receive, hold and convert funds.</td>
          </tr>
          <tr>
            <td>Crypto Wallet</td>
            <td>A wallet that holds cryptographic assets (BTC, ETH, USDT, USDC, etc.) and is linked to your Account.</td>
          </tr>
          <tr>
            <td>Card</td>
            <td>A virtual or physical payment card issued by our banking partner that you can link to your Wallet.</td>
          </tr>
          <tr>
            <td>Beneficiary</td>
            <td>A person or entity to whom you send money using the Services.</td>
          </tr>
          <tr>
            <td>Transaction</td>
            <td>Any instruction you give us to move, convert, stake, withdraw or pay funds, including transfers, top-ups, withdrawals, swaps, stakes, payments, refunds and chargebacks.</td>
          </tr>
          <tr>
            <td>Fee Schedule</td>
            <td>The published list of fees and commissions applicable to each Service, available in the App at <em>Settings → Fees</em> and on our website.</td>
          </tr>
          <tr>
            <td>AML Laws</td>
            <td>All applicable anti-money-laundering, counter-terrorism-financing, sanctions and beneficial-ownership laws and regulations.</td>
          </tr>
          <tr>
            <td>KYC / KYB</td>
            <td>“Know Your Customer” / “Know Your Business” — the identity- and business-verification processes required by AML Laws.</td>
          </tr>
          <tr>
            <td>Marketplace</td>
            <td>The GaexPay online marketplace where Sellers list goods and services and Buyers purchase them using their Wallet.</td>
          </tr>
          <tr>
            <td>Social Network</td>
            <td>The GaexPay in-app social features (posts, comments, follows, live streams, donations) that let Users interact with each other.</td>
          </tr>
          <tr>
            <td>Unified Address</td>
            <td>A single, human-readable identifier (e.g. <code>@adaeze</code>) that resolves to your Wallet and Crypto Wallet for receiving payments.</td>
          </tr>
        </tbody>
      </table>

      <h2 id="eligibility">3. Account Registration &amp; Eligibility</h2>
      <p>
        To open an Account you must be at least 18 years old (or the age of
        legal capacity in your jurisdiction), be able to form a legally
        binding contract, and not be prohibited from using the Services
        under applicable law or under any sanctions or watchlist.
      </p>
      <p>You agree to:</p>
      <ul>
        <li>Provide true, accurate, current and complete information during registration and at any time thereafter (“Registration Data”);</li>
        <li>Maintain the confidentiality and security of your password, PIN, OTP, 2FA secret, passkey and biometric data;</li>
        <li>Notify us immediately of any unauthorised use of your Account or any other security breach;</li>
        <li>Be responsible for all activities that occur under your Account, whether or not you authorised them;</li>
        <li>Have only one active GaexPay Account at any given time, unless we expressly permit additional Accounts (e.g. for separate business entities);</li>
        <li>Not transfer or assign your Account to anyone else without our prior written consent.</li>
      </ul>
      <p>
        We may refuse to open, or may close, an Account at our discretion,
        including where required by AML Laws or where the Registration Data
        cannot be verified.
      </p>

      <h2 id="account-types">4. Account Types</h2>
      <p>GaexPay offers two main Account types, each with its own features and limits:</p>

      <h3>4.1 Personal Account</h3>
      <p>
        A Personal Account is for individual Users to send and receive money,
        hold multi-currency Wallets, buy and sell crypto, pay bills, purchase
        from Marketplace Sellers and use the Social Network. Personal
        Accounts are non-commercial; using a Personal Account to operate a
        business is a breach of these Terms.
      </p>

      <h3>4.2 Business Account</h3>
      <p>
        A Business Account is for legal entities (companies, partnerships,
        sole proprietors, registered NGOs). Business Accounts support
        multiple team members with role-based permissions, payroll, invoicing,
        merchant QR checkout, an API for programmatic payments, developer
        portal access and elevated transaction limits. Business Accounts
        require KYB verification (see Section 5).
      </p>

      <h3>4.3 GaexPay Pro &amp; Enterprise</h3>
      <p>
        Paid subscription tiers that unlock higher limits, multi-entity
        treasury management, white-label branding, dedicated support and
        advanced compliance tooling. Pro and Enterprise subscriptions are
        billed monthly or annually and are non-refundable except as required
        by law.
      </p>

      <h2 id="kyc">5. KYC / KYB Verification</h2>
      <p>
        As a regulated financial institution, we are required by AML Laws to
        verify the identity of every User before providing Services. By
        opening an Account you agree to:
      </p>
      <ul>
        <li>Provide a valid government-issued photo ID (passport, national ID card or driver’s licence);</li>
        <li>Complete a liveness check by taking a live selfie video;</li>
        <li>Provide proof of address (utility bill, bank statement or government letter dated within the last 90 days);</li>
        <li>Disclose your occupation, source of funds and expected transaction activity;</li>
        <li>For Business Accounts: provide the certificate of incorporation, registered address, beneficial-ownership structure and KYC data for each director, authorised signer and UBO owning 25% or more;</li>
        <li>Consent to ongoing screening against sanctions lists, PEP lists and adverse-media databases;</li>
        <li>Authorise us to obtain verification results from third-party KYC/KYB providers.</li>
      </ul>
      <p>
        Verification is tiered. Higher tiers unlock higher transaction
        limits and additional features. We may, at any time, request
        additional documentation, restrict your Account pending
        verification, or refuse to upgrade your tier.
      </p>
      <p>
        You authorise us to retain your KYC/KYB data for the period required
        by AML Laws (typically 5 years after Account closure) even if you
        close your Account.
      </p>

      <h2 id="wallets">6. Wallet Services &amp; Multi-Currency Support</h2>
      <p>
        GaexPay Wallets allow you to hold, send and receive funds in multiple
        supported currencies (currently USD, EUR, GBP, NGN, KES, GHS, ZAR,
        UGX and TZS — the list may change from time to time). Each Wallet is
        denominated in a single currency; conversions between Wallets use the
        live FX rate displayed in the App plus any applicable FX margin
        disclosed in the Fee Schedule.
      </p>
      <p>
        Funds held in a GaexPay Wallet are electronic money (“e-money”)
        issued by our banking-as-a-service partner. E-money is fully backed
        by safeguarded funds held in a segregated account at a regulated
        bank. GaexPay Wallets are <strong>not</strong> bank accounts, are not
        insured by the FDIC, FSCS, NDIC or any other deposit-insurance
        scheme, and do not earn interest unless we offer an explicit
        interest-bearing savings product.
      </p>
      <p>
        You may top up your Wallet by bank transfer, card payment, mobile
        money or crypto deposit. You may withdraw funds by bank transfer,
        mobile money or crypto withdrawal (where supported). Wallet balances
        may not be negative; we may reject any Transaction that would result
        in a negative balance.
      </p>

      <h2 id="crypto">7. Cryptocurrency Services</h2>
      <p>
        GaexPay offers cryptocurrency-related Services including buy, sell,
        swap, stake and cash-out of supported digital assets. Cryptocurrency
        Services are provided by GaexPay’s crypto subsidiary and are subject
        to the following additional conditions:
      </p>
      <ul>
        <li>
          <strong>Eligibility.</strong> Crypto Services are not available in
          jurisdictions where they are prohibited. We will restrict access
          based on your country of residence and may at any time suspend
          access if your country changes its regulatory stance.
        </li>
        <li>
          <strong>Risk acknowledgement.</strong> Cryptocurrencies are highly
          volatile and largely unregulated. You may lose some or all of your
          investment. You are responsible for understanding the risks before
          trading. Nothing on the App is investment advice.
        </li>
        <li>
          <strong>Self-custody.</strong> You may deposit crypto from, or
          withdraw crypto to, a self-custody wallet you control. You are
          solely responsible for the accuracy of recipient addresses. We
          cannot reverse an on-chain Transaction sent to the wrong address.
        </li>
        <li>
          <strong>Staking.</strong> By staking an asset you delegate it to a
          validator and lock it for the staking period. Early unstaking may
          be subject to a protocol-imposed penalty and may not be available
          during the unbonding period.
        </li>
        <li>
          <strong>Swap.</strong> Swaps execute via integrated DEX aggregators
          (1inch, Uniswap, PancakeSwap) and centralised liquidity partners.
          The final settlement amount may differ from the indicative quote
          due to slippage, gas-price changes and liquidity shifts. You
          confirm the maximum acceptable slippage in the App before each
          swap.
        </li>
        <li>
          <strong>Cash-out.</strong> Crypto-to-fiat cash-out settles funds
          to your Wallet or to your linked bank account. Settlement times
          depend on the rail used (instant to Wallet, 1–3 business days to
          bank).
        </li>
        <li>
          <strong>Forks &amp; airdrops.</strong> We will make commercially
          reasonable efforts to support forks and airdrops for assets we
          list, but we are not obligated to do so. We may delist any asset
          at any time with reasonable notice.
        </li>
      </ul>

      <h2 id="momo">8. Mobile Money &amp; Bill Payment Services</h2>
      <p>
        GaexPay integrates with mobile money operators (MTN MoMo, Orange
        Money, Airtel Money, Moov Money, M-PESA, Telecel Cash and others)
        so you can top up, send to, and withdraw from mobile money wallets
        in supported countries. Mobile money Transactions are subject to the
        operator’s own terms, limits and downtime, which we do not control.
      </p>
      <p>
        Bill Payment lets you pay utility, broadband, satellite-TV,
        insurance, tax and school-fee bills directly from your Wallet. We
        act as your agent in transmitting the payment to the biller; the
        biller is responsible for crediting your account with them. Please
        retain your GaexPay receipt as proof of payment.
      </p>
      <p>
        Airtime and data bundle purchases are non-refundable once
        successfully delivered to the carrier. If a top-up fails, we will
        reverse the charge to your Wallet.
      </p>

      <h2 id="marketplace">9. Marketplace &amp; Social Features</h2>
      <h3>9.1 Marketplace</h3>
      <p>
        The GaexPay Marketplace is a platform that connects Buyers and
        Sellers. We are <strong>not</strong> a party to any contract of sale
        between a Buyer and a Seller and we do <strong>not</strong> take
        title to any goods or services sold. We provide the platform,
        payment processing, dispute resolution and (in some cases) escrow.
      </p>
      <p>
        Sellers must accurately describe goods and services, fulfil orders
        promptly, comply with all applicable consumer-protection laws, and
        only list items they are authorised to sell. Prohibited listings
        include counterfeit goods, illegal items, weapons, drugs,
        prescription medication, regulated financial products, and anything
        that infringes intellectual-property rights.
      </p>
      <p>
        Buyers may open a dispute within 14 days of delivery for non-receipt
        or significantly-not-as-described items. GaexPay will mediate and
        may refund the Buyer from funds held in escrow or from the Seller’s
        Wallet. Repeated Seller violations may result in suspension.
      </p>

      <h3>9.2 Social Network</h3>
      <p>
        GaexPay includes social features that allow you to post updates,
        comment, follow other Users, send direct messages, broadcast live
        streams and receive donations. You are solely responsible for the
        content you post. You grant GaexPay a worldwide, non-exclusive,
        royalty-free licence to host, store, reproduce, display and process
        your content for the purpose of operating the Social Network.
      </p>
      <p>You agree not to post content that:</p>
      <ul>
        <li>Is unlawful, defamatory, harassing, hateful, or incites violence;</li>
        <li>Infringes another’s intellectual property or privacy rights;</li>
        <li>Depicts sexually explicit content, especially involving minors;</li>
        <li>Promotes terrorism, money laundering, fraud or other crimes;</li>
        <li>Impersonates another person or discloses their personal data without consent;</li>
        <li>Contains malware, phishing links or other malicious code.</li>
      </ul>
      <p>
        We may remove content and suspend or terminate Accounts that violate
        these rules, on our own initiative or in response to a report.
      </p>

      <h3>9.3 Live Streams &amp; Donations</h3>
      <p>
        Creators may receive donations from viewers. Donations are
        non-refundable except where required by law or where GaexPay
        determines, in its sole discretion, that the donation was the result
        of fraud. GaexPay charges a platform fee on donations, as set out in
        the Fee Schedule.
      </p>

      <h2 id="fees">10. Fees &amp; Commissions</h2>
      <p>
        We charge fees for many of the Services. The fees are set out in the
        Fee Schedule, which is available in the App at <em>Settings → Fees</em>
        and at <a href="https://gaexpay.app/fees">gaexpay.app/fees</a>. The
        Fee Schedule forms part of these Terms. We may change fees on 30
        days’ notice.
      </p>
      <p>Typical fees include:</p>
      <ul>
        <li><strong>Transfer fee</strong> — a percentage or flat fee per Transaction, varying by corridor and method;</li>
        <li><strong>FX margin</strong> — a spread above the mid-market rate when converting currencies;</li>
        <li><strong>Card fees</strong> — issuance fee, monthly maintenance fee, ATM withdrawal fee, cross-border fee;</li>
        <li><strong>Crypto fees</strong> — trading commission, swap network fee, staking protocol commission, withdrawal network fee;</li>
        <li><strong>Bill pay &amp; airtime fee</strong> — flat fee per payment;</li>
        <li><strong>Marketplace fee</strong> — commission on each sale, charged to the Seller;</li>
        <li><strong>Donation fee</strong> — platform fee on each donation received by a Creator;</li>
        <li><strong>Pro/Enterprise subscription</strong> — monthly or annual subscription fee;</li>
        <li><strong>Chargeback fee</strong> — assessed where a cardholder disputes a card Transaction;</li>
        <li><strong>NSF / failed-payment fee</strong> — assessed where a top-up or transfer is returned by the originating bank.</li>
      </ul>
      <p>
        All fees are disclosed in the App <strong>before</strong> you confirm
        each Transaction. By confirming a Transaction, you authorise us to
        deduct the displayed fee from your Wallet.
      </p>

      <h2 id="limits">11. Transaction Limits &amp; Processing Times</h2>
      <p>
        Transaction limits depend on your verification tier, Account type,
        the corridor and the rail used. Limits are displayed in the App and
        may be changed at any time. We may impose temporary limits for
        security, fraud-prevention or regulatory reasons.
      </p>
      <p>Typical processing times (indicative only):</p>
      <table>
        <thead>
          <tr>
            <th>Transaction Type</th>
            <th>Processing Time</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>GaexPay-to-GaexPay transfer</td><td>Instant</td></tr>
          <tr><td>Wallet-to-mobile-money transfer</td><td>Seconds to 10 minutes</td></tr>
          <tr><td>Wallet-to-bank transfer (same country)</td><td>Instant to 2 hours</td></tr>
          <tr><td>Wallet-to-bank transfer (cross-border, SWIFT)</td><td>1–4 business days</td></tr>
          <tr><td>Card payment</td><td>Instant authorisation; settlement 1–3 days</td></tr>
          <tr><td>Crypto deposit</td><td>After network confirmations (minutes to hours)</td></tr>
          <tr><td>Crypto withdrawal</td><td>Within 30 minutes (subject to network congestion)</td></tr>
          <tr><td>Crypto-to-fiat cash-out to Wallet</td><td>Instant</td></tr>
          <tr><td>Crypto-to-fiat cash-out to bank</td><td>1–3 business days</td></tr>
          <tr><td>Bill payment</td><td>Instant to 1 business day (biller-dependent)</td></tr>
          <tr><td>Card top-up / Wallet top-up by card</td><td>Instant</td></tr>
        </tbody>
      </table>
      <p>
        We are not liable for delays caused by third-party rails, network
        congestion, bank holidays, AML holds or force-majeure events.
      </p>

      <h2 id="responsibilities">12. User Responsibilities &amp; Acceptable Use</h2>
      <p>You agree to use the Services only for lawful purposes and in compliance with these Terms. You will:</p>
      <ul>
        <li>Use your real identity and provide accurate Registration Data;</li>
        <li>Use the Services only for your own transactions and not as an agent for unverified third parties;</li>
        <li>Ensure you have sufficient funds before initiating a Transaction;</li>
        <li>Provide complete and accurate beneficiary details for every Transaction;</li>
        <li>Cooperate with our KYC, AML and fraud-prevention checks;</li>
        <li>Keep your contact details current so we can reach you with security alerts;</li>
        <li>Comply with all laws applicable to your Transactions, including tax laws and foreign-exchange controls;</li>
        <li>Not attempt to reverse-engineer, scrape, crawl or overload the App;</li>
        <li>Not use the Services in a manner that could damage, disable, overburden or impair the App;</li>
        <li>Not use another User’s Account without their explicit authorisation.</li>
      </ul>

      <h2 id="prohibited">13. Prohibited Activities</h2>
      <p>You are strictly prohibited from using the Services to:</p>
      <ul>
        <li><strong>Launder the proceeds of crime</strong> or otherwise conceal the illicit origin of funds;</li>
        <li><strong>Finance terrorism</strong> or provide material support to sanctioned individuals, entities or jurisdictions;</li>
        <li><strong>Transact with sanctioned parties</strong> — individuals, entities or countries subject to sanctions administered by OFAC, the UN, the EU, HMT or any other applicable sanctions authority;</li>
        <li><strong>Engage in fraud</strong> — including stolen-card payments, account takeover, identity theft, chargeback fraud, refund fraud, marketplace non-delivery fraud, or romance scams;</li>
        <li><strong>Structure transactions</strong> to evade reporting thresholds or KYC requirements;</li>
        <li><strong>Operate an unlicensed money-transmission business</strong> or MSB using your GaexPay Account;</li>
        <li><strong>Purchase or sell</strong> illegal drugs, weapons, counterfeit goods, prescription medication, endangered species, or any item whose sale is prohibited by law;</li>
        <li><strong>Facilitate</strong> Ponzi schemes, pyramid schemes, unregistered securities offerings or other investment fraud;</li>
        <li><strong>Use another person’s payment instrument</strong> without their consent;</li>
        <li><strong>Open multiple Accounts</strong> to circumvent limits or enforcement actions;</li>
        <li><strong>Manipulate crypto markets</strong> — wash trading, spoofing, layering, front-running or pump-and-dump schemes;</li>
        <li><strong>Mine cryptocurrencies</strong> using the App or our infrastructure;</li>
        <li><strong>Reverse, charge back or contest</strong> a Transaction that you authorised, other than in good faith and with a legitimate basis;</li>
        <li><strong>Resell or sublicense</strong> access to the Services without our prior written consent;</li>
        <li><strong>Use the Social Network</strong> to harass, threaten, defame, doxx or impersonate other Users.</li>
      </ul>
      <p>
        We may suspend, restrict or terminate any Account, reverse
        Transactions, freeze funds and report violations to law enforcement
        and regulators. We may also be required by law to file a Suspicious
        Activity Report, which we are not permitted to disclose to you.
      </p>

      <h2 id="security-resp">14. Security Responsibilities</h2>
      <p>
        You play a critical role in keeping your Account secure. You are
        responsible for:
      </p>
      <ul>
        <li>Choosing a strong, unique password and changing it periodically;</li>
        <li><strong>Enabling two-factor authentication (2FA)</strong> — this is mandatory on all Accounts. Supported 2FA methods include TOTP authenticator apps, hardware security keys (WebAuthn / FIDO2) and passkeys;</li>
        <li>Keeping your 2FA device and backup codes safe;</li>
        <li>Keeping your device’s operating system, browser and GaexPay App up to date;</li>
        <li>Not sharing your password, PIN, OTP, 2FA secret or passkey with anyone, including anyone claiming to be GaexPay support;</li>
        <li>Using device-level biometric lock (Face ID / Touch ID / Windows Hello) where available;</li>
        <li>Avoiding public or untrusted Wi-Fi when accessing the App, or using a VPN;</li>
        <li>Reporting any suspicious email, SMS, in-app message or phone call claiming to be from GaexPay to <a href="mailto:security@gaexpay.app">security@gaexpay.app</a>;</li>
        <li>Reviewing your Transaction history regularly and reporting unauthorised Transactions within 60 days of the statement date.</li>
      </ul>
      <p>
        Under the Electronic Fund Transfer Act (US) and the Payment Services
        Regulations (EU/UK), your liability for unauthorised Transactions may
        be limited if you notify us promptly. Failure to notify us within the
        prescribed period may increase your liability.
      </p>

      <h2 id="ip">15. Intellectual Property</h2>
      <p>
        The App, the GaexPay name and logo, the GaexPay mark, the Gaxie AI
        assistant, the GaexPay unified-address system, the Gaex Token, all
        software, source code, designs, text, graphics, icons and
        documentation provided through the App (the “<strong>GaexPay
        IP</strong>”) are owned by GaexPay or its licensors and are protected
        by intellectual-property laws.
      </p>
      <p>
        We grant you a personal, non-exclusive, non-transferable, revocable
        licence to access and use the App for the purpose of using the
        Services, in accordance with these Terms. You may not copy, modify,
        distribute, sell, lease, or create derivative works from the GaexPay
        IP, except as expressly permitted by these Terms or by applicable
        law.
      </p>
      <p>
        Open-source software used in the App is licensed under the terms of
        its respective licence. See our <a href="/licenses">Licenses page</a>{" "}
        for the full list and attribution notices.
      </p>
      <p>
        Feedback you provide to us about the App is voluntary, and we may use
        it without restriction or compensation to you.
      </p>

      <h2 id="disclaimers">16. Disclaimers &amp; Limitations of Liability</h2>
      <h3>16.1 No Warranties</h3>
      <p>
        The Services are provided “<strong>as is</strong>” and “<strong>as
        available</strong>”, without warranties of any kind, whether express,
        implied or statutory. To the maximum extent permitted by law, we
        disclaim all warranties, including any implied warranties of
        merchantability, fitness for a particular purpose, title and
        non-infringement, and any warranty that the Services will be
        uninterrupted, error-free, secure or accurate.
      </p>
      <p>
        Cryptocurrency Services are provided with additional risk warnings
        as set out in Section 7.
      </p>

      <h3>16.2 Limitation of Liability</h3>
      <p>
        To the maximum extent permitted by law, in no event will GaexPay, its
        affiliates, officers, directors, employees or licensors be liable to
        you for any indirect, incidental, special, consequential or punitive
        damages, or for any loss of profits, loss of revenue, loss of data,
        loss of goodwill or loss of crypto assets, arising out of or in
        connection with these Terms or the Services, whether in contract,
        tort (including negligence), under statute or any other theory of
        liability.
      </p>
      <p>
        Our aggregate liability for any claim arising out of or in connection
        with the Services is limited to the greater of (a) the total fees
        you paid us in the 12 months preceding the event giving rise to the
        claim, or (b) USD 100.
      </p>
      <p>
        Nothing in these Terms excludes or limits liability that cannot be
        excluded or limited under applicable law, including liability for
        death or personal injury caused by negligence, fraud or wilful
        misconduct.
      </p>

      <h3>16.3 Force Majeure</h3>
      <p>
        We will not be liable for any failure or delay in performing our
        obligations under these Terms to the extent caused by events beyond
        our reasonable control, including natural disasters, war, terrorism,
        civil unrest, pandemics, government action, labour disputes, power
        outages, internet or telecommunications failures, blockchain network
        congestion, or acts of God.
      </p>

      <h2 id="indemnification">17. Indemnification</h2>
      <p>
        You agree to indemnify, defend and hold harmless GaexPay, its
        affiliates, officers, directors, employees and licensors from and
        against any and all claims, damages, losses, liabilities, costs and
        expenses (including reasonable attorneys’ fees) arising out of or in
        connection with:
      </p>
      <ul>
        <li>Your breach of these Terms or the documents incorporated by reference;</li>
        <li>Your violation of any applicable law or the rights of any third party;</li>
        <li>Your use of the Services, including any Transaction you initiate;</li>
        <li>Your content posted on the Marketplace or Social Network;</li>
        <li>Any fraud, misrepresentation or inaccurate information you provide;</li>
        <li>Any dispute between you and another User.</li>
      </ul>
      <p>
        We reserve the right, at our own expense, to assume the exclusive
        defence and control of any matter otherwise subject to
        indemnification by you, in which case you will cooperate with us in
        asserting any available defences. You may not settle any matter
        without our prior written consent.
      </p>

      <h2 id="disputes">18. Dispute Resolution &amp; Governing Law</h2>
      <h3>18.1 Governing Law</h3>
      <p>
        These Terms and any dispute arising out of or in connection with them
        are governed by the laws of the State of Delaware, USA, without
        regard to its conflict-of-laws principles. For Users in the EU/UK,
        the laws of Ireland (EU) or England &amp; Wales (UK) apply to the
        extent required by mandatory consumer-protection law. For Users in
        Nigeria, the laws of the Federal Republic of Nigeria apply.
      </p>

      <h3>18.2 Informal Resolution</h3>
      <p>
        Before filing a formal dispute, you agree to first contact us at{" "}
        <a href="mailto:legal@gaexpay.app">legal@gaexpay.app</a> and attempt
        in good faith to resolve the dispute informally within 60 days.
      </p>

      <h3>18.3 Arbitration (US Users)</h3>
      <p>
        Except for small-claims matters and matters that may be brought
        before a governmental agency, any dispute that is not resolved
        informally will be resolved by binding individual arbitration
        administered by the American Arbitration Association under its
        Consumer Arbitration Rules. The arbitrator may not consolidate
        claims. Judgment on the award may be entered in any court of
        competent jurisdiction.
      </p>

      <h3>18.4 Class-Action Waiver</h3>
      <p>
        You and GaexPay agree that each may bring claims against the other
        only in an individual capacity and not as a plaintiff or class
        member in any purported class, consolidated or representative
        proceeding.
      </p>

      <h3>18.5 EU/UK Consumers</h3>
      <p>
        If you are a consumer in the EU or UK, you may bring proceedings in
        the courts of the EU member state or UK nation where you reside, and
        you may invoke the mandatory consumer-protection provisions of that
        jurisdiction.
      </p>

      <h2 id="suspension">19. Account Suspension &amp; Termination</h2>
      <p>
        You may close your Account at any time from <em>Settings → Security →
        Close Account</em>, provided that all Transactions have settled, no
        disputes are open and your Wallet balance is zero (withdraw any
        remaining funds first). We will close your Account and retain your
        KYC/transaction data as required by law.
      </p>
      <p>
        We may suspend, restrict or terminate your Account, freeze funds and
        reverse Transactions, immediately and without prior notice, where:
      </p>
      <ul>
        <li>We are required to do so by AML Laws, sanctions, a court order or law-enforcement request;</li>
        <li>We suspect fraud, money laundering, terrorist financing or other illegal activity;</li>
        <li>You breach these Terms or any Additional Terms;</li>
        <li>You provide false, inaccurate or misleading information;</li>
        <li>Your Account is inactive for more than 24 months;</li>
        <li>We discontinue a Service or change our business model;</li>
        <li>We reasonably believe that continued access would expose us, our partners or other Users to risk.</li>
      </ul>
      <p>
        Where we suspend or terminate for reasons other than your breach, we
        will give reasonable notice and return any funds in your Wallet
        (minus outstanding fees and amounts owed to us) subject to KYC and
        AML checks.
      </p>
      <p>
        The following Sections survive termination: 12 (User
        Responsibilities), 13 (Prohibited Activities), 16 (Disclaimers &amp;
        Liability), 17 (Indemnification), 18 (Dispute Resolution) and any
        other provision that by its nature should survive.
      </p>

      <h2 id="changes">20. Changes to These Terms</h2>
      <p>
        We may modify these Terms from time to time. When we make material
        changes, we will:
      </p>
      <ul>
        <li>Post the updated Terms on this page with a new “Last updated” date;</li>
        <li>Notify you by email and via an in-app banner at least 30 days before the changes take effect;</li>
        <li>For changes that materially reduce your rights, prompt you to accept the new Terms before continuing to use the Services.</li>
      </ul>
      <p>
        Continued use of the Services after the effective date constitutes
        acceptance of the updated Terms. If you do not agree, you must close
        your Account before the effective date.
      </p>

      <h2 id="contact">21. Contact Information</h2>
      <p>
        GaexPay Inc.<br />
        1209 Orange Street, Wilmington, DE 19801, USA<br />
        Legal: <a href="mailto:legal@gaexpay.app">legal@gaexpay.app</a><br />
        Support: <a href="mailto:support@gaexpay.app">support@gaexpay.app</a><br />
        Security: <a href="mailto:security@gaexpay.app">security@gaexpay.app</a><br />
        Phone (US): +1 (302) 555-0142
      </p>
      <p>
        EU representative: GaexPay Ireland Ltd., 5 Harbourmaster Place, IFSC,
        Dublin 1, Ireland.
      </p>
      <p>
        For any questions about these Terms, please contact us at{" "}
        <a href="mailto:legal@gaexpay.app">legal@gaexpay.app</a>.
      </p>
    </LegalLayout>
  );
}
