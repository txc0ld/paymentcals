import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { MortgageRepaymentsCalculator } from "../../../../components/home/mortgage-repayments-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-001")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How are mortgage repayments calculated in Australia?",
    answer:
      "The level repayment is solved from the loan amount, the periodic interest rate and the number of repayments left in the term, then this calculator builds the whole schedule repayment by repayment rather than stopping at the formula. Each period charges interest on the balance carried into it, subtracts the repayment, rounds to the cent and carries the remainder forward, so the interest and payoff figures come from the ledger itself. The working panel shows every assumption and the balance at each step.",
    render: (
      <p>
        The level repayment is solved from the loan amount, the periodic interest rate and the number
        of repayments left in the term, then this calculator builds the whole schedule repayment by
        repayment rather than stopping at the formula. Each period charges interest on the balance
        carried into it, subtracts the repayment, rounds to the cent and carries the remainder
        forward, so the interest and payoff figures come from the ledger itself. The{" "}
        <Link href="/methodology/mortgage-repayment-calculator" className={LINK}>
          methodology page
        </Link>{" "}
        sets out the formulas and the working panel shows every assumption.
      </p>
    ),
  },
  {
    question: "Does paying fortnightly instead of monthly reduce interest?",
    answer:
      "Changing the repayment frequency changes the schedule, and the calculator recomputes it from scratch at weekly, fortnightly or monthly rather than scaling one answer into another. Two effects are mixed together: interest is charged over shorter periods, and a repayment set at half the monthly amount every fortnight pays more per year than twelve monthly repayments. Switch the frequency field to see both the repayment and the lifetime interest recalculated on the new schedule.",
  },
  {
    question: "What is the total cost of a mortgage?",
    answer:
      "Total paid is every scheduled repayment added up plus any fees you enter, and total interest is that figure less the amount borrowed. The calculator reports both alongside the payoff date and the number of repayments, so the headline repayment is never the only number on screen. An annual package fee, if you enter one, is added to the schedule rather than quoted separately.",
  },
  {
    question: "Why is the final mortgage repayment a different amount?",
    answer:
      "Rounding each repayment to the cent leaves a small residue that accumulates over hundreds of periods, so the last repayment is adjusted to close the balance at exactly zero. The calculator makes that adjustment explicitly and caps it, rather than letting a rounding drift accumulate into the totals. You can see the closing balance move to zero in the schedule.",
  },
  {
    question: "Does the calculator model rate changes, offsets or extra repayments?",
    answer:
      "This calculator holds the rate constant for the whole term so the schedule is comparable end to end. Dated rate changes, offset balances, extra repayments and fee events are modelled on the full scheduled ledger in the mortgage simulator, which reconciles the balance on every period. Use this page for a clean baseline and the simulator when events land on specific dates.",
    render: (
      <p>
        This calculator holds the rate constant for the whole term so the schedule is comparable end
        to end. Dated rate changes, offset balances, extra repayments and fee events are modelled on
        the full scheduled ledger in the{" "}
        <Link href="/au/property-mortgage/mortgage-simulator" className={LINK}>
          mortgage simulator
        </Link>
        , which reconciles the balance on every period. Use this page for a clean baseline and the
        simulator when events land on specific dates.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/mortgage-repayment-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-001" />
      <MortgageRepaymentsCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
