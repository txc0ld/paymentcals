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
    title: "Compound Interest Calculator: Monthly and Yearly Growth",
    description:
      "Project how savings grow with compound interest and regular deposits. See the year-by-year breakdown, the exact formula used and every assumption you can edit.",
  }),
  simpleEntry({
    id: "GL-SAVE-003",
    slug: "savings-goal-calculator",
    displayName: "Savings Goal Calculator",
    category: "savings-investing",
    scope: "global",
    engines: ["E14", "E24"],
    title: "Savings Goal Calculator: How Much to Save Each Month",
    description:
      "Work out the deposit needed each week, fortnight or month to reach a savings target by your chosen date, verified by re-running the forward calculation.",
  }),
  simpleEntry({
    id: "AU-DEBT-001",
    slug: "loan-calculator",
    displayName: "Loan Calculator",
    category: "loans-debt",
    engines: ["E11"],
    title: "Loan Repayment Calculator Australia: Personal Loans",
    description:
      "Calculate personal loan repayments, total interest and payoff date, with a full amortisation schedule, optional monthly fees and the working behind every figure.",
  }),
  simpleEntry({
    id: "AU-DEBT-003",
    slug: "car-loan-calculator",
    displayName: "Car Loan Calculator",
    category: "loans-debt",
    engines: ["E11"],
    title: "Car Loan Calculator Australia: Repayments and Balloon",
    description:
      "Calculate car loan repayments with or without a balloon or residual payment. See total cost, total interest and the full schedule, period by period.",
  }),
  simpleEntry({
    id: "AU-DEBT-012",
    slug: "credit-card-payoff-calculator",
    displayName: "Credit Card Payoff Calculator",
    category: "loans-debt",
    engines: ["E12"],
    title: "Credit Card Payoff Calculator: Minimum vs Fixed Payments",
    description:
      "Compare how long a credit card takes to clear on minimum payments versus a fixed amount. Promotional-rate expiry is modelled and every cycle is shown.",
  }),
  simpleEntry({
    id: "AU-HOME-019",
    slug: "home-deposit-calculator",
    displayName: "Home Deposit Calculator",
    category: "property-mortgage",
    engines: ["E01"],
    title: "Home Deposit Calculator Australia: How Much You Need",
    description:
      "Work out the house deposit needed at your chosen loan-to-value ratio, plus the upfront costs you enter, with the savings gap and every step of the arithmetic.",
  }),
  simpleEntry({
    id: "AU-HOME-020",
    slug: "lvr-calculator",
    displayName: "LVR Calculator",
    category: "property-mortgage",
    engines: ["E01"],
    title: "LVR Calculator Australia: Loan to Value Ratio",
    description:
      "Calculate your loan-to-value ratio from a property value and loan amount, alongside the standard LVR bands Australian lenders reference. Full working shown.",
  }),
  simpleEntry({
    id: "AU-HOME-022",
    slug: "borrowing-affordability-estimate",
    displayName: "Affordability Estimate",
    category: "property-mortgage",
    calculationClass: "C",
    engines: ["E10"],
    disclosures: ["universal-footer-v2.0", "affordability-addendum-v2.0"],
    title: "Borrowing Power Calculator Australia: Affordability Range",
    description:
      "An indicative borrowing range from your income, expenses and commitments under generic assumptions with an editable rate buffer. Not an offer or pre-approval.",
  }),
  simpleEntry({
    id: "AU-HOME-017",
    slug: "stamp-duty-calculator",
    displayName: "Stamp Duty Calculator",
    category: "property-mortgage",
    calculationClass: "B",
    engines: ["E08"],
    rulePacks: ["stamp-duty"],
    title: "Stamp Duty Calculator Australia: NSW, VIC, QLD, All States",
    description:
      "Estimate general transfer duty on a property purchase from official state revenue-office rate tables. Unsupported states are clearly blocked, never guessed.",
  }),
  simpleEntry({
    id: "AU-HOME-018",
    slug: "property-buying-costs-calculator",
    displayName: "Property Buying Costs Calculator",
    category: "property-mortgage",
    calculationClass: "B",
    engines: ["E08"],
    rulePacks: ["stamp-duty"],
    title: "Property Purchase Costs Calculator Australia: Upfront Cash",
    description:
      "Add transfer duty to conveyancing, inspection, loan and registration costs for the total cash needed to buy. Duty comes from official state rate tables.",
  }),
  simpleEntry({
    id: "AU-BIZ-006",
    slug: "contractor-day-rate-calculator",
    displayName: "Contractor Day Rate Calculator",
    category: "business",
    calculationClass: "B",
    engines: ["E19", "E20"],
    rulePacks: ["gst"],
    title: "Contractor Day Rate Calculator Australia: Rate from Salary",
    description:
      "Convert a target income into a contractor day rate covering super replacement, leave, overheads and utilisation, with GST quoted separately and working shown.",
  }),
];

