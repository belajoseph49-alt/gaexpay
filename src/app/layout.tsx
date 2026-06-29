import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gaexpay.app"),
  title: {
    default: "GaexPay — Borderless Digital Wallet & Payments",
    template: "%s · GaexPay",
  },
  description:
    "GaexPay is a cross-platform fintech wallet for instant transfers, mobile money, multi-currency wallets, crypto buy/swap/trade, virtual cards, QR checkout and global remittance. Installable on web, iOS, Android, Windows, macOS and Linux.",
  applicationName: "GaexPay",
  keywords: [
    "GaexPay", "fintech", "digital wallet", "mobile money", "payments",
    "money transfer", "QR payment", "virtual card", "KYC", "remittance",
    "crypto", "bitcoin", "USDT", "stablecoin", "PWA", "installable wallet",
    "multi-currency", "cross-platform",
  ],
  authors: [{ name: "GaexPay Inc." }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.svg"],
  },
  appleWebApp: {
    capable: true,
    title: "GaexPay",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  openGraph: {
    title: "GaexPay — Borderless Digital Wallet",
    description:
      "Send, spend, save & exchange across 9+ currencies. Instant mobile money, bank transfers, QR payments, crypto and virtual cards — installable on every platform.",
    siteName: "GaexPay",
    type: "website",
    images: [
      { url: "/icon-512.png", width: 512, height: 512, alt: "GaexPay" },
      { url: "/screenshot-wide.png", width: 1280, height: 720, alt: "GaexPay desktop dashboard" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GaexPay — Borderless Digital Wallet",
    description:
      "Cross-platform fintech wallet: instant transfers, mobile money, multi-currency, crypto, virtual cards & QR.",
    images: ["/screenshot-wide.png"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "GaexPay",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "application-name": "GaexPay",
    "msapplication-TileColor": "#7C3AED",
    "msapplication-tap-highlight": "no",
    "msapplication-starturl": "/",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <head>
        {/* Prevent translation extensions from modifying DOM (causes removeChild errors) */}
        <meta name="google" content="notranslate" />
        <meta name="translate" content="no" />
        {/* Safari pinned-tab mask icon (not exposed via the metadata API) */}
        <link rel="mask-icon" href="/icon.svg" color="#7C3AED" />
        {/* iOS launch screen background colour while the PWA is hydrating */}
        <meta name="apple-mobile-web-app-status-bar-inset" content="#0a0f0d" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground notranslate`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
