import { z } from "zod";

/** §10.1 — every calculator route is machine-readable configuration. */
export const CALCULATOR_CATEGORIES = [
  "pay-tax",
  "property-mortgage",
  "loans-debt",
  "savings-investing",
  "business",
  "everyday",
] as const;

export const CALCULATOR_MODES = ["simple", "advanced", "compare"] as const;

export const zRegistryEntry = z.object({
  /** Stable calculator ID, e.g. AU-BIZ-001. Never changes. */
  id: z.string().regex(/^(AU|GL)-[A-Z]+-\d{3}$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  /** Category segment of the canonical route (§7.1). */
  category: z.enum(CALCULATOR_CATEGORIES),
  /** "au" for country-regulated calculators, "global" for universal ones. */
  jurisdictionScope: z.enum(["au", "global"]),
  releasePriority: z.enum(["P0", "P1", "P2", "P3"]),
  /** §17.5 accuracy classification: A deterministic … D long-horizon projection. */
  calculationClass: z.enum(["A", "B", "C", "D"]),
  engineDependencies: z.array(z.string().regex(/^E\d{2}$/)).min(1),
  /** Rule-pack domains this route requires (resolved per jurisdiction/date). */
  rulePackDependencies: z.array(z.string()),
  supportedModes: z.array(z.enum(CALCULATOR_MODES)).min(1),
  inputSchemaVersion: z.string().min(1),
  resultSchemaVersion: z.string().min(1),
  /** Disclosure component IDs rendered on the result surface (§17.9). */
  disclosureSet: z.array(z.string()).min(1),
  /** Source IDs surfaced in the Sources tab. */
  sourceSet: z.array(z.string()),
  seo: z.object({
    title: z.string().min(1).max(70),
    description: z.string().min(1).max(165),
  }),
  ownership: z.object({
    owner: z.string().min(1),
    reviewCadence: z.string().min(1),
  }),
});

export type RegistryEntry = z.infer<typeof zRegistryEntry>;

export function routePath(entry: RegistryEntry): string {
  const prefix = entry.jurisdictionScope === "au" ? "/au" : "/global";
  return `${prefix}/${entry.category}/${entry.slug}`;
}
