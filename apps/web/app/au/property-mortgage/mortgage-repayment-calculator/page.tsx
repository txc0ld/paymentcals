import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { MortgageRepaymentsCalculator } from "../../../../components/home/mortgage-repayments-calculator";

const entry = getRegistryEntry("AU-HOME-001")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/property-mortgage/mortgage-repayment-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <MortgageRepaymentsCalculator />;
}
