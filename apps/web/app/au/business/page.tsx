import type { Metadata } from "next";
import { CategoryDirectory } from "../../../components/calculator-directory";

export const metadata: Metadata = {
  title: "Business Calculators Australia",
  description: "GST and contractor day-rate calculators with rates from official rule packs and GST never counted as revenue.",
  alternates: { canonical: "/au/business" },
};

export default function Page() {
  return <CategoryDirectory category="business" />;
}
