import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { IncomeTaxExplorer } from "../../../../components/pay/income-tax-explorer";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-014")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/income-tax-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-014" />
      <IncomeTaxExplorer />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How is income tax calculated in Australia?",
    answer:
      "Taxable income is split across the statutory brackets published for the year and the tax category, and each slice is taxed at that band's rate; the amounts are then added together. Income falling in a band is taxed only at that band's rate, which is why moving into a higher bracket never taxes the whole income at the higher rate. The bracket decomposition table shows the dollars taxed in each band and the tax on them, and it is displayed only when those rows re-add to the engine's own total.",
  },
  {
    question: "What is the difference between a marginal rate and an effective rate?",
    answer:
      "The marginal rate is the statutory rate that applies to your next dollar of income; the effective rate is total tax divided by taxable income. The effective rate is always the lower of the two under a progressive system, because earlier dollars were taxed in lower bands. Both are shown here, along with a step curve marking where your income sits.",
  },
  {
    question: "What is the low income tax offset?",
    answer:
      "The low income tax offset is a non-refundable offset that reduces income tax for lower taxable incomes and phases out as income rises. Because it is non-refundable it can reduce tax to nil but cannot generate a refund by itself. It is calculated from the amounts in the rule pack for the year selected and shown as its own line beneath the headline figure.",
  },
  {
    question: "Does this figure include the Medicare levy and study loans?",
    answer:
      "No. The headline figure is bracket tax only, before offsets and levies, and the amount after the low income tax offset is stated alongside it. The Medicare levy, the Medicare levy surcharge and compulsory study-loan repayments are separate obligations that are added to the annual position elsewhere on the site.",
    render: (
      <p>
        No. The headline figure is bracket tax only, before offsets and levies, and the amount after
        the low income tax offset is stated alongside it. The Medicare levy, the Medicare levy
        surcharge and compulsory study-loan repayments are separate obligations, and the{" "}
        <a href="/au/pay-tax/pay-calculator">pay calculator</a> assembles all of them into one annual
        position.
      </p>
    ),
  },
  {
    question: "How is income tax different for foreign residents and working holiday makers?",
    answer:
      "Each tax category has its own published bracket ladder, so the same taxable income produces different tax. The comparison panel re-runs the same income under every category the rule pack publishes for that year. Where the ATO has not yet published brackets for a category and year, no figure is shown rather than an estimate.",
    render: (
      <p>
        Each tax category has its own published bracket ladder, so the same taxable income produces
        different tax. The comparison panel re-runs the same income under every category the rule pack
        publishes for that year, and where the ATO has not yet published brackets for a category and
        year, no figure is shown rather than an estimate. Employer withholding follows a separate set
        of scales, set out in the{" "}
        <a href="/au/pay-tax/payg-withholding-calculator">PAYG withholding calculator</a>.
      </p>
    ),
  },
];
