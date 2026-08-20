import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { StampDutyCalculator } from "../../../../components/breadth/stamp-duty-calculator";

const entry = getRegistryEntry("AU-HOME-017")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/stamp-duty-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <StampDutyCalculator variant="duty" />;
}
