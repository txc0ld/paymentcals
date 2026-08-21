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

const homeEntry = (partial: {
  id: string;
  slug: string;
  displayName: string;
  calculationClass?: "A" | "B";
  engines: string[];
  title: string;
  description: string;
}) =>
  zRegistryEntry.parse({
    id: partial.id,
    slug: partial.slug,
    displayName: partial.displayName,
    category: "property-mortgage",
    jurisdictionScope: "au",
    releasePriority: "P0",
    calculationClass: partial.calculationClass ?? "B",
    engineDependencies: partial.engines,
    rulePackDependencies: [],
    supportedModes: ["simple", "advanced", "compare"],
    inputSchemaVersion: "1",
    resultSchemaVersion: "1",
    disclosureSet: ["universal-footer-v2.0", "mortgage-model-v2.0"],
    sourceSet: [],
    seo: { title: partial.title, description: partial.description },
    ownership: { owner: "tmayorx@gmail.com", reviewCadence: "annual" },
  });

const simpleEntry = (partial: {
  id: string;
  slug: string;
  displayName: string;
  category: "savings-investing" | "loans-debt" | "property-mortgage" | "business";
  scope?: "au" | "global";
  calculationClass?: "A" | "B" | "C";
  engines: string[];
  rulePacks?: string[];
  disclosures?: string[];
  title: string;
  description: string;
}) =>
  zRegistryEntry.parse({
    id: partial.id,
    slug: partial.slug,
    displayName: partial.displayName,
    category: partial.category,
    jurisdictionScope: partial.scope ?? "au",
    releasePriority: "P0",
    calculationClass: partial.calculationClass ?? "A",
    engineDependencies: partial.engines,
    rulePackDependencies: partial.rulePacks ?? [],
    supportedModes: ["simple", "advanced"],
    inputSchemaVersion: "1",
    resultSchemaVersion: "1",
    disclosureSet: partial.disclosures ?? ["universal-footer-v2.0"],
    sourceSet: [],
    seo: { title: partial.title, description: partial.description },
    ownership: { owner: "tmayorx@gmail.com", reviewCadence: "annual" },
  });

