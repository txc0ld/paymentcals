import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { LoanCalculator } from "../../../../components/breadth/loan-calculator";

const entry = getRegistryEntry("AU-DEBT-003")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/loans-debt/car-loan-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <LoanCalculator variant="car" />;
}
