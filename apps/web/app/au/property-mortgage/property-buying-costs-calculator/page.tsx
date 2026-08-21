import type { Metadata } from "next";
import Link from "next/link";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { StampDutyCalculator } from "../../../../components/breadth/stamp-duty-calculator";
import { FaqSection, type FaqItem } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-018")!;

const LINK =
  "underline decoration-hairline-strong underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const FAQ: FaqItem[] = [
  {
    question: "What are the upfront costs of buying a house in Australia?",
    answer:
      "The largest is usually general transfer duty, which this calculator computes from the published rates in the active rule pack for the state or territory you select. Around it sit costs that vary by transaction rather than by statute — conveyancing or legal fees, building and pest inspections, lenders mortgage insurance, loan application and registration fees, and moving costs — which you enter yourself. The result adds your entered amounts to the duty figure and reports the total cash needed at settlement.",
  },
  {
    question: "How much cash do I need to buy a property?",
    answer:
      "Cash at settlement is your deposit plus the upfront costs, and this calculator covers the costs side: duty at the published rates for your jurisdiction plus every amount you enter. Work out the deposit for a given price and loan-to-value ratio in the home deposit calculator, then add the total from this page. Neither figure includes ongoing costs such as council rates, strata levies or insurance.",
    render: (
      <p>
        Cash at settlement is your deposit plus the upfront costs, and this calculator covers the
        costs side: duty at the published rates for your jurisdiction plus every amount you enter.
        Work out the deposit for a given price and loan-to-value ratio in the{" "}
        <Link href="/au/property-mortgage/home-deposit-calculator" className={LINK}>
          home deposit calculator
        </Link>
        , then add the total from this page. Neither figure includes ongoing costs such as council
        rates, strata levies or insurance.
      </p>
    ),
  },
  {
    question: "Does this calculator include stamp duty concessions?",
    answer:
      "Yes, where a jurisdiction's published concession schedule has been transcribed into a verified rule pack. Selecting a buyer type prices that scheme from its own rate table and shows the concessional duty beside the general-rate figure for the same value. Eligibility is assessed by the revenue office rather than here, so the calculator shows the published rate for the buyer type you choose and states that condition.",
    render: (
      <p>
        Yes, where a jurisdiction&apos;s published concession schedule has been transcribed into a
        verified rule pack. Selecting a buyer type prices that scheme from its own rate table and
        shows the concessional duty beside the general-rate figure for the same value. Eligibility is
        assessed by the revenue office rather than here — the{" "}
        <Link href="/au/property-mortgage/stamp-duty-calculator" className={LINK}>
          stamp duty calculator
        </Link>{" "}
        shows the same figures with the full bracket ladder.
      </p>
    ),
  },
  {
    question: "Is lenders mortgage insurance included in the buying costs?",
    answer:
      "Only if you enter it — LMI premiums are set by insurers and vary with the loan-to-value ratio, the loan size and the lender, so the calculator holds no pricing table for them. Your lender can quote the premium for your loan, and it goes into the costs you enter. The loan-to-value ratio that drives it can be checked in the LVR calculator.",
    render: (
      <p>
        Only if you enter it — LMI premiums are set by insurers and vary with the loan-to-value
        ratio, the loan size and the lender, so the calculator holds no pricing table for them. Your
        lender can quote the premium for your loan, and it goes into the costs you enter. The ratio
        that drives it can be checked in the{" "}
        <Link href="/au/property-mortgage/lvr-calculator" className={LINK}>
          LVR calculator
        </Link>
        .
      </p>
    ),
  },
  {
    question: "Why does the duty figure change when I change state?",
    answer:
      "Each state and territory has its own duty rate table, thresholds, concession schemes and surcharge rules, and the calculator resolves a separate rule pack for the jurisdiction you select. Nothing is carried over from the previously selected state, and if a jurisdiction's pack cannot be resolved the calculator blocks rather than substituting another state's rates. The source and retrieval date for the pack in use are shown with the result.",
  },
];

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/property-buying-costs-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-018" />
      <StampDutyCalculator variant="buying_costs" />
      <FaqSection items={FAQ} />
    </>
  );
}
