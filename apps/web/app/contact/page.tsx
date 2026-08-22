import type { Metadata } from "next";
import { ContentPageArticle } from "../../components/content-page";
import { CONTACT_PAGE } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "Contact",
  description: CONTACT_PAGE.description,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <ContentPageArticle page={CONTACT_PAGE} label="Contact // PaymentCalcs" />;
}
