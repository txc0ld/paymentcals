import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";

const entry = getRegistryEntry("AU-PAY-003")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/gross-to-net-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <PayCalculator variant={{ calculatorId: "AU-PAY-003", primaryMetric: "netAnnual", primaryLabel: "Net annual income", intro: "Convert a gross salary to net at every pay frequency. The breakdown tab shows each conversion." }} />;
}