const breadthEntries: RegistryEntry[] = [
  simpleEntry({
    id: "GL-SAVE-002",
    slug: "compound-interest-calculator",
    displayName: "Compound Interest Calculator",
    category: "savings-investing",
    scope: "global",
    engines: ["E14"],
    title: "Compound Interest Calculator with Yearly Breakdown",
    description:
      "See how savings grow with compound interest and regular deposits, with a year-by-year breakdown, exact formulas and every assumption editable.",
  }),
  simpleEntry({
    id: "GL-SAVE-003",
    slug: "savings-goal-calculator",
    displayName: "Savings Goal Calculator",
    category: "savings-investing",
    scope: "global",
    engines: ["E14", "E24"],
    title: "Savings Goal Calculator: Reach a Target Amount",
    description:
      "Work out the regular deposit needed to reach a savings target by a chosen date, verified by re-running the forward calculation.",
  }),
  simpleEntry({
    id: "AU-DEBT-001",
    slug: "loan-calculator",
    displayName: "Loan Calculator",
    category: "loans-debt",
    engines: ["E11"],
    title: "Personal Loan Repayment Calculator Australia",
    description:
      "Estimate loan repayments, total interest and payoff date for personal loans with a full amortisation schedule and optional monthly fees.",
  }),
  simpleEntry({
    id: "AU-DEBT-003",
    slug: "car-loan-calculator",
    displayName: "Car Loan Calculator",
    category: "loans-debt",
    engines: ["E11"],
    title: "Car Loan Repayment Calculator with Balloon Payment",
    description:
      "Estimate car loan repayments including balloon or residual payments, with total cost, interest and the schedule shown in full.",
  }),
  simpleEntry({
    id: "AU-DEBT-012",
    slug: "credit-card-payoff-calculator",
    displayName: "Credit Card Payoff Calculator",
    category: "loans-debt",
    engines: ["E12"],
    title: "Credit Card Payoff Calculator: Minimum vs Fixed Payments",
    description:
      "See how long a credit card takes to pay off on minimum payments versus a fixed amount, cycle by cycle, with promotional-rate expiry modelled.",
  }),
  simpleEntry({
    id: "AU-HOME-019",
    slug: "home-deposit-calculator",
    displayName: "Home Deposit Calculator",
    category: "property-mortgage",
    engines: ["E01"],
    title: "Home Deposit Calculator Australia",
    description:
      "Work out the deposit needed for a property price at your chosen loan-to-value ratio, alongside the upfront costs you enter.",
  }),
  simpleEntry({
    id: "AU-HOME-020",
    slug: "lvr-calculator",
    displayName: "LVR Calculator",
    category: "property-mortgage",
    engines: ["E01"],
    title: "LVR Calculator: Loan to Value Ratio",
    description:
      "Calculate your loan-to-value ratio from a property value and loan amount, with the standard LVR bands lenders commonly reference.",
  }),
  simpleEntry({
    id: "AU-HOME-022",
    slug: "borrowing-affordability-estimate",
    displayName: "Affordability Estimate",
    category: "property-mortgage",
    calculationClass: "C",
    engines: ["E10"],
    disclosures: ["universal-footer-v2.0", "affordability-addendum-v2.0"],
    title: "Home Loan Affordability Estimate Australia",
    description:
      "An indicative borrowing range from your income, expenses and commitments under generic assumptions with an editable rate buffer. Not pre-approval.",
  }),
  simpleEntry({
    id: "AU-HOME-017",
    slug: "stamp-duty-calculator",
    displayName: "Stamp Duty Calculator",
    category: "property-mortgage",
    calculationClass: "B",
    engines: ["E08"],
    rulePacks: ["stamp-duty"],
    title: "Stamp Duty Calculator Australia: All States",
    description:
      "Estimate general transfer duty by state from official revenue-office rate tables, with unsupported states clearly blocked rather than guessed.",
  }),
  simpleEntry({
    id: "AU-HOME-018",
    slug: "property-buying-costs-calculator",
    displayName: "Property Buying Costs Calculator",
    category: "property-mortgage",
    calculationClass: "B",
    engines: ["E08"],
    rulePacks: ["stamp-duty"],
    title: "Complete Property Buying Costs Calculator Australia",
    description:
      "Add general transfer duty to your conveyancing, inspection and other upfront costs for a complete picture of the cash needed to buy.",
  }),
  simpleEntry({
    id: "AU-BIZ-006",
    slug: "contractor-day-rate-calculator",
    displayName: "Contractor Day Rate Calculator",
    category: "business",
    calculationClass: "B",
    engines: ["E19", "E20"],
    rulePacks: ["gst"],
    title: "Contractor Day Rate Calculator Australia",
    description:
      "Convert a target income into a contractor day rate covering super replacement, leave, overheads and utilisation, with GST quoted separately.",
  }),
];

