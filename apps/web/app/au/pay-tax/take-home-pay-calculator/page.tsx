import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { PayCalculator } from "../../../../components/pay/pay-calculator";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("AU-PAY-002")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/take-home-pay-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="AU-PAY-002" />
      <PayCalculator variant={{ calculatorId: "AU-PAY-002", primaryMetric: "netPerCycle", primaryLabel: "Take-home pay", intro: "Your pay after tax, Medicare and study-loan repayments. Employer super is shown separately." }} />
    </>
  );
}
