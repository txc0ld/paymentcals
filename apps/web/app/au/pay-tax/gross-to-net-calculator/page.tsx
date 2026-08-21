import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-003")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/gross-to-net-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-003" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-003", primaryMetric: "netAnnual", primaryLabel: "Net annual income", intro: "Convert a gross salary to net at every pay frequency. The breakdown tab shows each conversion." }} />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "What is the difference between gross pay and net pay?",
    answer:
      "Gross pay is the amount agreed before any tax or deductions; net pay is what reaches your bank account after them. In Australia the gap is made up of income tax, the Medicare levy, any Medicare levy surcharge and any compulsory study-loan repayment, plus any deductions you have arranged. This calculator shows each of those lines between the two figures.",
  },
  {
    question: "How do I convert a gross salary to net pay?",
    answer:
      "Apply the income tax brackets in the ATO-sourced rule pack for the financial year selected to taxable income, add the Medicare levy and any surcharge, subtract any offsets, then subtract any compulsory study-loan repayment from gross cash income. The result is net annual cash, which is then expressed at each pay frequency. The working tab shows every intermediate figure and the source of the rates used.",
  },
  {
    question: "What is taken out of gross pay in Australia?",
    answer:
      "Income tax at the statutory brackets, the Medicare levy, the Medicare levy surcharge where private hospital cover is not held and income exceeds the published thresholds, and any compulsory study or training support loan repayment. Pre-tax deductions such as salary sacrifice come out before tax is calculated, and post-tax deductions come out of the remaining cash. Employer super is not taken out of gross pay — it is paid on top, unless the figure entered is a package that includes it.",
    render: (
      <p>
        Income tax at the statutory brackets, the Medicare levy, the Medicare levy surcharge where
        private hospital cover is not held and income exceeds the published thresholds, and any
        compulsory study or training support loan repayment. Pre-tax deductions such as salary
        sacrifice come out before tax is calculated, and post-tax deductions come out of the remaining
        cash. Employer super is not taken out of gross pay — it is paid on top, unless the figure
        entered is a package that includes it, which the{" "}
        <a href="/au/pay-tax/salary-including-super-calculator">salary including super calculator</a>{" "}
        handles directly.
      </p>
    ),
  },
  {
    question: "Does a gross salary include superannuation?",
    answer:
      "Usually a quoted gross salary is the base salary and employer super is paid on top, but some offers quote a total package that already includes it. The toggle on this page switches between the two treatments, and the base salary is derived when the package treatment is selected. Employer super is always reported on a separate line so it is never mistaken for cash.",
  },
  {
    question: "Why does net pay differ between weekly, fortnightly and monthly pay?",
    answer:
      "The annual net figure does not change with pay frequency, but the amount an employer withholds each period does, because the ATO schedule rounds within each pay period and is run separately for each cycle. That is why the annual columns shown here are display divisions of the annual position while the withholding figures come straight from the schedule. Any difference between the two is reconciled when a tax return is lodged.",
    render: (
      <p>
        The annual net figure does not change with pay frequency, but the amount an employer withholds
        each period does, because the ATO schedule rounds within each pay period and is run separately
        for each cycle. That is why the annual columns shown here are display divisions of the annual
        position while the withholding figures come straight from the schedule. To work in the
        opposite direction and find the gross that produces a chosen net, use the{" "}
        <a href="/au/pay-tax/net-to-gross-calculator">net to gross calculator</a>.
      </p>
    ),
  },
];
