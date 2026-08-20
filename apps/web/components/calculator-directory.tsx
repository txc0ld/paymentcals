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
    <div className="nexus-grid sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, index) => (
        <Link
          key={entry.id}
          href={routePath(entry)}
          className={`reveal-up group grid min-h-52 content-between gap-8 p-6 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus ${index % 7 === 0 ? "lg:col-span-2" : ""} ${index < 4 ? `reveal-delay-${index + 1}` : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <span className="nexus-badge px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
              {entry.id}
            </span>
            <span aria-hidden="true" className="nexus-arrow grid h-10 w-10 place-items-center font-mono">
              ↗
            </span>
          </div>
          <div className="grid max-w-xl gap-2">
            <span className={`${index % 7 === 0 ? "text-2xl md:text-3xl" : "text-xl"} font-semibold leading-tight text-ink`}>
              {entry.displayName}
            </span>
            <span className="max-w-[58ch] text-[13px] leading-5 text-ink-3">{entry.seo.description}</span>
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
      <div className="reveal-up mb-10 grid gap-4 border-b border-hairline pb-8">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
          Directory // {entries.length} nodes
        </span>
        <h1 className="max-w-[16ch] text-[length:var(--pc-text-h2)] leading-[1.02] text-ink">
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