import type { Metadata } from "next";
import Link from "next/link";
import { calculatorRegistry } from "@paymentcalcs/calculator-registry";
import { CalculatorGrid, CATEGORY_LABELS } from "../../components/calculator-directory";

export const metadata: Metadata = {
  title: "All Calculators",
  description:
    "Every PaymentCalcs calculator: pay, tax, mortgage, property, loans, savings and business, each showing its working, assumptions and sources.",
  alternates: { canonical: "/calculators" },
};

/* Grouped presentation order: most-used categories first. */
const CATEGORY_ORDER = [
  "pay-tax",
  "property-mortgage",
  "loans-debt",
  "savings-investing",
  "business",
] as const;

const CATEGORY_PATHS: Record<string, string> = {
  "pay-tax": "/au/pay-tax",
  "property-mortgage": "/au/property-mortgage",
  "loans-debt": "/au/loans-debt",
  business: "/au/business",
  "savings-investing": "/global/savings-investing",
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-[100rem] px-4 py-16 md:px-8 md:py-24">
      <div className="mb-14 grid gap-4 border-b border-hairline pb-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          Directory // {calculatorRegistry.length} nodes
        </span>
        <h1 className="text-balance text-[length:var(--pc-text-h2)] font-semibold leading-[0.98] tracking-[var(--pc-tracking-tight)] text-ink">
          All calculators
        </h1>
        <p className="max-w-2xl text-[14px] leading-6 text-ink-2">
          {calculatorRegistry.length} calculators live in this build, grouped by what you are
          working out. Every result shows its working, assumptions, sources and limitations.
        </p>
        <nav aria-label="Categories" className="mt-2 flex flex-wrap gap-x-8 gap-y-3">
          {CATEGORY_ORDER.map((category) => (
            <a
              key={category}
              href={`#${category}`}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 transition-colors duration-500 hover:text-ink"
            >
              {CATEGORY_LABELS[category]}
            </a>
          ))}
        </nav>
      </div>

      <div className="grid gap-20">
        {CATEGORY_ORDER.map((category) => {
          const entries = calculatorRegistry.filter((entry) => entry.category === category);
          if (entries.length === 0) return null;
          return (
            <section key={category} id={category} aria-labelledby={`${category}-heading`} className="scroll-mt-24">
              <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-5">
                <h2
                  id={`${category}-heading`}
                  className="text-2xl font-semibold tracking-[var(--pc-tracking-tight)] text-ink md:text-3xl"
                >
                  {CATEGORY_LABELS[category]}
                </h2>
                <span className="flex items-baseline gap-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                    {entries.length} calculators
                  </span>
                  <Link
                    href={CATEGORY_PATHS[category] ?? "/calculators"}
                    className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)] transition-colors duration-500 hover:text-ink"
                  >
                    Category page ↗
                  </Link>
                </span>
              </div>
              <CalculatorGrid entries={entries} />
            </section>
          );
        })}
      </div>
    </section>
  );
}
