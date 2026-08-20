import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { MortgageSimulator } from "../../../../components/home/mortgage-simulator";

const entry = getRegistryEntry("AU-HOME-002")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/mortgage-simulator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <MortgageSimulator />;
}
