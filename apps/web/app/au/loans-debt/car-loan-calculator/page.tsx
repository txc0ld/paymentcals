import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { LoanCalculator } from "../../../../components/breadth/loan-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-DEBT-003")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How are car loan repayments calculated?",
    answer:
      "The repayment is solved from the amount financed, the periodic rate, the term and any balloon amount, and the calculator then builds the full amortisation schedule period by period. Each period charges interest on the balance carried into it, applies the repayment, rounds to the cent and carries the remainder forward. The result reports the repayment, total interest, total paid and the payoff position at term.",
  },
  {
    question: "What is a balloon payment on a car loan?",
    answer:
      "A balloon or residual is an amount deliberately left outstanding at the end of the term, due as a lump sum on the final date. Because the schedule only has to amortise down to the balloon rather than to zero, each repayment is smaller — but the balloon reduces each repayment, not the amount you owe, so more of the balance carries interest for longer. The calculator shows the balloon due at term end beside the repayment and the total paid including it.",
  },
  {
    question: "Does a balloon payment cost more overall?",
    answer:
      "It changes the shape of the cost rather than removing it: a larger balloon lowers each repayment but leaves a higher balance accruing interest across the term, so total interest is generally higher. Enter a balloon and then clear it to see both totals on the same loan. The balloon must be smaller than the amount financed, and the calculator rejects a figure that is not.",
  },
  {
    question: "What happens at the end of a car loan with a balloon?",
    answer:
      "The balloon falls due as a lump sum on the final repayment date, and settling it typically means paying it, refinancing it or selling the vehicle — options that depend on your contract and are not modelled here. The calculator's job is to state the amount and the date it falls due so it is not a surprise. Refinancing the residual would be a new loan with its own rate, term and fees.",
    render: (
      <p>
        The balloon falls due as a lump sum on the final repayment date, and settling it typically
        means paying it, refinancing it or selling the vehicle — options that depend on your contract
        and are not modelled here. The calculator&apos;s job is to state the amount and the date it
        falls due. Refinancing the residual would be a new loan with its own rate, term and fees,
        which you can price in the{" "}
        <Link href="/au/loans-debt/loan-calculator" className={LINK}>
          loan calculator
        </Link>
        .
      </p>
    ),
  },
  {
    question: "Are dealer fees and on-road costs included?",
    answer:
      "Only to the extent you include them in the amount financed and the fee fields, which cover an establishment fee and an ongoing monthly fee. Registration, stamp duty on the vehicle, insurance and dealer charges are not sourced by the calculator. Add anything financed into the loan amount so the schedule charges interest on it.",
    render: (
      <p>
        Only to the extent you include them in the amount financed and the fee fields, which cover an
        establishment fee and an ongoing monthly fee. Registration, vehicle duty, insurance and
        dealer charges are not sourced by the calculator — add anything financed into the loan amount
        so the schedule charges interest on it. The{" "}
        <Link href="/methodology/car-loan-calculator" className={LINK}>
          methodology page
        </Link>{" "}
        lists the assumptions in full.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/loans-debt/car-loan-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-DEBT-003" />
      <LoanCalculator variant="car" />
      <FaqSection items={FAQ} />
    </>
  );
}
