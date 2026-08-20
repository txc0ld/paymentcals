import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { AffordabilityEstimate } from "../../../../components/breadth/property-tools";

const entry = getRegistryEntry("AU-HOME-022")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/borrowing-affordability-estimate" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <AffordabilityEstimate />;
}
