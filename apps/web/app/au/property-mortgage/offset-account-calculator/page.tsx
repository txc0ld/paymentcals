import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SavingsPresetCalculator } from "../../../../components/home/savings-preset-calculator";

const entry = getRegistryEntry("AU-HOME-006")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/offset-account-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <SavingsPresetCalculator variant="offset" />;
}
