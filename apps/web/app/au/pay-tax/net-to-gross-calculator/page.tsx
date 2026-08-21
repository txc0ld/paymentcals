import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { NetToGrossCalculator } from "../../../../components/pay/net-to-gross-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-004")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/net-to-gross-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-004" />
      <NetToGrossCalculator />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How do I work out the gross salary needed for a target take-home amount?",
    answer:
      "There is no single formula, because tax brackets, offsets and levies make net pay a stepped function of gross pay. This calculator solves it by bisection: it repeatedly runs the full forward tax calculation on candidate gross salaries until the recomputed net matches the target you entered. The verification round-trip in the results shows the solved gross fed back through the forward engine and the residual left over.",
  },
  {
    question: "Why does the solved gross not produce the target net exactly?",
    answer:
      "Because withholding and tax amounts are rounded to whole dollars at published steps, net pay moves in small jumps rather than continuously. When a target falls inside one of those jumps the smallest gross that meets it is shown, and the residual is reported rather than hidden. If no gross in the searched range produces the target, no figure is shown at all.",
  },
  {
    question: "Can two different gross salaries produce the same net pay?",
    answer:
      "Yes. Near the Medicare levy surcharge thresholds, where private hospital cover is not held, crossing a threshold can add an amount that makes more than one gross map to the same net. The answer shown is always verified by re-running the forward calculation, but it may not be the only gross that satisfies the target, and the results say so.",
  },
  {
    question: "Does the solved figure include superannuation?",
    answer:
      "That depends on the package toggle. With it off, the result is the base salary and employer super is paid on top; with it on, the result is a total package that already contains employer super. The label above the primary figure states which of the two is being reported.",
    render: (
      <p>
        That depends on the package toggle. With it off, the result is the base salary and employer
        super is paid on top; with it on, the result is a total package that already contains employer
        super. The label above the primary figure states which of the two is being reported, and the{" "}
        <a href="/au/pay-tax/gross-to-net-calculator">gross to net calculator</a> runs the same rules
        in the opposite direction.
      </p>
    ),
  },
  {
    question: "How does a study loan change the gross needed?",
    answer:
      "A compulsory study-loan repayment is an additional annual obligation assessed on repayment income, so reaching the same net cash requires a higher gross salary. Switching on the study-loan toggle includes that repayment inside every candidate the solver tests. The repayment amount itself follows the thresholds and rates in the rule pack for the year selected.",
    render: (
      <p>
        A compulsory study-loan repayment is an additional annual obligation assessed on repayment
        income, so reaching the same net cash requires a higher gross salary. Switching on the
        study-loan toggle includes that repayment inside every candidate the solver tests. The
        repayment amount itself follows the thresholds and rates in the rule pack for the year
        selected, which the{" "}
        <a href="/au/pay-tax/help-repayment-calculator">HELP repayment calculator</a> sets out band by
        band.
      </p>
    ),
  },
];
