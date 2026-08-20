import type { MetadataRoute } from "next";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://paymentcalcs.com";
  const staticPages = [
    "",
    "/calculators",
    "/au/pay-tax",
    "/au/property-mortgage",
    "/au/loans-debt",
    "/au/business",
    "/global/savings-investing",
    "/sources",
    "/changelog",
  ];
  return [
    ...staticPages.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const })),
    ...calculatorRegistry.flatMap((entry) => [
      { url: `${base}${routePath(entry)}`, changeFrequency: "weekly" as const },
      { url: `${base}/methodology/${entry.slug}`, changeFrequency: "monthly" as const },
    ]),
  ];
}
