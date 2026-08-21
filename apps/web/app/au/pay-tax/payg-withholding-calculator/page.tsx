import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { WithholdingCalculator } from "../../../../components/pay/withholding-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-011")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/payg-withholding-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-011" />
      <WithholdingCalculator />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "What is PAYG withholding?",
    answer:
      "PAYG withholding is the amount an employer takes out of each pay and sends to the ATO on your behalf during the year. It is worked out from the statement-of-formulas coefficients the ATO publishes for each pay cycle and each withholding scale, not from your annual tax return. This calculator applies those published coefficients directly and shows the exact row used.",
  },
  {
    question: "What is the difference between the tax you owe and the tax withheld from your pay?",
    answer:
      "The tax withheld is a pay-by-pay estimate produced by the ATO schedule for your cycle and declarations; the tax you owe is the annual liability assessed on your actual income for the whole year. The two are separate calculations and are run by separate engines here, so the withheld figure is never the annual amount divided by the number of pays. The annual reconciliation panel shows what would be withheld across a year, the annual liability on the same earnings, and the variance that settles at tax time.",
    render: (
      <p>
        The tax withheld is a pay-by-pay estimate produced by the ATO schedule for your cycle and
        declarations; the tax you owe is the annual liability assessed on your actual income for the
        whole year. The two are separate calculations and are run by separate engines here, so the
        withheld figure is never the annual amount divided by the number of pays. The annual
        reconciliation panel shows the variance that settles at tax time, and the{" "}
        <a href="/au/pay-tax/income-tax-calculator">income tax calculator</a> shows the bracket side
        of that comparison.
      </p>
    ),
  },
  {
    question: "How is tax on a bonus withheld?",
    answer:
      "Bonuses, commissions and back payments are withheld under Schedule 5, and this calculator implements Method A. The payment is apportioned across the number of pay periods the schedule specifies, the regular schedule is run with and without that share, and the difference is scaled back up to give the withholding on the payment. Cents are ignored at each published step, and where the schedule caps the withholding on the additional payment the cap is applied and reported.",
  },
  {
    question: "What happens if you do not claim the tax-free threshold?",
    answer:
      "Withholding moves to the scale for employees who have not claimed it, which withholds more from every pay because no threshold amount is built into the coefficients. This is common where a second job is involved. Turning the toggle off here switches scales and the working panel names the scale and shows its coefficient table.",
  },
  {
    question: "How does a study or training support loan change withholding?",
    answer:
      "A separate study-loan component is calculated from its own published coefficient table and added to the ordinary withholding, so the total withheld each pay rises. The results show the PAYG component and the study-loan component on separate lines. That withheld amount accumulates towards the compulsory annual repayment rather than being that repayment.",
    render: (
      <p>
        A separate study-loan component is calculated from its own published coefficient table and
        added to the ordinary withholding, so the total withheld each pay rises. The results show the
        PAYG component and the study-loan component on separate lines. That withheld amount
        accumulates towards the compulsory annual repayment rather than being it — the{" "}
        <a href="/au/pay-tax/help-repayment-calculator">HELP repayment calculator</a> works out the
        annual figure it is counted against.
      </p>
    ),
  },
  {
    question: "Why does the amount withheld differ between weekly, fortnightly and monthly pay?",
    answer:
      "Each pay cycle has its own schedule, and the calculation rounds to whole dollars within every period, so the same annual earnings produce slightly different yearly totals depending on how often you are paid. The comparison table runs the schedule separately for each cycle on the same annual earnings rather than dividing one result. Any difference from the annual liability is reconciled when a return is lodged.",
  },
];
