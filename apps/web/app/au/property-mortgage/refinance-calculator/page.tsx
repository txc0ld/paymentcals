import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { RefinanceCalculator } from "../../../../components/home/refinance-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-012")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "Is it worth refinancing a home loan?",
    answer:
      "The calculator answers that mechanically: it runs your current loan and the new offer as two full schedules and compares their cumulative cash flows, including switching costs, cashback and the residual balance left on each loan at the same horizon. The trade-off consists of a lower repayment stream on one side against the net switching cost and any change in remaining term on the other. It reports where those cumulative flows cross and the position at that horizon, and leaves the decision to you.",
  },
  {
    question: "How is the refinance break-even point calculated?",
    answer:
      "The calculator builds a running cumulative difference between the two loans, period by period, and the break-even is the first date that difference turns positive and stays positive. Comparing a single repayment against the switching cost would miss this, because the two loans can have different terms and leave different balances outstanding. If the cumulative advantage crosses zero more than once, the result flags it and reports the first sustained crossing rather than the first touch.",
  },
  {
    question: "What costs are included in a refinance comparison?",
    answer:
      "Switching costs you pay in cash, switching costs added to the new loan balance and any cashback are all entered separately, because they hit your position at different times and in different ways. Financed costs increase the balance interest is charged on for the rest of the term, while a cash cost is spent once. The result reports the net switching cost as upfront plus financed less cashback, alongside the repayment difference and the new loan's lifetime interest.",
  },
  {
    question: "Why does the comparison include the loan balance and not just repayments?",
    answer:
      "Because a lower repayment achieved by extending the term leaves you owing more at any given date, and a comparison of repayments alone would score that as a gain. The calculator therefore reports an economic position at each horizon: cumulative cash plus the residual balance on each loan. The table breaks this into cash, residual and economic columns at two years, five years and the common horizon.",
  },
  {
    question: "Does the calculator include break costs on a fixed rate?",
    answer:
      "Only if you enter them as a switching cost — the calculator holds no lender pricing and cannot look up your break fee, discharge fee or new lender's charges. Ask your current lender for a payout figure and enter it in the cash or financed switching cost field. The limitations panel lists what is and is not modelled on every result.",
    render: (
      <p>
        Only if you enter them as a switching cost — the calculator holds no lender pricing and
        cannot look up your break fee, discharge fee or new lender&apos;s charges. Ask your current
        lender for a payout figure and enter it in the cash or financed switching cost field. The{" "}
        <Link href="/methodology/refinance-calculator" className={LINK}>
          methodology page
        </Link>{" "}
        lists what is and is not modelled.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/refinance-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-012" />
      <RefinanceCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
