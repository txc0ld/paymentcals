import { zRegistryEntry, type RegistryEntry } from "./schema";

/**
 * P0 registry. Routes are added here as their phase ships; the §5 route set
 * in the build directive is the authoritative list of what P0 contains.
 */
const entries: RegistryEntry[] = [
  zRegistryEntry.parse({
    id: "AU-BIZ-001",
    slug: "gst-calculator",
    displayName: "GST Calculator",
    category: "business",
    jurisdictionScope: "au",
    releasePriority: "P0",
    calculationClass: "A",
    engineDependencies: ["E20"],
    rulePackDependencies: ["gst"],
    supportedModes: ["simple", "advanced"],
    inputSchemaVersion: "1",
    resultSchemaVersion: "1",
    disclosureSet: ["universal-footer-v2.0"],
    sourceSet: ["ato-how-gst-works-2026-08-20"],
    seo: {
      title: "GST Calculator Australia — Add, Remove or Split 10% GST",
      description:
        "Add GST, remove GST or split a GST-inclusive amount using the current Australian GST rate, with full working shown and sources cited.",
    },
    ownership: {
      owner: "tmayorx@gmail.com",
      reviewCadence: "annual",
    },
  }),
];

export const calculatorRegistry: readonly RegistryEntry[] = entries;

export function getRegistryEntry(id: string): RegistryEntry | undefined {
  return calculatorRegistry.find((entry) => entry.id === id);
}

export function getRegistryEntryBySlug(
  category: string,
  slug: string,
): RegistryEntry | undefined {
  return calculatorRegistry.find((entry) => entry.category === category && entry.slug === slug);
}
