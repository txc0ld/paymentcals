import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { RateChangeCalculator } from "../../../../components/home/rate-change-calculator";

const entry = getRegistryEntry("AU-HOME-007")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/rate-change-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <RateChangeCalculator />;
}
