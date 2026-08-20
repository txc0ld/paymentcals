import type { Metadata } from "next";
import { CategoryDirectory } from "../../../components/calculator-directory";

export const metadata: Metadata = {
  title: "Property and Mortgage Calculators Australia",
  description: "Mortgage repayments, simulation, offsets, refinance, stamp duty and buying-cost calculators on a reconciled scheduled ledger.",
  alternates: { canonical: "/au/property-mortgage" },
};

export default function Page() {
  return <CategoryDirectory category="property-mortgage" />;
}
