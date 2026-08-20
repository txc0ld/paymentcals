import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { CreditCardCalculator } from "../../../../components/breadth/credit-card-calculator";

const entry = getRegistryEntry("AU-DEBT-012")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/loans-debt/credit-card-payoff-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <CreditCardCalculator />;
}
