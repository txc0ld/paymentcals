import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-005")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/salary-including-super-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-005" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-005", primaryMetric: "netPerCycle", primaryLabel: "Take-home pay", defaults: { includesSuper: true }, intro: "Enter a total remuneration package. The base salary is derived after super, including the maximum contribution base where it applies." }} />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "What does “salary including super” mean?",
    answer:
      "It means the figure quoted is a total remuneration package that already contains the employer superannuation contribution, so the base salary you are actually paid is lower than the headline number. The alternative phrasing, base plus super, quotes the salary and pays super on top of it. This calculator takes the package figure and derives the base salary from it before any tax is applied.",
  },
  {
    question: "How do I work out base salary from a package that includes super?",
    answer:
      "The package is split so that the employer contribution, at the super guarantee rate in the rule pack for the year selected, sits on top of the derived base salary and the two together equal the package. That is a division rather than a subtraction of a percentage from the package. The result panel shows the derived base salary and the employer super amount as separate lines.",
  },
  {
    question: "What is the maximum super contribution base?",
    answer:
      "It is the quarterly earnings ceiling above which an employer is not required to provide super guarantee contributions for an employee. Once earnings in a quarter pass it, the contribution stops increasing, so a package split stops behaving proportionally at higher salaries. This calculator applies the ceiling published for the year selected, and the amount it uses is shown in the working.",
    render: (
      <p>
        It is the quarterly earnings ceiling above which an employer is not required to provide super
        guarantee contributions for an employee. Once earnings in a quarter pass it, the contribution
        stops increasing, so a package split stops behaving proportionally at higher salaries. This
        calculator applies the ceiling published for the year selected, and the{" "}
        <a href="/au/pay-tax/super-contributions-calculator">super contributions calculator</a> shows
        the same ceiling alongside the concessional cap.
      </p>
    ),
  },
  {
    question: "How does a package including super compare with base plus super?",
    answer:
      "For the same headline number the two treatments produce different cash pay: a package that includes super has a lower base salary, and therefore lower taxable income and lower take-home pay, than the same number quoted as base plus super. The super amount also differs, because it is calculated on the base salary in each case. Toggling the package setting on this page shows both outcomes on the same figure.",
    render: (
      <p>
        For the same headline number the two treatments produce different cash pay: a package that
        includes super has a lower base salary, and therefore lower taxable income and lower take-home
        pay, than the same number quoted as base plus super. The super amount also differs, because it
        is calculated on the base salary in each case. Toggling the package setting here shows both
        outcomes on the same figure, and the{" "}
        <a href="/au/pay-tax/take-home-pay-calculator">take-home pay calculator</a> carries the same
        toggle for a base-salary starting point.
      </p>
    ),
  },
  {
    question: "Which super rate does the calculator use?",
    answer:
      "By default it uses the super guarantee rate in the active ATO-sourced rule pack for the financial year selected, and that rate is displayed with the result. If an employer contributes at a higher rate, the advanced fields accept a custom percentage and every downstream figure is recalculated from it. No rate is ever assumed when the rule pack for a year cannot be resolved; the calculator reports the rules as unavailable instead.",
  },
];
