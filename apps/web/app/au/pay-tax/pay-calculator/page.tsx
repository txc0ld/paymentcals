import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-001")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/pay-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-001" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-001", primaryMetric: "netPerCycle", primaryLabel: "Take-home pay" }} />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How is take-home pay calculated in Australia?",
    answer:
      "Take-home pay is gross cash income less income tax, the Medicare levy and any surcharge, and any compulsory study-loan repayment, using the brackets and thresholds in the ATO-sourced rule pack for the financial year selected. This calculator works out the annual position first and then reports the pay-cycle figures alongside it. Employer super sits on its own line because it is paid to a fund rather than received as cash.",
  },
  {
    question: "What is the difference between the tax you owe and the tax withheld from your pay?",
    answer:
      "The tax you owe is the annual liability assessed on your income for the whole financial year; the tax withheld is what an employer sends to the ATO each pay under the published PAYG schedule for that pay cycle. These are two separate engines here, and the annual figure is never divided by the number of pays to produce the withheld one. The results show annualised withholding, annual liability and the variance between them, which is the amount that settles when a return is lodged.",
    render: (
      <p>
        The tax you owe is the annual liability assessed on your income for the whole financial year;
        the tax withheld is what an employer sends to the ATO each pay under the published PAYG
        schedule for that pay cycle. These are two separate engines here, and the annual figure is
        never divided by the number of pays to produce the withheld one. The results show annualised
        withholding, annual liability and the variance between them, which is the amount that settles
        when a return is lodged — the{" "}
        <a href="/au/pay-tax/payg-withholding-calculator">PAYG withholding calculator</a> shows the
        schedule coefficients behind the withheld figure.
      </p>
    ),
  },
  {
    question: "Is superannuation part of take-home pay?",
    answer:
      "No. Employer super is paid to a super fund and never reaches you as cash, so it is reported separately from the net figure rather than inside it. If the amount entered is a total package that already includes super, switching on the package toggle derives the base salary from it, applying the maximum contribution base where the rule pack says it applies.",
  },
  {
    question: "How does salary sacrificing into super change take-home pay?",
    answer:
      "Salary sacrifice is a pre-tax deduction, so it lowers the taxable income the annual engine assesses and therefore lowers income tax, while also lowering the cash received. The sacrificed amount is added back for the Medicare levy surcharge and study-loan repayment income tests, so those obligations are not reduced by it. Enter an annual amount under super and packaging in advanced mode to see every line move.",
    render: (
      <p>
        Salary sacrifice is a pre-tax deduction, so it lowers the taxable income the annual engine
        assesses and therefore lowers income tax, while also lowering the cash received. The sacrificed
        amount is added back for the Medicare levy surcharge and study-loan repayment income tests, so
        those obligations are not reduced by it. Enter an annual amount under super and packaging in
        advanced mode to see every line move, or use the{" "}
        <a href="/au/pay-tax/super-contributions-calculator">super contributions calculator</a> to
        check the concessional cap at the same time.
      </p>
    ),
  },
  {
    question: "What is the Medicare levy surcharge?",
    answer:
      "The Medicare levy surcharge is an extra levy that applies to people without private hospital cover whose income for surcharge purposes exceeds the thresholds published for the year. It is distinct from the ordinary Medicare levy and appears on its own line in the annual tax position. Set the private hospital cover toggle and the family status fields to see whether the surcharge applies at the thresholds in the resolved rule pack.",
  },
  {
    question: "What is SAPTO?",
    answer:
      "SAPTO is the seniors and pensioners tax offset, a non-refundable offset for Australian residents who meet the ATO age and pension eligibility conditions. It is applied against income tax after the low income tax offset and cannot on its own produce a refund. Switching on the SAPTO field and choosing the matching status includes it in the annual liability at the amounts in the rule pack for the selected year.",
  },
];
