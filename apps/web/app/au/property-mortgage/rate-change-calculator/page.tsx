import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { RateChangeCalculator } from "../../../../components/home/rate-change-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-007")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How much will my mortgage repayment go up if rates rise?",
    answer:
      "Enter your loan, the new rate and the date it takes effect, and the calculator reruns the whole schedule on a ledger with the old rate applying up to that date and the new rate after it. It reports the repayment before the change, the repayment after it and the difference per week, fortnight or month. The lifetime interest is also recomputed against an otherwise identical schedule at the unchanged rate.",
  },
  {
    question: "What happens to my loan term when interest rates change?",
    answer:
      "It depends on which policy your lender applies, and the calculator makes that an explicit choice rather than an assumption. Under keep-repayment the amount you pay stays the same and the payoff date moves; under recalculate-to-term the repayment is re-solved so the loan still closes at the original term. Switching the policy field reruns the schedule and shows the payoff date and lifetime interest under each.",
  },
  {
    question: "Why does a small rate change cost so much over the life of a loan?",
    answer:
      "Because the extra interest is charged on the outstanding balance in every remaining period, and a higher interest charge leaves less of each repayment to reduce principal, which raises the balance the next period is charged on. The calculator captures that compounding by rerunning the full schedule rather than multiplying the rate difference by the balance. The interest difference shown is measured against the unchanged-rate schedule over the whole term.",
  },
  {
    question: "Does the calculator predict future interest rate movements?",
    answer:
      "No. Every rate and every effective date is a figure you enter, and the calculator holds no forecast, no lender pricing and no view on where rates go. It reports what the schedule does under the change you specify, with the inputs listed in the assumptions panel.",
  },
  {
    question: "Can I model more than one rate change?",
    answer:
      "This page models a single change on a single date so the before-and-after comparison stays clean. A sequence of dated rate changes, together with extra repayments, offsets and fees, runs on the full scheduled ledger in the mortgage simulator. Both pages use the same period-by-period engine and reconcile the balance on every period.",
    render: (
      <p>
        This page models a single change on a single date so the before-and-after comparison stays
        clean. A sequence of dated rate changes, together with extra repayments, offsets and fees,
        runs on the full scheduled ledger in the{" "}
        <Link href="/au/property-mortgage/mortgage-simulator" className={LINK}>
          mortgage simulator
        </Link>
        . Both pages use the same period-by-period engine and reconcile the balance on every period.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/rate-change-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-007" />
      <RateChangeCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
