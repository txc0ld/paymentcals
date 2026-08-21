import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-002")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/take-home-pay-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-002" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-002", primaryMetric: "netPerCycle", primaryLabel: "Take-home pay", intro: "Your pay after tax, Medicare and study-loan repayments. Employer super is shown separately." }} />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How do I work out my take-home pay after tax?",
    answer:
      "Start from gross cash income, subtract income tax at the brackets in the ATO-sourced rule pack for the year selected, then subtract the Medicare levy, any surcharge and any compulsory study-loan repayment. What remains is take-home pay, and this calculator shows it per year and per pay cycle with each deduction on its own line. Any pre-tax and post-tax deductions entered are applied at the correct step rather than lumped together.",
  },
  {
    question: "Why is my take-home pay not my annual salary divided by the number of pays?",
    answer:
      "Because the amount an employer withholds each pay follows the ATO schedule for that pay cycle, which rounds within each period and is calculated independently of the annual assessment. The annual liability is worked out on your income for the full year, so the two figures rarely divide evenly into one another. The withholding panel shows the annualised withheld amount and its variance from the annual liability, which is what is reconciled at tax time.",
    render: (
      <p>
        Because the amount an employer withholds each pay follows the ATO schedule for that pay cycle,
        which rounds within each period and is calculated independently of the annual assessment. The
        annual liability is worked out on your income for the full year, so the two figures rarely
        divide evenly into one another. The withholding panel shows the annualised withheld amount and
        its variance from the annual liability, and the{" "}
        <a href="/au/pay-tax/payg-withholding-calculator">PAYG withholding calculator</a> shows the
        published coefficients that produce it.
      </p>
    ),
  },
  {
    question: "Do study loan repayments come out of take-home pay?",
    answer:
      "The compulsory repayment is assessed annually on repayment income and reduces the net annual figure shown here. During the year an employer withholds a separate study-loan component each pay, which accumulates towards that assessed amount rather than being the amount itself. Switching on the study-loan toggle adds both the annual repayment and its per-pay withholding component.",
    render: (
      <p>
        The compulsory repayment is assessed annually on repayment income and reduces the net annual
        figure shown here. During the year an employer withholds a separate study-loan component each
        pay, which accumulates towards that assessed amount rather than being the amount itself.
        Switching on the study-loan toggle adds both the annual repayment and its per-pay withholding
        component; the{" "}
        <a href="/au/pay-tax/help-repayment-calculator">HELP repayment calculator</a> breaks the
        annual figure down against the published thresholds.
      </p>
    ),
  },
  {
    question: "Does take-home pay include employer super?",
    answer:
      "No. Employer super is paid to a super fund, so it is reported on its own line and excluded from the net cash figure. If the salary entered is a package that already includes super, switching on the package toggle derives the base salary before tax is applied to it.",
  },
  {
    question: "Which deductions reduce the tax on my pay?",
    answer:
      "Work-related deductions and pre-tax deductions such as salary sacrifice reduce taxable income, so they reduce income tax and the Medicare levy. Post-tax deductions come out of net cash and do not change the tax calculated. Salary sacrifice and reportable fringe benefits are added back for the surcharge and study-loan income tests, so they do not reduce those amounts.",
  },
];
