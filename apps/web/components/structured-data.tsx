import { getRegistryEntry, routePath } from "@paymentcalcs/calculator-registry";

/**
 * C7 — SoftwareApplication JSON-LD for a calculator route, generated from
 * the registry entry only (no fabricated ratings, reviews or claims).
 */
export function CalculatorStructuredData({ id }: { id: string }) {
  const entry = getRegistryEntry(id);
  if (!entry) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: entry.displayName,
    description: entry.seo.description,
    url: `https://paymentcalcs.com${routePath(entry)}`,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    creator: { "@type": "Organization", name: "PaymentCalcs" },
  };
  // Static JSON built from the registry — no user input reaches this markup.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
