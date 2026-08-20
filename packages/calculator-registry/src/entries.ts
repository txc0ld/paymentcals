import { zRegistryEntry, type RegistryEntry } from "./schema";

/**
 * P0 registry. Routes are added here as their phase ships; the §5 route set
 * in the build directive is the authoritative list of what P0 contains.
 */
const PAY_RULE_DOMAINS = ["income-tax", "medicare", "super-guarantee", "stsl", "payg-withholding"];

const payEntry = (partial: {
  id: string;
  slug: string;
  displayName: string;
  calculationClass?: "A" | "B";
  engines?: string[];
  title: string;
  description: string;
}) =>
  zRegistryEntry.parse({
    id: partial.id,
    slug: partial.slug,
    displayName: partial.displayName,
    category: "pay-tax",
    jurisdictionScope: "au",
    releasePriority: "P0",
    calculationClass: partial.calculationClass ?? "B",
    engineDependencies: partial.engines ?? ["E02", "E03", "E04"],
    rulePackDependencies: PAY_RULE_DOMAINS,
    supportedModes: ["simple", "advanced"],
    inputSchemaVersion: "1",
    resultSchemaVersion: "1",
    disclosureSet: ["universal-footer-v2.0", "pay-estimate-v2.0"],
    sourceSet: ["ato-resident-rates-2026-08-20"],
    seo: { title: partial.title, description: partial.description },
    ownership: { owner: "tmayorx@gmail.com", reviewCadence: "annual + pre-1-July watch" },
  });

const entries: RegistryEntry[] = [
  payEntry({
    id: "AU-PAY-001",
    slug: "pay-calculator",
    displayName: "Pay Calculator",
    title: "Pay Calculator Australia: Tax, Super and Take-Home Pay",
    description:
      "Australian pay calculator showing annual tax, Medicare, study-loan repayments, employer super and PAYG withholding separately, with full working.",
  }),
  payEntry({
    id: "AU-PAY-002",
    slug: "take-home-pay-calculator",
    displayName: "Take-Home Pay Calculator",
    title: "Take-Home Pay Calculator Australia",
    description:
      "Work out your take-home pay per week, fortnight or month after tax, Medicare and study-loan repayments, with every step of the working shown.",
  }),
  payEntry({
    id: "AU-PAY-003",
    slug: "gross-to-net-calculator",
    displayName: "Gross to Net Calculator",
    title: "Gross to Net Salary Calculator Australia",
    description:
      "Convert a gross Australian salary to net pay at every pay frequency under the selected financial year's tax rules, with sources cited.",
  }),
  payEntry({
    id: "AU-PAY-004",
    slug: "net-to-gross-calculator",
    displayName: "Net to Gross Calculator",
    engines: ["E02", "E04", "E24"],
    title: "Net to Gross Salary Calculator Australia",
    description:
      "Solve the gross salary needed for a target take-home amount using a verified reverse calculation over the full Australian tax rules.",
  }),
  payEntry({
    id: "AU-PAY-005",
    slug: "salary-including-super-calculator",
    displayName: "Salary Including Super Calculator",
    title: "Salary Package Including Super Calculator Australia",
    description:
      "Split a total remuneration package into base salary and employer super, including the maximum contribution base, then estimate tax and take-home pay.",
  }),
  payEntry({
    id: "AU-PAY-006",
    slug: "hourly-to-salary-calculator",
    displayName: "Hourly to Salary Calculator",
    title: "Hourly Rate to Salary Calculator Australia",
    description:
      "Convert an hourly rate into annual salary and take-home pay using your hours per week and weeks paid per year, under current Australian tax rules.",
  }),
  payEntry({
    id: "AU-PAY-007",
    slug: "salary-to-hourly-calculator",
    displayName: "Salary to Hourly Calculator",
    title: "Salary to Hourly Rate Calculator Australia",
    description:
      "See the hourly rate implied by an annual salary for your working pattern, alongside tax, super and take-home pay under the selected financial year.",
  }),
  payEntry({
    id: "AU-PAY-011",
    slug: "payg-withholding-calculator",
    displayName: "PAYG Withholding Calculator",
    calculationClass: "A",
    engines: ["E03"],
    title: "PAYG Withholding Calculator: ATO Schedule Formulas",
    description:
      "Calculate PAYG withholding per pay from the official ATO statement-of-formulas coefficients, including the study-loan component, never annual tax divided by periods.",
  }),
  payEntry({
    id: "AU-PAY-013",
    slug: "help-repayment-calculator",
    displayName: "HELP Repayment Calculator",
    engines: ["E02"],
    title: "HELP and Study Loan Repayment Calculator Australia",
    description:
      "Estimate your compulsory HELP or study-loan repayment from repayment income under the marginal repayment system, with thresholds from official sources.",
  }),
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
      // Rate-neutral by design: statutory numbers live only in rule packs.
      title: "GST Calculator Australia: Add, Remove or Split GST",
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
