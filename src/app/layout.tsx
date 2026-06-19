import type { Metadata } from "next";
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
  title: "GaexPay — Borderless Digital Wallet & Payments",
  description:
    "GaexPay is a cross-platform fintech wallet for instant transfers, mobile money, multi-currency wallets, card payments, QR checkout and global remittance.",
  keywords: [
    "GaexPay", "fintech", "digital wallet", "mobile money", "payments",
    "money transfer", "QR payment", "virtual card", "KYC", "remittance",
  ],
  authors: [{ name: "GaexPay Inc." }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "GaexPay — Borderless Digital Wallet",
    description: "Send, spend and save across Africa and the world.",
    siteName: "GaexPay",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
