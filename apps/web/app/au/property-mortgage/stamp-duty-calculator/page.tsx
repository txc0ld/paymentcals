import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { StampDutyCalculator } from "../../../../components/breadth/stamp-duty-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-017")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "How is stamp duty calculated in NSW, VIC and QLD?",
    answer:
      "Every Australian state and territory charges general transfer duty on a sliding bracket scale: the dutiable value falls into a band, and duty is a fixed base for that band plus a rate applied to the amount above the band's floor. The states differ in how that rate is expressed — some per $100 or part thereof, some as a percentage of the excess, and one applies a statutory formula before percentage slabs — and this calculator uses each jurisdiction's own method rather than a single approximation. The published rates come from the active rule pack for the state you select, and the bracket ladder shows which band your value lands in.",
    render: (
      <p>
        Every Australian state and territory charges general transfer duty on a sliding bracket
        scale: the dutiable value falls into a band, and duty is a fixed base for that band plus a
        rate applied to the amount above the band&apos;s floor. The states differ in how that rate is
        expressed — some per $100 or part thereof, some as a percentage of the excess, and one
        applies a statutory formula before percentage slabs — and this calculator uses each
        jurisdiction&apos;s own method rather than a single approximation. The published rates come
        from the active rule pack for the state you select, each citing its revenue office on the{" "}
        <Link href="/sources" className={LINK}>
          sources page
        </Link>
        .
      </p>
    ),
  },
  {
    question: "Who is eligible for first home buyer stamp duty concessions?",
    answer:
      "Eligibility is assessed by the state or territory revenue office, not by this calculator, and typically turns on matters it does not hold — prior property ownership, residence requirements, citizenship or residency status and the property's use. What the calculator does is price the published concession schedule: select a buyer type and it applies that scheme's own rate table from its separate rule pack, showing the concessional duty beside the general-rate figure for the same value. Buyer-type concessions are offered for the jurisdictions whose published schedules have been transcribed and verified; elsewhere only the general rate is available and the calculator says so.",
  },
  {
    question: "Which states does this stamp duty calculator cover?",
    answer:
      "All eight states and territories have a general transfer duty rule pack, each sourced from that jurisdiction's revenue office with the retrieval date and a content hash recorded. Buyer-type concession schedules are priced for the subset of jurisdictions whose published schemes have been transcribed, and the buyer type field only offers the schemes that exist in a verified pack. If a jurisdiction's rules cannot be resolved, the calculator blocks with a rule-unavailable state instead of substituting another state's rates.",
  },
  {
    question: "Is stamp duty calculated on the purchase price or the property value?",
    answer:
      "Duty is assessed on the dutiable value, which the revenue office determines and which may differ from what you paid — commonly the greater of the consideration and the market value. This calculator uses the figure you enter as the dutiable value and states that assumption in the limitations panel. Where a revenue office assesses a different value, the duty will differ accordingly.",
  },
  {
    question: "What is not included in this stamp duty estimate?",
    answer:
      "Foreign-purchaser surcharges, pensioner and off-the-plan schemes, other exemptions, land tax and the GST treatment of new dwellings are not modelled, and the limitations panel lists this on every result. Mortgage registration and transfer fees are also outside general transfer duty. To add conveyancing, inspection and other upfront amounts to the duty figure, use the property buying costs calculator.",
    render: (
      <p>
        Foreign-purchaser surcharges, pensioner and off-the-plan schemes, other exemptions, land tax
        and the GST treatment of new dwellings are not modelled, and the limitations panel lists this
        on every result. Mortgage registration and transfer fees are also outside general transfer
        duty. To add conveyancing, inspection and other upfront amounts to the duty figure, use the{" "}
        <Link href="/au/property-mortgage/property-buying-costs-calculator" className={LINK}>
          property buying costs calculator
        </Link>
        .
      </p>
    ),
  },
  {
    question: "When is stamp duty payable?",
    answer:
      "Payment deadlines are set by each jurisdiction's duties legislation and are usually tied to settlement or the date of the dutiable transaction, so the timing comes from your revenue office and your conveyancer rather than from this calculator. What the calculator provides is the amount at the published rates for the value and buyer type you select, with the source and retrieval date shown. Treat it as an estimate to plan against, not an assessment.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/stamp-duty-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-017" />
      <StampDutyCalculator variant="duty" />
      <FaqSection items={FAQ} />
    </>
  );
}
