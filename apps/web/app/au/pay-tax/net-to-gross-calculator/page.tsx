import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { NetToGrossCalculator } from "../../../../components/pay/net-to-gross-calculator";

const entry = getRegistryEntry("AU-PAY-004")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/net-to-gross-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <NetToGrossCalculator />;
}
