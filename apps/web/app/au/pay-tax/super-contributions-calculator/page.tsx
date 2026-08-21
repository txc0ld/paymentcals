import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { SuperContributionsCalculator } from "../../../../components/pay/super-contributions-calculator";

const entry = getRegistryEntry("AU-PAY-016")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/pay-tax/super-contributions-calculator" },
  openGraph: { title: entry.seo.title, description: entry.seo.description, type: "website" },
};

export default function Page() {
  return <SuperContributionsCalculator />;
}
