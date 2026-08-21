import { getRegistryEntry, routePath } from "@paymentcalcs/calculator-registry";
import { SITE_URL } from "../lib/site";
import { CATEGORY_LABELS } from "./calculator-directory";

/**
 * C7 — SoftwareApplication + BreadcrumbList JSON-LD for a calculator route,
 * generated from the registry entry only (no fabricated ratings, reviews or
 * claims). The breadcrumb mirrors the real route hierarchy: the category
 * segment of `routePath` is itself a page (e.g. /au/pay-tax).
 */
export function CalculatorStructuredData({ id }: { id: string }) {
  const entry = getRegistryEntry(id);
  if (!entry) return null;
  const path = routePath(entry);
  const url = `${SITE_URL}${path}`;
  const categoryPath = path.slice(0, path.lastIndexOf("/"));
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: entry.displayName,
        description: entry.seo.description,
        url,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
        creator: { "@type": "Organization", name: "PaymentCalcs" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: CATEGORY_LABELS[entry.category] ?? entry.category,
            item: `${SITE_URL}${categoryPath}`,
          },
          { "@type": "ListItem", position: 3, name: entry.displayName, item: url },
        ],
      },
    ],
  };
  // Static JSON built from the registry — no user input reaches this markup.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
