import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { GstCalculator } from "../../../../components/gst/gst-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-BIZ-001")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How do I add GST to a price?",
    answer:
      "Select the add mode, enter the amount excluding GST, and the calculator applies the current Australian GST rate from the active rule pack to produce the GST amount and the GST-inclusive total. The rate is never hard-coded in the page — it is resolved from a versioned pack that cites the Australian Taxation Office, with the retrieval date and content hash recorded. The working panel shows the multiplication and the rounding step.",
    render: (
      <p>
        Select the add mode, enter the amount excluding GST, and the calculator applies the current
        Australian GST rate from the active rule pack to produce the GST amount and the GST-inclusive
        total. The rate is never hard-coded in the page — it is resolved from a versioned pack that
        cites the Australian Taxation Office, listed on the{" "}
        <Link href="/sources" className={LINK}>
          sources page
        </Link>{" "}
        with its retrieval date and content hash.
      </p>
    ),
  },
  {
    question: "How do I work out the GST included in a price?",
    answer:
      "Select the remove mode and enter the GST-inclusive amount: the calculator divides by one plus the current rate to recover the GST-exclusive amount, then reports the GST component as the difference. Working backwards from an inclusive figure is not the same operation as applying the rate forward, which is why the two modes are separate rather than one field with a toggle. Both the divisor and the rounding are shown in the working.",
  },
  {
    question: "How does GST registration work?",
    answer:
      "Registration is required once your GST turnover reaches the relevant threshold, and the calculator displays the thresholds from its registration rule pack — a general threshold, a separate threshold for non-profit bodies, the number of days you have to register after reaching it, and the categories such as taxi and ride-sourcing that must register regardless of turnover. Those figures are reference-only and never feed the arithmetic on this page. The turnover test is applied to your current or projected twelve-month turnover, and registration itself is done with the Australian Taxation Office.",
  },
  {
    question: "Why do my invoice lines not add up to the GST total?",
    answer:
      "Because GST can be rounded at the line level or at the invoice total, and the two legitimately differ by cents on a multi-line invoice. The advanced mode makes that a choice: pick per-line or invoice-total rounding and the calculator allocates the rounded total back across the lines by largest remainder, so the lines always reconcile to the total shown. The rounding level in use is stated with the result.",
  },
  {
    question: "Which sales are GST-free or input taxed?",
    answer:
      "That classification comes from the GST law and how it applies to your particular supply, so the calculator treats it as your selection rather than inferring it from an item description. Marking a line GST-free or input taxed excludes it from the GST calculation but keeps it in the invoice total. Entitlement to input tax credits on your purchases is a separate question that this calculator does not assess.",
  },
  {
    question: "Do contractors have to charge GST?",
    answer:
      "It depends on whether the contractor is registered for GST, which turns on the turnover thresholds shown in the calculator and on the categories that must register regardless of turnover. Where GST applies it is quoted on top of the fee and passed on to the Australian Taxation Office, so it is not part of what the contractor earns. The contractor day rate calculator keeps GST separate from income for exactly that reason.",
    render: (
      <p>
        It depends on whether the contractor is registered for GST, which turns on the registration
        turnover thresholds shown in the calculator and on the categories that must register
        regardless of turnover. Where GST applies it is quoted on top of the fee and passed on to the
        Australian Taxation Office, so it is not part of what the contractor earns. The{" "}
        <Link href="/au/business/contractor-day-rate-calculator" className={LINK}>
          contractor day rate calculator
        </Link>{" "}
        keeps GST separate from income for exactly that reason.
      </p>
    ),
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/business/gst-calculator" },
};

export default function GstCalculatorPage() {
  return (
    <>
      <CalculatorStructuredData id="AU-BIZ-001" />
      <GstCalculator />
      <FaqSection items={FAQ} />
    </>
  );
}