const entries: RegistryEntry[] = [
  ...breadthEntries,
  homeEntry({
    id: "AU-HOME-001",
    slug: "mortgage-repayment-calculator",
    displayName: "Mortgage Repayment Calculator",
    engines: ["E11"],
    title: "Mortgage Repayment Calculator Australia: Weekly or Monthly",
    description:
      "Calculate home loan repayments weekly, fortnightly or monthly, with a full amortisation schedule, total interest, payoff date and every assumption on show.",
  }),
  homeEntry({
    id: "AU-HOME-002",
    slug: "mortgage-simulator",
    displayName: "Mortgage Simulator",
    engines: ["E07"],
    title: "Mortgage Simulator: Rates, Offsets and Extra Repayments",
    description:
      "Run a mortgage through dated rate changes, extra repayments, offset balances and fees on a scheduled ledger that reconciles on every single period.",
  }),
  homeEntry({
    id: "AU-HOME-004",
    slug: "extra-repayments-calculator",
    displayName: "Extra Repayments Calculator",
    engines: ["E07"],
    title: "Extra Repayments Calculator: Pay Off Your Home Loan Sooner",
    description:
      "See the interest and years saved by regular or one-off extra mortgage repayments, computed on a dated schedule rather than a shortcut formula. Working shown.",
  }),
  homeEntry({
    id: "AU-HOME-006",
    slug: "offset-account-calculator",
    displayName: "Offset Account Calculator",
    engines: ["E07"],
    title: "Offset Account Calculator Australia: Interest and Time Saved",
    description:
      "Model an offset balance and regular deposits against your mortgage: interest saved, time saved and the cash that stays available, kept apart from principal.",
  }),
  homeEntry({
    id: "AU-HOME-007",
    slug: "rate-change-calculator",
    displayName: "Rate Change Calculator",
    engines: ["E07"],
    title: "Interest Rate Change Calculator: Mortgage Repayment Impact",
    description:
      "See how a rate rise or cut changes your mortgage repayment and total interest, under either a keep-repayment or recalculate-to-term policy. Working shown.",
  }),
  homeEntry({
    id: "AU-HOME-012",
    slug: "refinance-calculator",
    displayName: "Refinance Break-Even Calculator",
    engines: ["E07", "E11"],
    title: "Refinance Calculator Australia: Break-Even and Savings",
    description:
      "Compare your current home loan against a refinance offer on cumulative cash flows including switching costs, cashback timing and the residual balance.",
  }),
  payEntry({
    id: "AU-PAY-001",
    slug: "pay-calculator",
    displayName: "Pay Calculator",
    title: "Pay Calculator Australia: Take-Home Pay FY 2026-27",
    description:
      "Australian pay calculator showing income tax, Medicare levy, study-loan repayments, employer super and PAYG withholding separately, each with its working.",
  }),
  payEntry({
    id: "AU-PAY-002",
    slug: "take-home-pay-calculator",
    displayName: "Take-Home Pay Calculator",
    title: "Take-Home Pay Calculator Australia FY 2026-27",
    description:
      "Work out your take-home pay per week, fortnight or month after income tax, Medicare and study-loan repayments, from ATO-sourced rates with the working shown.",
  }),
  payEntry({
    id: "AU-PAY-003",
    slug: "gross-to-net-calculator",
    displayName: "Gross to Net Calculator",
    title: "Gross to Net Salary Calculator Australia FY 2026-27",
    description:
      "Convert a gross Australian salary into net pay at every pay frequency under the financial year you select, with each rate traced to its official source.",
  }),
  payEntry({
    id: "AU-PAY-004",
    slug: "net-to-gross-calculator",
    displayName: "Net to Gross Calculator",
    engines: ["E02", "E04", "E24"],
    title: "Net to Gross Salary Calculator Australia FY 2026-27",
    description:
      "Find the gross salary needed for a target take-home amount, solved against the full Australian tax rules and verified by re-running the forward calculation.",
  }),
  payEntry({
    id: "AU-PAY-005",
    slug: "salary-including-super-calculator",
    displayName: "Salary Including Super Calculator",
    title: "Salary Including Super Calculator: Package to Base Pay",
    description:
      "Split a total remuneration package into base salary and employer super, applying the maximum contribution base, then see the tax and take-home pay that follow.",
  }),
  payEntry({
    id: "AU-PAY-006",
    slug: "hourly-to-salary-calculator",
    displayName: "Hourly to Salary Calculator",
    title: "Hourly to Salary Calculator Australia: Annual and Take-Home",
    description:
      "Convert an hourly rate into annual salary and take-home pay from your hours per week and weeks paid per year, under current Australian tax rules. Working shown.",
  }),
  payEntry({
    id: "AU-PAY-007",
    slug: "salary-to-hourly-calculator",
    displayName: "Salary to Hourly Calculator",
    title: "Salary to Hourly Calculator Australia: Your Real Hourly Rate",
    description:
      "See the hourly rate an annual salary works out to for your working pattern, alongside income tax, super and take-home pay for the financial year you select.",
  }),
  payEntry({
    id: "AU-PAY-011",
    slug: "payg-withholding-calculator",
    displayName: "PAYG Withholding Calculator",
    calculationClass: "A",
    engines: ["E03"],
    title: "PAYG Withholding Calculator: Official ATO Schedule Formulas",
    description:
      "Calculate tax withheld each pay from the official ATO statement-of-formulas coefficients, including the study-loan component. Never annual tax split by periods.",
  }),
  payEntry({
    id: "AU-PAY-013",
    slug: "help-repayment-calculator",
    displayName: "HELP Repayment Calculator",
    engines: ["E02"],
    title: "HECS and HELP Repayment Calculator Australia FY 2026-27",
    description:
      "Estimate your compulsory HECS or HELP repayment from repayment income under the marginal repayment system, with every threshold from official ATO rule packs.",
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
      title: "Salary Sacrifice and Super Contributions Calculator 2026-27",
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
        "See what inflation has done to your salary since your last pay rise, from the official ABS consumer price index, and the salary that holds its buying power.",
    },
    ownership: { owner: "tmayorx@gmail.com", reviewCadence: "quarterly CPI release" },
  }),
  payEntry({
    id: "AU-PAY-014",
    slug: "income-tax-calculator",
    displayName: "Income Tax Calculator",
    engines: ["E02"],
    title: "Income Tax Calculator Australia: Brackets and Rates 2026-27",
    description:
      "Calculate Australian income tax by year and residency, and slide a salary along the marginal-rate curve to see the tax at every step, from official rule packs.",
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
        "Add GST to a price, remove GST from a total or split a GST-inclusive amount at the current Australian GST rate, with full working shown and sources cited.",
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
