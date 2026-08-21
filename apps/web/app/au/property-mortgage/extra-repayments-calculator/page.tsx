import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SavingsPresetCalculator } from "../../../../components/home/savings-preset-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-004")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How much interest do extra mortgage repayments save?",
    answer:
      "The saving is the difference between two full schedules: your loan with the extra repayments and the same loan without them, each run repayment by repayment on a scheduled ledger. Because every extra dollar reduces the balance that the next period charges interest on, the saving compounds and cannot be read off a simple formula. The result shows interest saved, time saved and the interest total under each schedule side by side.",
  },
  {
    question: "How do extra repayments shorten a home loan term?",
    answer:
      "An extra repayment goes entirely to principal, so the balance entering the next period is lower and more of the scheduled repayment goes to principal from then on. The loan closes when the ledger reaches a zero balance, which happens earlier than the contracted term. The calculator reports the new payoff date, the number of repayments under each schedule and the years and months saved.",
  },
  {
    question: "Is it better to make regular extra repayments or one lump sum?",
    answer:
      "The calculator prices both and shows the difference rather than ranking them: enter an amount per repayment period, a one-off lump sum on a chosen date, or both. A lump sum paid earlier sits against the balance for more periods, while regular extras build up gradually — the ledger applies each on its own date so timing is reflected, not assumed. Compare the two interest-saved figures to see the trade-off in dollars.",
  },
  {
    question: "Do extra repayments stay available if I need the money back?",
    answer:
      "Money paid into the loan reduces the balance and whether you can draw it back depends on the redraw terms in your contract, which this calculator does not model. Money held in an offset account instead reduces the interest charged while remaining yours to withdraw. The comparison panel shows both paths on the same loan so the interest saving and the access difference are visible together.",
    render: (
      <p>
        Money paid into the loan reduces the balance and whether you can draw it back depends on the
        redraw terms in your contract, which this calculator does not model. Money held in an{" "}
        <Link href="/au/property-mortgage/offset-account-calculator" className={LINK}>
          offset account
        </Link>{" "}
        instead reduces the interest charged while remaining yours to withdraw. The comparison panel
        shows both paths on the same loan so the interest saving and the access difference are
        visible together.
      </p>
    ),
  },
  {
    question: "Does the calculator account for extra repayment limits or fees?",
    answer:
      "No — annual extra repayment caps, break costs on fixed rates and redraw fees vary by contract and are not modelled here, which the limitations panel states. The schedule assumes every extra repayment you enter is accepted on its date. Check the caps in your loan contract before treating the saving as achievable.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/extra-repayments-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-004" />
      <SavingsPresetCalculator variant="extra_repayments" />
      <FaqSection items={FAQ} />
    </>
  );
}
