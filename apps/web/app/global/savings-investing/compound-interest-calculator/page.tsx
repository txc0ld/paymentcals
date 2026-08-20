import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SavingsCalculator } from "../../../../components/breadth/savings-calculator";

const entry = getRegistryEntry("GL-SAVE-002")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/global/savings-investing/compound-interest-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <SavingsCalculator variant="compound" />;
}
