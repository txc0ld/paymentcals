import type { Metadata } from "next";
import { ContentPageArticle } from "../../components/content-page";
import { ABOUT_PAGE } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_PAGE.description,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <ContentPageArticle page={ABOUT_PAGE} label="About // PaymentCalcs" />;
}
