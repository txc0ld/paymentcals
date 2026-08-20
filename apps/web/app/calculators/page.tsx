import type { Metadata } from "next";
import { calculatorRegistry } from "@paymentcalcs/calculator-registry";
import { CalculatorGrid } from "../../components/calculator-directory";

export const metadata: Metadata = {
  title: "All Calculators",
  description:
    "Every PaymentCalcs calculator: pay, tax, mortgage, property, loans, savings and business, each showing its working, assumptions and sources.",
  alternates: { canonical: "/calculators" },
};

export default function Page() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-16 md:px-8 md:py-24">
      <div className="mb-10 grid gap-3">
        <h1 className="text-[length:var(--pc-text-h2)] font-medium leading-[1.02] tracking-[var(--pc-tracking-tight)] text-ink">
          All calculators
        </h1>
        <p className="max-w-2xl text-[14px] leading-6 text-ink-2">
          {calculatorRegistry.length} calculators live in this build. Every result shows its
          working, assumptions, sources and limitations.
        </p>
      </div>
      <CalculatorGrid entries={calculatorRegistry} />
    </section>
  );
}
