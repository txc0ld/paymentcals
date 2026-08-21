import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { StampDutyCalculator } from "../../../../components/breadth/stamp-duty-calculator";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-HOME-018")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/property-buying-costs-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-HOME-018" />
      <StampDutyCalculator variant="buying_costs" />
    </>
  );
}
