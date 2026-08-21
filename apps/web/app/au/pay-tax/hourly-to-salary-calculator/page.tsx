import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-006")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/hourly-to-salary-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-006" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-006", primaryMetric: "annualBase", primaryLabel: "Annual base salary", defaults: { frequency: "hourly" }, simpleShowsHours: true, intro: "Turn an hourly rate into an annual salary and take-home pay for your working pattern." }} />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How do I convert an hourly rate to an annual salary?",
    answer:
      "Multiply the hourly rate by the ordinary hours worked each week, then by the number of weeks paid in the year. Both of those figures are inputs here rather than assumptions, because working patterns differ. The annual salary that results is then run through the tax rules for the year selected to show take-home pay as well.",
  },
  {
    question: "How many weeks a year are used in the conversion?",
    answer:
      "The weeks paid per year field controls it, and it defaults to a full year of paid weeks. Paid annual leave is normally included in that count because it is still paid time; unpaid leave is not, so reducing the number reflects weeks with no pay. Changing the field recalculates the annual salary and every figure derived from it.",
  },
  {
    question: "Does an hourly rate include superannuation?",
    answer:
      "An hourly rate is normally the cash rate for hours worked, with employer super paid on top of it. If the rate quoted is meant to cover super as well, switching on the package toggle derives the base component before tax is applied. Employer super is always reported on its own line and never counted as take-home cash.",
  },
  {
    question: "What is my take-home pay on an hourly rate?",
    answer:
      "It is the annualised earnings from your rate and hours, less income tax at the brackets in the ATO-sourced rule pack for the year selected, the Medicare levy, any surcharge and any compulsory study-loan repayment. The result panel shows both the annual salary the rate implies and the net amount at each pay frequency. The withholding an employer would deduct each pay is shown separately, because it follows the ATO schedule rather than the annual figure.",
    render: (
      <p>
        It is the annualised earnings from your rate and hours, less income tax at the brackets in the
        ATO-sourced rule pack for the year selected, the Medicare levy, any surcharge and any
        compulsory study-loan repayment. The result panel shows both the annual salary the rate
        implies and the net amount at each pay frequency. The amount an employer would deduct each pay
        is shown separately because it follows the ATO schedule — see the{" "}
        <a href="/au/pay-tax/take-home-pay-calculator">take-home pay calculator</a> for the same
        breakdown starting from an annual figure.
      </p>
    ),
  },
  {
    question: "How do unpaid weeks change the annual figure?",
    answer:
      "Every unpaid week removes one week of earnings from the annual total, which lowers taxable income and therefore lowers both the tax and the take-home figure. Because tax brackets are progressive, the reduction in tax is not proportional to the reduction in pay. Adjust the weeks paid per year field to see the whole position recalculated.",
    render: (
      <p>
        Every unpaid week removes one week of earnings from the annual total, which lowers taxable
        income and therefore lowers both the tax and the take-home figure. Because tax brackets are
        progressive, the reduction in tax is not proportional to the reduction in pay. Adjust the
        weeks paid per year field to see the whole position recalculated, or reverse the conversion
        with the{" "}
        <a href="/au/pay-tax/salary-to-hourly-calculator">salary to hourly calculator</a>.
      </p>
    ),
  },
];
