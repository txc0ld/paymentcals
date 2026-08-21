import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { IncomeTaxExplorer } from "../../../../components/pay/income-tax-explorer";

const entry = getRegistryEntry("AU-PAY-014")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/income-tax-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <IncomeTaxExplorer />;
}
