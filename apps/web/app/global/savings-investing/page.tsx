import type { Metadata } from "next";
import { CategoryDirectory } from "../../../components/calculator-directory";

export const metadata: Metadata = {
  title: "Savings Calculators",
  description: "Compound interest and savings-goal calculators with year-by-year growth and exact formulas.",
  alternates: { canonical: "/global/savings-investing" },
};

export default function Page() {
  return <CategoryDirectory category="savings-investing" />;
}
