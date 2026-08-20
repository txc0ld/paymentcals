import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { RefinanceCalculator } from "../../../../components/home/refinance-calculator";

const entry = getRegistryEntry("AU-HOME-012")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/refinance-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <RefinanceCalculator />;
}
