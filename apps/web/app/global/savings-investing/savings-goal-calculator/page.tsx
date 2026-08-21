import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SavingsCalculator } from "../../../../components/breadth/savings-calculator";
import { CalculatorStructuredData } from "../../../../components/structured-data";

const entry = getRegistryEntry("GL-SAVE-003")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/global/savings-investing/savings-goal-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return (
    <>
      <CalculatorStructuredData id="GL-SAVE-003" />
      <SavingsCalculator variant="goal" />
    </>
  );
}
