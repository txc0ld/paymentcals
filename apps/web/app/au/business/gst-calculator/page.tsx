import type { Metadata } from "next";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { GstCalculator } from "../../../../components/gst/gst-calculator";

const entry = getRegistryEntry("AU-BIZ-001")!;

export const metadata: Metadata = {
  title: entry.seo.title,
  description: entry.seo.description,
  alternates: { canonical: "/au/business/gst-calculator" },
  openGraph: {
    title: entry.seo.title,
    description: entry.seo.description,
    type: "website",
  },
};

export default function GstCalculatorPage() {
  return <GstCalculator />;
}
