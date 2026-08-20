import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";

const entry = getRegistryEntry("AU-PAY-005")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/salary-including-super-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <PayCalculator variant={{ calculatorId: "AU-PAY-005", primaryMetric: "netPerCycle", primaryLabel: "Take-home pay", defaults: { includesSuper: true }, intro: "Enter a total remuneration package. The base salary is derived after super, including the maximum contribution base where it applies." }} />;
}
