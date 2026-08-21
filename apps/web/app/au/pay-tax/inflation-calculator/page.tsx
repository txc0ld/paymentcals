import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { InflationCalculator } from "../../../../components/pay/inflation-calculator";
import { FaqSection } from "../../../../components/seo/faq-section";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-015")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/inflation-calculator" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-015" />
      <InflationCalculator />
      <FaqSection items={FAQS} />
    </>
  );
}

const FAQS = [
  {
    question: "How do I work out whether my pay rise kept up with inflation?",
    answer:
      "Compare what you earn now with the salary that would hold the purchasing power of your old salary at today's prices. This calculator takes the salary at your last rise, moves it by the change in the CPI index between the two quarters, and reports the figure needed to match it. Entering your current salary adds a direct comparison showing how far ahead of or behind that figure it sits.",
  },
  {
    question: "What is the CPI and where does the series come from?",
    answer:
      "The Consumer Price Index is the ABS measure of the price of a fixed basket of goods and services, published quarterly. The series used here is the ABS All groups CPI sourced through RBA table G1 and stored in a versioned rule pack with its source and retrieval date. The calculator snaps the dates you choose to the published quarters and states which quarters it used.",
  },
  {
    question: "What is the difference between the CPI and the Wage Price Index?",
    answer:
      "The CPI measures how prices move; the Wage Price Index measures how wage rates move for the same job, excluding bonuses and changes in the composition of the workforce. Comparing the two over one window shows whether wages across the economy grew faster or slower than prices. The comparison here reads the WPI at the exact quarters the CPI result landed on, so both percentages describe the same period.",
    render: (
      <p>
        The CPI measures how prices move; the Wage Price Index measures how wage rates move for the
        same job, excluding bonuses and changes in the composition of the workforce. Comparing the two
        over one window shows whether wages across the economy grew faster or slower than prices, and
        the comparison here reads the WPI at the exact quarters the CPI result landed on. To see what a
        different salary means after tax, use the{" "}
        <a href="/au/pay-tax/pay-calculator">pay calculator</a>.
      </p>
    ),
  },
  {
    question: "What would my old salary be worth today?",
    answer:
      "Its effective value is the old salary deflated by the CPI change between the two quarters, expressed in the dollars of the starting year. The difference between that value and the unchanged salary is the purchasing power lost if the salary never moved. Both figures are shown, along with the cumulative CPI change and the index values behind it.",
    render: (
      <p>
        Its effective value is the old salary deflated by the CPI change between the two quarters,
        expressed in the dollars of the starting year. The difference between that value and the
        unchanged salary is the purchasing power lost if the salary never moved. Both figures are
        shown with the cumulative CPI change and the index values behind it; the{" "}
        <a href="/au/pay-tax/take-home-pay-calculator">take-home pay calculator</a> converts either
        salary into after-tax cash.
      </p>
    ),
  },
  {
    question: "Does the calculator forecast future inflation?",
    answer:
      "No. Only published quarters are used, and nothing is extrapolated or projected beyond the latest quarter in the resolved rule pack. Dates outside the published range are rejected rather than estimated. The CPI is also an economy-wide basket, so individual costs can move differently from it.",
  },
];
