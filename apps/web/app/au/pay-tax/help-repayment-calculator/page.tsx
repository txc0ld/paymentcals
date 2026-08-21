import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { HelpRepaymentCalculator } from "../../../../components/pay/help-repayment-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-013")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/help-repayment-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-013" />
      <HelpRepaymentCalculator />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How is a HELP or HECS repayment calculated?",
    answer:
      "The compulsory repayment is worked out from repayment income against the thresholds and rates published for the financial year selected, and it is assessed on your tax return rather than charged by your fund or provider. Depending on the year, the rules either apply a single rate to the whole repayment income or apply marginal rates only to income above a threshold; the calculator uses whichever system the resolved rule pack states. The repayment rate thresholds table shows the band that was applied and the ones either side of it.",
  },
  {
    question: "What is repayment income?",
    answer:
      "Repayment income is taxable income plus reportable fringe benefits, reportable super contributions, net investment losses and exempt foreign employment income. It is deliberately broader than taxable income, so salary sacrificing into super does not reduce it. Enter that combined figure rather than salary alone for the repayment to be calculated correctly.",
  },
  {
    question: "When does HELP indexation apply?",
    answer:
      "Indexation is applied once a year, on the date stated in the resolved rule pack, to any part of the debt that has been unpaid for the number of months the rules specify. The rate is published by the ATO and is based on the lower of the CPI and the Wage Price Index. This calculator applies one published year of indexation to the balance entered and does not project any later year.",
  },
  {
    question: "Is the study-loan amount withheld from my pay the same as my compulsory repayment?",
    answer:
      "No. The study-loan component an employer withholds each pay is an estimate produced by the ATO withholding schedule, and it accumulates towards the compulsory repayment assessed on your return. The annual figure shown here is the assessed repayment, not a per-pay deduction, so the two amounts can differ over a year.",
    render: (
      <p>
        No. The study-loan component an employer withholds each pay is an estimate produced by the ATO
        withholding schedule, and it accumulates towards the compulsory repayment assessed on your
        return. The annual figure shown here is the assessed repayment, not a per-pay deduction, so
        the two can differ over a year — the{" "}
        <a href="/au/pay-tax/payg-withholding-calculator">PAYG withholding calculator</a> shows the
        per-pay side from the published coefficients.
      </p>
    ),
  },
  {
    question: "Which loans count towards the compulsory repayment?",
    answer:
      "The rules applied here are the combined study and training support loan rules, which cover HELP and the other study and training loan types the ATO assesses together. The repayment is calculated on repayment income rather than on the loan balance, so the same amount is assessed regardless of which of those loans is held. A loan balance is only needed for the indexation figures, and leaving it blank leaves the repayment result unchanged.",
    render: (
      <p>
        The rules applied here are the combined study and training support loan rules, which cover HELP
        and the other study and training loan types the ATO assesses together. The repayment is
        calculated on repayment income rather than on the loan balance, so the same amount is assessed
        regardless of which of those loans is held. A loan balance is only needed for the indexation
        figures; to see the repayment inside a full pay position, use the{" "}
        <a href="/au/pay-tax/take-home-pay-calculator">take-home pay calculator</a>.
      </p>
    ),
  },
];
