import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";

const entry = getRegistryEntry("AU-PAY-006")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/hourly-to-salary-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <PayCalculator variant={{ calculatorId: "AU-PAY-006", primaryMetric: "annualBase", primaryLabel: "Annual base salary", defaults: { frequency: "hourly" }, simpleShowsHours: true, intro: "Turn an hourly rate into an annual salary and take-home pay for your working pattern." }} />;
}
