import type { Metadata, Viewport } from "next";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { ThemeToggle } from "../components/theme-toggle";
import { RevealObserver } from "../components/reveal-observer";
import { PageViewTracker } from "../components/page-view-tracker";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["500"], variable: "--font-montserrat" });

export const metadata: Metadata = {
  metadataBase: new URL("https://paymentcalcs.com"),
  title: {
    default: "PaymentCalcs: Australian financial calculators that show their working",
    template: "%s · PaymentCalcs",
  },
  description:
    "Deterministic Australian pay, tax, mortgage and business calculators. Every result shows its working, assumptions, sources and limitations.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#050607" },
  ],
};

/** Runs before paint: resolves saved/system theme with no flash (§20.3). */
const THEME_INIT = `(function(){try{var s=localStorage.getItem("pc-theme");var t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body
        className={`${jakarta.variable} ${montserrat.variable} ${GeistMono.variable} min-h-[100dvh] bg-canvas text-ink`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-hairline-strong focus:bg-surface focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.14em]"
        >
          Skip to content
        </a>

        <header className="no-print sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur-sm">
          <nav
            aria-label="Primary"
            className="mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between gap-6 px-4 md:px-8"
          >
            <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="PaymentCalcs home">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
              <span className="font-mono text-xs uppercase tracking-[0.2em]">PaymentCalcs</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/au/business/gst-calculator"
                className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2 transition-colors duration-[var(--pc-duration-fast)] hover:text-ink sm:block"
              >
                Calculators
              </Link>
              <ThemeToggle />
            </div>
          </nav>
        </header>

        <main id="main">{children}</main>

        <footer className="no-print mt-24 border-t border-hairline">
          <div className="mx-auto grid w-full max-w-[1360px] gap-8 px-4 py-12 md:grid-cols-3 md:px-8">
            <div className="grid content-start gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink">PaymentCalcs</span>
              <p className="max-w-xs text-[13px] leading-5 text-ink-3">
                Deterministic calculators for Australian money decisions. Every figure shows its
                working, its assumptions and its sources.
              </p>
            </div>
            <div className="grid content-start gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span className="text-ink-2">Trust</span>
              <span>Rules from official sources, versioned</span>
              <span>Your numbers stay on your device</span>
              <span>No accounts. No cookies. No ads.</span>
            </div>
            <div className="grid content-start gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
              <span className="text-ink-2">Status</span>
              <span>P0 build · pre-launch preview</span>
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
      </body>
    </html>
  );
}
