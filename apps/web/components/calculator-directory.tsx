import Link from "next/link";
import { calculatorRegistry, routePath, type RegistryEntry } from "@paymentcalcs/calculator-registry";

export const CATEGORY_LABELS: Record<string, string> = {
  "pay-tax": "Pay & Tax",
  "property-mortgage": "Property & Mortgage",
  "loans-debt": "Loans & Debt",
  "savings-investing": "Savings & Investing",
  business: "Business",
  everyday: "Everyday",
};

export function CalculatorGrid({ entries }: { entries: readonly RegistryEntry[] }) {
  return (
    <div className="swiss-grid sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={routePath(entry)}
          className="group grid min-h-44 content-between gap-6 p-6 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">{entry.id}</span>
            <span
              aria-hidden="true"
              className="clay-arrow grid h-9 w-9 place-items-center rounded-full bg-accent font-mono text-accent-contrast shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_color-mix(in_srgb,var(--pc-accent)_72%,#0b0d0f)]"
            >
              ↗
            </span>
          </div>
          <div className="grid gap-1.5">
            <span className="text-lg font-semibold text-ink">{entry.displayName}</span>
            <span className="text-[13px] leading-5 text-ink-3">{entry.seo.description}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CategoryDirectory({ category }: { category: string }) {
  const entries = calculatorRegistry.filter((entry) => entry.category === category);
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
      <div className="mb-10 grid gap-3">
        <h1 className="text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
          {CATEGORY_LABELS[category] ?? category}
        </h1>
        <p className="max-w-2xl text-[14px] leading-6 text-ink-2">
          {entries.length} calculator{entries.length === 1 ? "" : "s"}, each with its working,
          assumptions, sources and limitations one tab away.
        </p>
      </div>
      <CalculatorGrid entries={entries} />
    </section>
  );
}
