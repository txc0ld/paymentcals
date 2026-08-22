import type { Metadata } from "next";
import Link from "next/link";
import { calculatorRegistry } from "@paymentcalcs/calculator-registry";

export const metadata: Metadata = {
  title: "404 — no page at this address",
  robots: { index: false, follow: true },
};

/** Served with a real HTTP 404 status. Recovery links over apology copy:
 * both people and agents land here from stale or guessed URLs. */
const RECOVERY_LINKS = [
  { href: "/calculators", label: "All calculators", note: `Every one of the ${calculatorRegistry.length} calculators, with methodology` },
  { href: "/llms.txt", label: "llms.txt", note: "Plain-text site map for agents and crawlers" },
  { href: "/sitemap.xml", label: "sitemap.xml", note: "Every indexable URL" },
  { href: "/sources", label: "Sources & rule packs", note: "Where every statutory value comes from" },
  { href: "/", label: "Home", note: "Start over" },
];

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-[100rem] px-4 py-16 md:px-8 md:py-24">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">HTTP 404</p>
      <h1 className="max-w-[18ch] text-balance text-[length:var(--pc-text-h2)] font-semibold leading-[0.98] tracking-[var(--pc-tracking-tight)] text-ink">
        No page at this address
      </h1>
      <p className="mt-4 max-w-[65ch] text-[15px] leading-7 text-ink-2">
        The path does not exist on this site — it may be mistyped, moved or never built. Where to
        look instead:
      </p>
      <ul className="mt-10 grid max-w-3xl gap-px border-t border-hairline">
        {RECOVERY_LINKS.map((link) => (
          <li key={link.href} className="border-b border-hairline">
            <Link
              href={link.href}
              className="flex min-h-11 flex-wrap items-baseline justify-between gap-x-8 gap-y-1 py-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="font-mono text-[13px] uppercase tracking-[0.1em] text-ink">{link.label}</span>
              <span className="text-[13px] leading-5 text-ink-3">{link.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
