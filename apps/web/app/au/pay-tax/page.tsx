import type { Metadata } from "next";
import { CategoryDirectory } from "../../../components/calculator-directory";

export const metadata: Metadata = {
  title: "Pay and Tax Calculators Australia",
  description: "Australian pay, tax, withholding and study-loan calculators with full working, official-source rule packs and separated liability vs withholding.",
  alternates: { canonical: "/au/pay-tax" },
};

export default function Page() {
  return <CategoryDirectory category="pay-tax" />;
}
