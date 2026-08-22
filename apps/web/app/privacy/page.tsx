import type { Metadata } from "next";
import { ContentPageArticle } from "../../components/content-page";
import { PRIVACY_PAGE } from "../../lib/site-content";

export const metadata: Metadata = {
  title: "Privacy",
  description: PRIVACY_PAGE.description,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <ContentPageArticle page={PRIVACY_PAGE} label="Privacy // PaymentCalcs" />;
}
