import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { DepositCalculator } from "../../../../components/breadth/property-tools";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-019")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How much deposit do I need to buy a house in Australia?",
    answer:
      "The deposit follows from the property price and the loan-to-value ratio you are borrowing at: the loan is the price times the LVR, and the deposit is the remainder. This calculator works it out for the LVR you choose and also lays out the same price at each of the LVR bands lenders commonly reference, so you can see how the deposit moves band by band. It then adds the upfront costs you enter to give the total cash needed.",
  },
  {
    question: "Is the deposit the only cash I need at settlement?",
    answer:
      "No — transfer duty, conveyancing, inspections, loan fees and any lenders mortgage insurance are payable on top, which is why this calculator reports total cash needed as deposit plus the costs you enter. It does not source those costs for you. The property buying costs calculator prices duty from the published rates for your state and lets you add the rest.",
    render: (
      <p>
        No — transfer duty, conveyancing, inspections, loan fees and any lenders mortgage insurance
        are payable on top, which is why this calculator reports total cash needed as deposit plus
        the costs you enter. It does not source those costs for you. The{" "}
        <Link href="/au/property-mortgage/property-buying-costs-calculator" className={LINK}>
          property buying costs calculator
        </Link>{" "}
        prices duty from the published rates for your state and lets you add the rest.
      </p>
    ),
  },
  {
    question: "How long will it take to save a house deposit?",
    answer:
      "Enter what you have saved so far, what you save each month and the interest your savings earn, and the calculator projects the balance forward until it reaches the deposit plus costs, reporting the amount still to save. The projection compounds the interest rate you enter on the growing balance rather than assuming a flat rate of accumulation. It makes no allowance for changes in the property price while you save.",
  },
  {
    question: "What deposit avoids lenders mortgage insurance?",
    answer:
      "Lenders generally require LMI above a threshold loan-to-value ratio, and both the threshold and the premium are set by each lender and insurer rather than by statute, so this calculator does not assert one. What it shows is the deposit and loan implied by each common LVR band on your price, which is the figure your lender's LMI policy is applied to. Check the ratio itself in the LVR calculator and ask your lender for their threshold and premium.",
    render: (
      <p>
        Lenders generally require LMI above a threshold loan-to-value ratio, and both the threshold
        and the premium are set by each lender and insurer rather than by statute, so this calculator
        does not assert one. What it shows is the deposit and loan implied by each common LVR band on
        your price. Check the ratio itself in the{" "}
        <Link href="/au/property-mortgage/lvr-calculator" className={LINK}>
          LVR calculator
        </Link>{" "}
        and ask your lender for their threshold and premium.
      </p>
    ),
  },
  {
    question: "Does a bigger deposit reduce my repayments?",
    answer:
      "A larger deposit means a smaller loan, and a smaller loan carries a lower repayment and less total interest at the same rate and term. This calculator reports the loan amount for each deposit and LVR band; to price the repayment and lifetime interest on that loan amount, run it through the mortgage repayment calculator. A lower LVR may also affect the rate a lender offers, which is a matter for the lender rather than this calculation.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/home-deposit-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-019" />
      <DepositCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
