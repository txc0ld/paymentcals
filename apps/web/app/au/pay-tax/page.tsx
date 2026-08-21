import type { Metadata } from "next";
import { CategoryDirectory } from "../../../components/calculator-directory";

export const metadata: Metadata = {
  title: "Pay and Tax Calculators Australia",
  description: "Australian pay, tax, withholding and study-loan calculators with full working, official-source rule packs and separated liability vs withholding.",
  alternates: { canonical: "/au/pay-tax" },
};

export default function Page() {
  return (
    <>
      <CategoryDirectory category="pay-tax" />
      <section aria-label="About these calculators" className="mx-auto w-full max-w-[100rem] px-4 pb-16 md:px-8">
        <p className="max-w-2xl border-t border-hairline pt-8 text-[14px] leading-6 text-ink-2">
          This cluster covers Australian pay and tax: gross-to-net and net-to-gross conversions,
          hourly and salary equivalents, annual income tax, PAYG withholding, employer super and
          compulsory study or training support loan repayments. Every rate, bracket and threshold
          comes from a versioned ATO-sourced rule pack for the financial year you select, and each
          calculator shows its working, assumptions and sources. Annual tax liability and pay-cycle
          withholding are calculated by separate engines and are always reported as separate figures.
        </p>
      </section>
    </>
  );
}
