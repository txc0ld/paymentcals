import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-007")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/salary-to-hourly-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-007" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-007", primaryMetric: "impliedHourly", primaryLabel: "Implied hourly rate", simpleShowsHours: true, intro: "See what an annual salary works out to per hour for your hours and weeks worked." }} />
    </>
  );
}
