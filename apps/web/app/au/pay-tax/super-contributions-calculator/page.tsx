import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SuperContributionsCalculator } from "../../../../components/pay/super-contributions-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-016")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/super-contributions-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-016" />
      <SuperContributionsCalculator />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How much super does an employer have to pay?",
    answer:
      "Employers pay the super guarantee on ordinary time earnings at the rate published for the financial year, up to the maximum contribution base above which no further contribution is required. This calculator applies the rate and ceiling in the ATO-sourced rule pack for the year selected and displays both alongside the amount. The contribution goes to a super fund and is never take-home cash.",
  },
  {
    question: "What is the concessional contributions cap?",
    answer:
      "The concessional cap is the annual limit on before-tax contributions, which includes employer super guarantee amounts and any salary sacrifice or personal deductible contributions. Contributions above the cap are taxed differently, so the cap headroom and any amount over it are reported separately here. The cap figure used is the one published for the financial year selected and is shown with the result.",
  },
  {
    question: "How does salary sacrificing into super change take-home pay?",
    answer:
      "Salary sacrifice is a before-tax contribution, so it reduces taxable income and therefore income tax, while reducing the cash you receive by the amount sacrificed. It also counts towards the concessional cap alongside employer contributions, which is why the cap meter moves when you enter an amount. Sacrificed amounts are added back for the Medicare levy surcharge and study-loan repayment income tests, so those obligations are not reduced by it.",
    render: (
      <p>
        Salary sacrifice is a before-tax contribution, so it reduces taxable income and therefore
        income tax, while reducing the cash you receive by the amount sacrificed. It also counts
        towards the concessional cap alongside employer contributions, which is why the cap meter moves
        when you enter an amount. Sacrificed amounts are added back for the surcharge and study-loan
        income tests, and the{" "}
        <a href="/au/pay-tax/take-home-pay-calculator">take-home pay calculator</a> shows the full
        cash effect line by line.
      </p>
    ),
  },
  {
    question: "What is Division 293 tax?",
    answer:
      "Division 293 is an additional tax on concessional contributions for people whose income plus those contributions exceeds the threshold published for the year. Where that happens, the extra tax applies to the lesser of the excess and the concessional contributions. This calculator reports the excess amount and the threshold it was measured against rather than assuming either figure.",
  },
  {
    question: "How does my super balance compare with others in my age group?",
    answer:
      "The comparison panel shows the median and average balances the ATO publishes for the age, sex and taxable income range selected, along with the number of people in that group. The figures are read cell by cell from the published statistics, so groups are never blended together to fill a gap. Where the ATO suppresses a cell because the group is small, nothing is shown rather than an estimate.",
    render: (
      <p>
        The comparison panel shows the median and average balances the ATO publishes for the age, sex
        and taxable income range selected, along with the number of people in that group. The figures
        are read cell by cell from the published statistics, so groups are never blended to fill a gap,
        and suppressed cells show nothing rather than an estimate. To see how employer super sits
        inside a whole remuneration package, use the{" "}
        <a href="/au/pay-tax/salary-including-super-calculator">salary including super calculator</a>.
      </p>
    ),
  },
  {
    question: "Do self-employed people get super?",
    answer:
      "Not from an employer — the super guarantee is an obligation on employers, and a sole trader has none, so no guarantee contribution arises from the business itself. Super for a self-employed person therefore comes from personal contributions paid into a fund out of business income. Those contributions can be claimed as a deduction where the conditions are met, and they count towards the concessional cap alongside any employer or salary sacrifice amounts from other work. Switching this calculator to self-employed removes the employer figure and measures personal contributions against the whole cap.",
  },
];
