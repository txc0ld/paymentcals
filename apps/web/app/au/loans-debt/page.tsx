import type { Metadata } from "next";
import { CategoryDirectory } from "../../../components/calculator-directory";

export const metadata: Metadata = {
  title: "Loan and Debt Calculators Australia",
  description: "Personal loans, car loans with balloons and credit-card payoff calculators with schedules that reconcile every period.",
  alternates: { canonical: "/au/loans-debt" },
};

export default function Page() {
  return <CategoryDirectory category="loans-debt" />;
}
