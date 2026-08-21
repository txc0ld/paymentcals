import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { MortgageSimulator } from "../../../../components/home/mortgage-simulator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-002")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "What is a mortgage simulator?",
    answer:
      "It runs your loan forward on a scheduled ledger, one repayment period at a time, with dated events applied on the periods they actually fall in. Rate changes, extra repayments, offset balances and fees each land on their own date instead of being averaged across the term. Every period is reconciled — opening balance plus interest less repayment must equal the closing balance — and a reconciliation failure stops the result rather than being shown as a warning.",
    render: (
      <p>
        It runs your loan forward on a scheduled ledger, one repayment period at a time, with dated
        events applied on the periods they actually fall in. Rate changes, extra repayments, offset
        balances and fees each land on their own date instead of being averaged across the term.
        Every period is reconciled — opening balance plus interest less repayment must equal the
        closing balance — and a reconciliation failure stops the result rather than being shown as a
        warning; the{" "}
        <Link href="/methodology/mortgage-simulator" className={LINK}>
          methodology page
        </Link>{" "}
        lists the invariants.
      </p>
    ),
  },
  {
    question: "How do I compare two mortgage scenarios?",
    answer:
      "Switch the simulator into compare mode and edit scenario A and scenario B separately; both run through the same ledger on the same loan so the difference is attributable to the events you changed. The results show each scenario's total interest and payoff date alongside the interest difference and the time difference between them. Nothing is inferred about which scenario suits you — the calculator reports the two schedules and the gap.",
  },
  {
    question: "Does the simulator model daily interest accrual?",
    answer:
      "No. Interest is accrued per repayment period, and daily accrual is not modelled in this release, which the limitations panel states on every result. Contracts that accrue daily and debit monthly will differ from this schedule by small amounts that grow with the term. The period basis is shown with the working so the difference is visible rather than hidden.",
  },
  {
    question: "How does an offset balance change the simulation?",
    answer:
      "An offset balance is netted against the loan balance before interest is charged for that period, so it lowers the interest component without reducing the amount you owe. The simulator keeps the offset money separate from principal in every row, which is why it still shows as cash available. Deposits into the offset and withdrawals out of it are applied on their dates.",
    render: (
      <p>
        An offset balance is netted against the loan balance before interest is charged for that
        period, so it lowers the interest component without reducing the amount you owe. The
        simulator keeps the offset money separate from principal in every row, which is why it still
        shows as cash available. For an offset-only view, the{" "}
        <Link href="/au/property-mortgage/offset-account-calculator" className={LINK}>
          offset account calculator
        </Link>{" "}
        runs the same ledger with the offset inputs brought forward.
      </p>
    ),
  },
  {
    question: "Are the simulator's interest rates real lender rates?",
    answer:
      "No — every rate in the simulator is a figure you enter, including the dated changes. The calculator holds no lender pricing and makes no forecast of where rates go next. It reports what the schedule does at the rates and dates you supply, with those inputs listed in the assumptions.",
  },
  {
    question: "Why does the payoff date move when I add a fee?",
    answer:
      "Fees are charged to the ledger on their dates, so they either increase the balance interest is charged on or consume part of a repayment that would otherwise have reduced principal. Either way the schedule takes longer to close and the payoff date shifts. The schedule rows show the period each fee lands in.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/mortgage-simulator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-002" />
      <MortgageSimulator />
      <FaqSection items={FAQ} />
    </>
  );
}
