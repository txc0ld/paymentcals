import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SavingsPresetCalculator } from "../../../../components/home/savings-preset-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-006")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "What is an offset account and how does it reduce interest?",
    answer:
      "An offset account is a transaction account linked to your home loan whose balance is netted against the loan balance before interest is charged. This calculator applies that netting in every repayment period of a scheduled ledger, so a dollar sitting in the offset removes a period of interest on a dollar of loan without repaying any of it. The interest saved compounds, because a smaller interest charge leaves more of each repayment to reduce principal.",
  },
  {
    question: "Is an offset account better than making extra repayments?",
    answer:
      "On interest alone the two are close, because both reduce the balance that interest is charged on — the calculator runs both on the same loan and shows the interest saved and time saved for each. The difference is access: offset money stays yours to withdraw at any time, while money paid into the loan is gone into the balance and redraw depends on your contract. The comparison panel reports both figures so the trade-off is a number, not an impression.",
    render: (
      <p>
        On interest alone the two are close, because both reduce the balance that interest is
        charged on — the calculator runs both on the same loan and shows the interest saved and time
        saved for each. The difference is access: offset money stays yours to withdraw at any time,
        while money paid into the loan is gone into the balance and redraw depends on your contract.
        The{" "}
        <Link href="/au/property-mortgage/extra-repayments-calculator" className={LINK}>
          extra repayments calculator
        </Link>{" "}
        prices the other side of that comparison in full.
      </p>
    ),
  },
  {
    question: "How much do I need in an offset account for it to be worth it?",
    answer:
      "Enter your offset balance and the calculator prices the exact interest saved over the life of the loan against a baseline with no offset. Because the saving scales with the balance and the rate, there is no universal threshold — the figure to weigh it against is the account fee or the interest you forgo elsewhere, which you enter yourself. The result also shows the cash still sitting in the offset, labelled as available rather than repaid.",
  },
  {
    question: "Does money in an offset account reduce my loan balance?",
    answer:
      "No — the loan balance is unchanged and the offset money remains in your account. Only the interest calculation treats the two as netted, which is why the schedule shows the offset cash separately from principal in every row. Withdrawing from the offset raises the interest charged from that period onward, and the calculator applies a one-off withdrawal on the date you set.",
  },
  {
    question: "How is offset interest calculated on this site?",
    answer:
      "The offset is applied against the loan balance in each repayment period of the ledger, and interest is charged on the netted amount for that period. Daily accrual is not modelled in this release, so contracts that offset daily and debit monthly will differ by small amounts, which the limitations panel states on every result. The working panel shows the netted balance and the interest charge for each period.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/offset-account-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-006" />
      <SavingsPresetCalculator variant="offset" />
      <FaqSection items={FAQ} />
    </>
  );
}
