import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { LoanCalculator } from "../../../../components/breadth/loan-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-DEBT-001")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How are personal loan repayments calculated?",
    answer:
      "The level repayment is solved from the amount borrowed, the periodic interest rate and the number of repayments in the term, and the calculator then builds the whole amortisation schedule period by period. Each period charges interest on the balance carried into it, applies the repayment, rounds to the cent and carries the remainder forward, so the totals come from the schedule rather than from the formula alone. The final repayment is adjusted to close the balance exactly.",
  },
  {
    question: "What is the difference between the interest rate and the comparison rate?",
    answer:
      "The interest rate prices the balance; a comparison rate is a single figure that folds prescribed fees into a rate on a standardised loan size and term. This calculator does not quote a comparison rate — it takes your rate, your establishment fee and your ongoing monthly fee as separate inputs and reports the actual dollars: total interest, total fees and total paid. Comparing the total cost of two offers in dollars sidesteps the standardised assumptions a comparison rate relies on.",
  },
  {
    question: "How do fees change the cost of a personal loan?",
    answer:
      "An establishment fee is a one-off cost at the start, while a monthly service fee is charged in every period alongside the repayment, so over a long term the recurring fee usually dominates. The calculator adds both to the schedule and reports total paid including fees, not just interest. This is why two loans at the same rate can differ materially in cost.",
  },
  {
    question: "How do I compare two loan offers?",
    answer:
      "Turn on the second offer fields and enter the rival rate, term and establishment fee; both offers are run through the same schedule engine on the same amount borrowed. The comparison reports each offer's repayment, total interest and total paid, so a lower repayment achieved by a longer term shows up as a higher total cost rather than as a win. The calculator presents the two sets of numbers and does not rank them.",
  },
  {
    question: "Does making extra repayments on a personal loan save interest?",
    answer:
      "Yes, and the calculator prices it: an extra amount per period goes to principal, so the balance entering each subsequent period is lower and less interest is charged from then on. Enter an extra repayment and the schedule closes earlier with a lower interest total. Whether your contract permits extra repayments without a fee is a matter for the loan terms, which are not modelled here.",
    render: (
      <p>
        Yes, and the calculator prices it: an extra amount per period goes to principal, so the
        balance entering each subsequent period is lower and less interest is charged from then on.
        Whether your contract permits extra repayments without a fee is a matter for the loan terms,
        which are not modelled here — the{" "}
        <Link href="/methodology/loan-calculator" className={LINK}>
          methodology page
        </Link>{" "}
        lists every assumption and limitation.
      </p>
    ),
  },
  {
    question: "Is a car loan calculated the same way?",
    answer:
      "The amortisation is identical, but car finance often carries a balloon or residual amount that falls due at the end of the term. That amount reduces each repayment while leaving a lump sum outstanding at term end, which changes the total cost materially. The car loan calculator models the balloon explicitly on the same schedule engine.",
    render: (
      <p>
        The amortisation is identical, but car finance often carries a balloon or residual amount
        that falls due at the end of the term. That amount reduces each repayment while leaving a
        lump sum outstanding at term end, which changes the total cost materially. The{" "}
        <Link href="/au/loans-debt/car-loan-calculator" className={LINK}>
          car loan calculator
        </Link>{" "}
        models the balloon explicitly on the same schedule engine.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/loans-debt/loan-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-DEBT-001" />
      <LoanCalculator variant="personal" />
      <FaqSection items={FAQ} />
    </>
  );
}
