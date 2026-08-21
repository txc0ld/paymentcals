import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-007")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/salary-to-hourly-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-007" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-007", primaryMetric: "impliedHourly", primaryLabel: "Implied hourly rate", simpleShowsHours: true, intro: "See what an annual salary works out to per hour for your hours and weeks worked." }} />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How do I convert an annual salary to an hourly rate?",
    answer:
      "Divide the annual salary by the number of weeks paid in the year, then divide that weekly figure by the ordinary hours worked each week. Both divisors are entered here rather than assumed, because working patterns and paid weeks vary. The result is labelled an implied hourly rate because it is derived from a salary rather than agreed as a rate.",
  },
  {
    question: "Does the implied hourly rate account for tax?",
    answer:
      "The headline implied rate is calculated on gross salary, so it is a pre-tax figure. The same page shows the annual tax position and net cash for that salary, so an after-tax hourly equivalent can be read from the net annual figure using the same hours and weeks. Tax is progressive, so an after-tax hourly rate falls as salary rises even when hours do not change.",
    render: (
      <p>
        The headline implied rate is calculated on gross salary, so it is a pre-tax figure. The same
        page shows the annual tax position and net cash for that salary, so an after-tax hourly
        equivalent can be read from the net annual figure using the same hours and weeks. For the full
        deduction-by-deduction view of that salary, the{" "}
        <a href="/au/pay-tax/pay-calculator">pay calculator</a> reports every line under the rules for
        the year selected.
      </p>
    ),
  },
  {
    question: "How do extra unpaid hours change the implied hourly rate?",
    answer:
      "A salaried employee is paid the same annual amount regardless of hours worked, so raising the hours per week figure lowers the implied hourly rate proportionally. That is the point of the calculation: it converts a fixed salary into a rate for the hours actually being worked. Nothing about the tax position changes, because taxable income has not changed.",
  },
  {
    question: "Is employer super included in the implied hourly rate?",
    answer:
      "No, unless the amount entered is a package that includes super and the package toggle is switched on. By default the salary is treated as base salary with employer super paid on top and reported separately, so the implied rate reflects cash salary only. Super never appears inside the hourly figure.",
  },
  {
    question: "How is paid annual leave treated in an implied hourly rate?",
    answer:
      "Paid leave is normally counted in the weeks paid per year figure, because it is paid time even though no hours are worked. Counting only weeks actually worked instead produces a higher implied rate for the same salary, so the two conventions give different answers. The field is editable so the convention being used is explicit rather than hidden.",
    render: (
      <p>
        Paid leave is normally counted in the weeks paid per year figure, because it is paid time even
        though no hours are worked. Counting only weeks actually worked instead produces a higher
        implied rate for the same salary, so the two conventions give different answers. The field is
        editable so the convention is explicit rather than hidden; to go the other way, use the{" "}
        <a href="/au/pay-tax/hourly-to-salary-calculator">hourly to salary calculator</a>.
      </p>
    ),
  },
];
