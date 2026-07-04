import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Shield, Cookie, Scale } from "lucide-react";
import { Logo } from "@/components/gaexpay/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * LegalLayout — shared chrome for /privacy, /terms, /cookies, /licenses.
 *
 * Server-component friendly: no hooks, no client JS, just a sticky TOC
 * sidebar of anchor links (click-to-jump; no scroll-spy to keep it pure SSR)
 * and a hero header with the GaexPay logo, page title, and "Last updated"
 * date. The body is rendered with the `.legal-prose` class so the custom
 * typography in globals.css applies.
 *
 * Mobile-first: the TOC collapses below the content on small screens and
 * the layout drops to a single column.
 */

export interface TocItem {
  id: string;
  label: string;
}

export interface LegalLayoutProps {
  title: string;
  /** Short one-line description shown under the title. */
  subtitle?: string;
  /** ISO date string e.g. "2025-01-15". */
  lastUpdated: string;
  /** Lucide icon for the hero. Defaults to FileText. */
  icon?: "shield" | "file" | "cookie" | "scale";
  /** Optional table-of-contents entries. Hidden when empty. */
  toc?: TocItem[];
  /** Optional cross-links to the other legal pages. */
  relatedLinks?: { href: string; label: string }[];
  children: React.ReactNode;
}

const ICONS = {
  shield: Shield,
  file: FileText,
  cookie: Cookie,
  scale: Scale,
} as const;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function LegalLayout({
  title,
  subtitle,
  lastUpdated,
  icon = "file",
  toc = [],
  relatedLinks = [],
  children,
}: LegalLayoutProps) {
  const Icon = ICONS[icon];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="GaexPay home"
          >
            <Logo size={28} />
          </Link>
          <nav
            className="hidden sm:flex items-center gap-1 text-sm"
            aria-label="Legal pages"
          >
            <LegalNav href="/privacy" label="Privacy" />
            <LegalNav href="/terms" label="Terms" />
            <LegalNav href="/cookies" label="Cookies" />
            <LegalNav href="/licenses" label="Licenses" />
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-12 lg:py-16">
          <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider mb-3">
            <Icon className="size-4" aria-hidden="true" />
            <span>Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-balance">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl text-pretty">
              {subtitle}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full bg-primary animate-pulse"
                aria-hidden="true"
              />
              Last updated:{" "}
              <time dateTime={lastUpdated} className="font-medium text-foreground">
                {formatDate(lastUpdated)}
              </time>
            </span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              GaexPay Inc.
            </span>
          </div>
        </div>
      </section>

      {/* ── Body: TOC sidebar + content ─────────────────────────────── */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-12 lg:py-16">
          <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
            {/* TOC — sticky on desktop, collapsed panel on mobile */}
            {toc.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto no-scrollbar">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
                    On this page
                  </p>
                  <nav aria-label="Table of contents" className="space-y-0.5">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="legal-toc-link"
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>

                  {relatedLinks.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
                        Related
                      </p>
                      <nav className="space-y-1">
                        {relatedLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="legal-toc-link"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </nav>
                    </div>
                  )}
                </div>
              </aside>
            )}

            {/* Content */}
            <article className="legal-prose min-w-0">{children}</article>
          </div>

          {/* Mobile-related links (shown when no TOC, or always below content) */}
          {relatedLinks.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Related documents
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedLinks.map((link) => (
                  <Button
                    key={link.href}
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo size={28} showText={false} />
              <div className="text-sm">
                <p className="font-semibold text-foreground">GaexPay Inc.</p>
                <p className="text-muted-foreground">
                  © {new Date().getFullYear()} GaexPay. All rights reserved.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className={cn("group")}>
              <Link href="/">
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-primary transition-colors">
              Cookie Policy
            </Link>
            <Link href="/licenses" className="hover:text-primary transition-colors">
              Licenses
            </Link>
            <span className="ml-auto">Need help? legal@gaexpay.app</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LegalNav({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {label}
    </Link>
  );
}

export default LegalLayout;
