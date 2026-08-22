import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { ThemeToggle } from "../components/theme-toggle";
import { RevealObserver } from "../components/reveal-observer";
import { PageViewTracker } from "../components/page-view-tracker";
import { SITE_NAME, SITE_URL } from "../lib/site";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PaymentCalcs: Australian financial calculators that show their working",
    template: "%s · PaymentCalcs",
  },
  description:
    "Deterministic Australian pay, tax, mortgage and business calculators. Every result shows its working, assumptions, sources and limitations.",
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_AU",
    // Relative "./" resolves against metadataBase PER ROUTE, giving each page
    // its own og:url — an absolute value here would stamp the site root on
    // every page. Verified in the build output before shipping.
    url: "./",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, "max-image-preview": "large" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Runs before paint. Dark (black) is the design's native mode (STRATA source);
 * a stored light preference is honoured with no flash. */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("pc-theme");document.documentElement.setAttribute("data-theme",s==="light"?"light":"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

/**
 * Sitewide entity graph. Static and server-rendered: no user input, no
 * fabricated claims. Deliberately carries no SearchAction — there is no
 * site-search endpoint to point one at.
 */
const SITE_DESCRIPTION =
  "Deterministic Australian financial calculators — pay, tax, mortgage, loans, savings and business. Every result shows its working, assumptions, sources and limitations; statutory values come from versioned rule packs citing official sources.";

const SITE_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      logo: `${SITE_URL}/icon`,
      sameAs: ["https://github.com/txc0ld/paymentcals"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "team@fantomlabs.io",
        url: `${SITE_URL}/contact`,
        availableLanguage: "English",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en-AU",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      inLanguage: "en-AU",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning className="scroll-smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body
        className={`${jakarta.variable} ${geistMono.variable} min-h-[100dvh] bg-canvas text-ink selection:bg-accent selection:text-accent-contrast`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SITE_JSON_LD }} />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:min-h-11 focus:border focus:border-hairline-strong focus:bg-surface focus:px-4 focus:py-3 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.14em]"
        >
          Skip to content
        </a>

        <header className="no-print fixed top-0 z-50 w-full mix-blend-difference">
          <nav
            aria-label="Primary"
            className="mx-auto flex min-h-16 w-full max-w-[100rem] items-center justify-between px-4 text-white md:px-8"
          >
            <Link
              href="/"
              className="flex min-h-11 items-center gap-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="PaymentCalcs home"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" />
                <circle cx="12" cy="12" r="4" fill="white" />
              </svg>
              <span className="font-mono text-xs uppercase tracking-[0.2em]">PaymentCalcs</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/calculators"
                className="hidden min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 transition-colors duration-500 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
              >
                Calculators
              </Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>

        <main id="main" className="relative z-10 min-w-0 pt-16">{children}</main>

        <footer className="no-print relative z-10 mt-24 border-t border-hairline px-4 pb-10 pt-12 md:px-8">
          <div className="mx-auto grid w-full max-w-[100rem] gap-10 md:grid-cols-3">
            <div className="grid content-start gap-4">
              <span className="flex items-center gap-3 text-ink">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="12" cy="12" r="4" fill="currentColor" />
                </svg>
                <span className="font-mono text-xs uppercase tracking-[0.2em]">PaymentCalcs</span>
              </span>
              <p className="max-w-xs text-[13px] leading-5 text-ink-3">
                Deterministic calculators for Australian money decisions. Every figure shows its
                working, its assumptions and its sources.
              </p>
              <a
                href="https://fantomlabs.io"
                rel="noopener"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 transition-colors duration-500 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                A website by Fantom Labs ↗
              </a>
            </div>
            <div className="grid content-start gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span className="text-ink-2">Trust</span>
              <Link href="/sources" className="transition-colors duration-500 hover:text-ink">Sources &amp; rule packs</Link>
              <Link href="/changelog" className="transition-colors duration-500 hover:text-ink">Changelog</Link>
              <Link href="/about" className="transition-colors duration-500 hover:text-ink">About</Link>
              <Link href="/contact" className="transition-colors duration-500 hover:text-ink">Contact</Link>
              <Link href="/privacy" className="transition-colors duration-500 hover:text-ink">Privacy</Link>
              <span>Your numbers stay on your device</span>
              <span>No accounts. No ads.</span>
            </div>
            <div className="grid content-start gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span className="text-ink-2">Status</span>
              <span>P0 build · pre-launch preview</span>
              <Link href="/developers" className="transition-colors duration-500 hover:text-ink">For developers &amp; agents</Link>
              <span>© {new Date().getFullYear()} PaymentCalcs</span>
            </div>
          </div>
        </footer>

        <RevealObserver />
        <PageViewTracker />
        {process.env.NODE_ENV === "production" ? (
          // script.manual.js: no automatic pageviews. The URL carries scenario
          // state in ?s=, so pageviews are emitted path-only through
          // analytics-safe (PageViewTracker) — never the full URL (§18.4).
          <Script
            defer
            data-domain="paymentcalcs.com"
            src="https://plausible.io/js/script.manual.js"
            strategy="afterInteractive"
          />
        ) : null}
        {process.env.NODE_ENV === "production" ? (
          // Owner-approved exception to the analytics-safe-only rule (2026-08-22).
          // Caveat: auto-tracks full URLs including ?s= scenario state — see §18.4.
          <Script
            async
            data-key="b8lMHh3xHhRhvXuaku6K8A"
            src="https://analytics.ahrefs.com/analytics.js"
            strategy="afterInteractive"
          />
        ) : null}
        {process.env.NODE_ENV === "production" ? (
          // Google Analytics 4 — owner-approved (2026-08-22). Sets cookies;
          // disclosed on /privacy. Same §18.4 full-URL caveat as Ahrefs.
          <>
            <Script
              async
              src="https://www.googletagmanager.com/gtag/js?id=G-G68G9EJR79"
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-G68G9EJR79');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
