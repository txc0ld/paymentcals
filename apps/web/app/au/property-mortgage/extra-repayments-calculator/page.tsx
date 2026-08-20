import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SavingsPresetCalculator } from "../../../../components/home/savings-preset-calculator";

const entry = getRegistryEntry("AU-HOME-004")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/extra-repayments-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <SavingsPresetCalculator variant="extra_repayments" />;
}
