import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { CreditCardCalculator } from "../../../../components/breadth/credit-card-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-DEBT-012")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How long will it take to pay off my credit card?",
    answer:
      "The calculator simulates monthly statement cycles: each cycle charges interest on the opening balance, applies your payment and any card fee and new spending, and carries the closing balance into the next cycle until it reaches zero. The payoff time therefore comes from the cycle-by-cycle ledger rather than a rule of thumb. It reports the number of cycles, the payoff date and the total interest charged along the way.",
  },
  {
    question: "Why do minimum payments take so long to clear a balance?",
    answer:
      "Because a minimum is calculated as a percentage of the balance subject to a dollar floor, it shrinks as the balance shrinks, so each cycle repays a little less principal than the last. The calculator runs the minimum-only strategy and a fixed-payment strategy on the same balance, rate and minimum rule, and reports the cycles and total interest for each. The gap between the two totals is the cost of letting the payment fall with the balance.",
  },
  {
    question: "How is the credit card minimum payment worked out?",
    answer:
      "The minimum here is the greater of a percentage of the balance and a dollar floor, both of which are editable fields because card contracts differ. The calculator uses whatever percentage and floor you enter rather than assuming an industry standard — check your card's terms and set them to match. The cycle table shows the minimum computed for each statement period.",
  },
  {
    question: "How much interest will I save by paying more than the minimum?",
    answer:
      "Select the fixed-payment strategy and enter an amount: the calculator reruns the same balance under both strategies and reports the difference in cycles and in total interest. Because a fixed payment does not shrink with the balance, more of it goes to principal each cycle and the compounding works in your favour. The result states both totals rather than nominating a target payment.",
  },
  {
    question: "What happens when a balance transfer promotional rate ends?",
    answer:
      "The calculator applies the promotional rate up to the expiry date you enter and the standard rate from that exact date onward, on the cycle the date falls in. Any balance still outstanding at expiry starts accruing at the higher rate immediately, which is where most of the interest in a transfer scenario is generated. Set the promotional rate and end date to see how much balance the schedule leaves behind at that point.",
    render: (
      <p>
        The calculator applies the promotional rate up to the expiry date you enter and the standard
        rate from that exact date onward, on the cycle the date falls in. Any balance still
        outstanding at expiry starts accruing at the higher rate immediately, which is where most of
        the interest in a transfer scenario is generated. The{" "}
        <Link href="/methodology/credit-card-payoff-calculator" className={LINK}>
          methodology page
        </Link>{" "}
        sets out how the cycles and the expiry date are handled.
      </p>
    ),
  },
  {
    question: "Does new spending on the card change the payoff time?",
    answer:
      "Yes — new spending is added to the balance in the cycle it occurs, so it both extends the schedule and increases the interest charged from that point. Enter a monthly spending figure to see the effect, or leave it at zero to model a card you have stopped using. Interest-free days on new purchases are not modelled, which the limitations panel states.",
    render: (
      <p>
        Yes — new spending is added to the balance in the cycle it occurs, so it both extends the
        schedule and increases the interest charged from that point. Enter a monthly spending figure
        to see the effect, or leave it at zero to model a card you have stopped using. If you are
        weighing consolidating the balance into a fixed-term loan, the{" "}
        <Link href="/au/loans-debt/loan-calculator" className={LINK}>
          loan calculator
        </Link>{" "}
        prices that alternative in total dollars.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/loans-debt/credit-card-payoff-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-DEBT-012" />
      <CreditCardCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
