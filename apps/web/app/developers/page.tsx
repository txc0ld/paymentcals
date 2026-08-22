import type { Metadata } from "next";
import { ContentPageArticle } from "../../components/content-page";
import { DEVELOPERS_PAGE } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "For Developers & AI Agents",
  description: DEVELOPERS_PAGE.description,
  alternates: { canonical: "/developers" },
};

export default function DevelopersPage() {
  return <ContentPageArticle page={DEVELOPERS_PAGE} label="Developers // PaymentCalcs" />;
}
