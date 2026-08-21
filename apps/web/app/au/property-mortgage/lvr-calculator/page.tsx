import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { LvrCalculator } from "../../../../components/breadth/property-tools";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-020")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "What is LVR and why does it matter?",
    answer:
      "The loan-to-value ratio is the loan amount divided by the property value, expressed as a percentage — borrow $400,000 against a $500,000 property and the LVR is 80%. Lenders use it as a measure of how much of the purchase is funded by debt, and it commonly feeds their pricing, their lenders mortgage insurance requirement and their credit policy. This calculator computes the ratio from the two figures you enter and marks it against the bands lenders commonly reference.",
  },
  {
    question: "How do I calculate loan to value ratio?",
    answer:
      "Divide the loan amount by the property value and multiply by one hundred. The subtlety is which value applies: for a purchase, lenders generally use the lower of the price and their own valuation, and for an existing loan they use a current valuation rather than what you originally paid. Enter the value your lender would use to get a ratio that matches theirs.",
  },
  {
    question: "What LVR do I need to avoid lenders mortgage insurance?",
    answer:
      "The threshold is set by each lender and its insurer rather than by statute, so this calculator shows where your ratio sits among the common bands instead of asserting a cut-off. Crossing below a band boundary can change both the LMI requirement and the rate on offer, which is why the ladder shows the bands rather than a single number. Your lender can confirm their threshold and premium for your loan.",
    render: (
      <p>
        The threshold is set by each lender and its insurer rather than by statute, so this
        calculator shows where your ratio sits among the common bands instead of asserting a
        cut-off. Crossing below a band boundary can change both the LMI requirement and the rate on
        offer. To see the deposit each band implies on a given price, use the{" "}
        <Link href="/au/property-mortgage/home-deposit-calculator" className={LINK}>
          home deposit calculator
        </Link>
        .
      </p>
    ),
  },
  {
    question: "Does my LVR change over time?",
    answer:
      "Yes, in both directions: each repayment reduces the loan balance and lowers the ratio, while a change in the property's value moves it too. Because this calculator takes a value and a loan amount as inputs, you can recompute the ratio at any point by entering a current balance and a current valuation. Refinancing and revaluation are the usual moments lenders reassess it.",
    render: (
      <p>
        Yes, in both directions: each repayment reduces the loan balance and lowers the ratio, while
        a change in the property&apos;s value moves it too. Because this calculator takes a value and
        a loan amount as inputs, you can recompute the ratio by entering a current balance and a
        current valuation — the{" "}
        <Link href="/au/property-mortgage/mortgage-repayment-calculator" className={LINK}>
          mortgage repayment calculator
        </Link>{" "}
        shows the balance at each point of the schedule.
      </p>
    ),
  },
  {
    question: "Is LVR calculated before or after upfront costs?",
    answer:
      "LVR is the loan against the property value, so transfer duty, conveyancing and other upfront costs sit outside the ratio even though they consume the same savings. Paying costs from your deposit reduces what is left to put towards the purchase, which raises the loan and therefore the LVR. Enter the loan amount you will actually draw to get the ratio your lender will see.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/lvr-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-020" />
      <LvrCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
