import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { AffordabilityEstimate } from "../../../../components/breadth/property-tools";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-022")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How much can I borrow for a home loan?",
    answer:
      "This calculator produces an indicative range rather than a figure. It takes the monthly surplus left after your entered living expenses and existing debt repayments, treats that whole surplus as the repayment on a thirty-year loan, and prices the loan that surplus would support at your rate plus an assessment buffer. The range comes from pricing that same surplus at two rates half a percentage point apart, and the working panel shows the surplus and the assessed rate used.",
  },
  {
    question: "Is a borrowing estimate the same as pre-approval?",
    answer:
      "No, and the calculator is labelled as an estimate throughout for that reason. Lenders apply their own rate buffers, expense benchmarks, income shading, credit policy and serviceability tests, and they verify your income and liabilities — none of which happens here. A result from this page carries no weight with any lender and the amount they assess can differ materially.",
  },
  {
    question: "What is a serviceability buffer?",
    answer:
      "It is an allowance added to the interest rate when testing whether repayments remain manageable if rates rise. This calculator makes the buffer an editable input rather than a hidden constant, and adds it to your rate to get the assessed rate the borrowing range is priced at. Lenders set their own buffers under their credit policy, so raise or lower the field to see how sensitive the range is to it.",
  },
  {
    question: "What expenses do lenders count when assessing a home loan?",
    answer:
      "Lenders assess declared living expenses against their own benchmark and take the higher figure, then add existing debt repayments and the limits on credit cards and other facilities. This calculator applies an editable expense floor to what you enter so a low expense figure does not inflate the estimate, and subtracts your entered debt repayments in full. Card limits, dependants and income shading are not modelled here.",
  },
  {
    question: "Does the estimate include stamp duty and deposit?",
    answer:
      "No — the range is what a monthly surplus could service, not what you can afford to buy. The purchase price you can reach also depends on your deposit and the upfront costs, which are calculated separately. Work the deposit out first, add the buying costs, then read this range as the borrowing side of the same sum.",
    render: (
      <p>
        No — the range is what a monthly surplus could service, not what you can afford to buy. The
        purchase price you can reach also depends on your deposit and the upfront costs. Work the
        deposit out in the{" "}
        <Link href="/au/property-mortgage/home-deposit-calculator" className={LINK}>
          home deposit calculator
        </Link>
        , add duty and fees in the{" "}
        <Link href="/au/property-mortgage/property-buying-costs-calculator" className={LINK}>
          buying costs calculator
        </Link>
        , then read this range as the borrowing side of the same sum.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/borrowing-affordability-estimate" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-022" />
      <AffordabilityEstimate />
      <FaqSection items={FAQ} />
    </>
  );
}