const entries: RegistryEntry[] = [
  ...breadthEntries,
  homeEntry({
    id: "AU-HOME-001",
    slug: "mortgage-repayment-calculator",
    displayName: "Mortgage Repayment Calculator",
    engines: ["E11"],
    title: "Mortgage Repayment Calculator Australia",
    description:
      "Estimate mortgage repayments with a full amortisation schedule, interest totals, payoff date and every assumption shown, at weekly, fortnightly or monthly frequency.",
  }),
  homeEntry({
    id: "AU-HOME-002",
    slug: "mortgage-simulator",
    displayName: "Mortgage Simulator",
    engines: ["E07"],
    title: "Mortgage Simulator: Rates, Offsets and Extra Repayments",
    description:
      "Simulate a mortgage through dated rate changes, extra repayments, offset balances and fees on a scheduled ledger, with reconciliation on every period.",
  }),
  homeEntry({
    id: "AU-HOME-004",
    slug: "extra-repayments-calculator",
    displayName: "Extra Repayments Calculator",
    engines: ["E07"],
    title: "Extra Mortgage Repayments Calculator Australia",
    description:
      "See the interest and years saved by regular or one-off extra mortgage repayments, computed on a dated schedule rather than a shortcut formula.",
  }),
  homeEntry({
    id: "AU-HOME-006",
    slug: "offset-account-calculator",
    displayName: "Offset Account Calculator",
    engines: ["E07"],
    title: "Offset Account Calculator Australia",
    description:
      "Model an offset balance and regular deposits against your mortgage: interest saved, time saved and the cash that stays available, kept distinct from principal.",
  }),
  homeEntry({
    id: "AU-HOME-007",
    slug: "rate-change-calculator",
    displayName: "Rate Change Calculator",
    engines: ["E07"],
    title: "Interest Rate Change Calculator: Mortgage Repayments",
    description:
      "See how a rate rise or cut changes your mortgage repayment and lifetime interest, under keep-repayment or recalculate-to-term policies.",
  }),
  homeEntry({
    id: "AU-HOME-012",
    slug: "refinance-calculator",
    displayName: "Refinance Break-Even Calculator",
    engines: ["E07", "E11"],
    title: "Refinance Break-Even Calculator Australia",
    description:
      "Compare your current loan with a refinance offer on cumulative cash flows including switching costs, cashback timing and residual balances, never repayments alone.",
  }),
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
    id: "AU-PAY-016",
    slug: "super-contributions-calculator",
    displayName: "Super Contributions Calculator",
    category: "pay-tax",
    jurisdictionScope: "au",
    releasePriority: "P0",
    calculationClass: "B",
    engineDependencies: ["E04"],
    rulePackDependencies: ["super-guarantee", "super-thresholds", "super-statistics"],
    supportedModes: ["simple", "advanced"],
    inputSchemaVersion: "1",
    resultSchemaVersion: "1",
    disclosureSet: ["universal-footer-v2.0"],
    sourceSet: ["ato-concessional-cap-2026-08-21"],
    seo: {
      title: "Super Contributions Calculator: SG, Caps and Balance Ranges",
      description:
        "Employer super on your salary, concessional cap headroom with salary sacrifice, the Division 293 threshold, and balance ranges across Australian age groups.",
    },
    ownership: { owner: "tmayorx@gmail.com", reviewCadence: "annual + pre-1-July watch" },
  }),
  zRegistryEntry.parse({
    id: "AU-PAY-015",
    slug: "inflation-calculator",
    displayName: "Inflation Calculator",
    category: "pay-tax",
    jurisdictionScope: "au",
    releasePriority: "P0",
    calculationClass: "B",
    engineDependencies: ["E04"],
    rulePackDependencies: ["cpi"],
    supportedModes: ["simple", "advanced"],
    inputSchemaVersion: "1",
    resultSchemaVersion: "1",
    disclosureSet: ["universal-footer-v2.0"],
    sourceSet: ["rba-g1-cpi-2026-08-21"],
    seo: {
      title: "Inflation Calculator Australia: Your Salary in Real Terms",
      description:
        "See what inflation has done to your salary since your last pay rise, using the official ABS consumer price index, and the salary needed to keep its purchasing power.",
    },
    ownership: { owner: "tmayorx@gmail.com", reviewCadence: "quarterly CPI release" },
  }),
  payEntry({
    id: "AU-PAY-014",
    slug: "income-tax-calculator",
    displayName: "Income Tax Calculator",
    engines: ["E02"],
    title: "Australian Income Tax Calculator and Bracket Explorer",
    description:
      "Explore Australian income tax brackets by year and residency, slide a salary along the marginal-rate curve and see the tax at every step, from official rule packs.",
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
