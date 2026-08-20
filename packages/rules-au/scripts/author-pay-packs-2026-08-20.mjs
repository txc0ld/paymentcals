// One-shot authoring script for the Phase 1 pay rule packs (run 2026-08-20).
// Values transcribed from ATO pages fetched the same day; snapshots +
// sha256 hashes live in compliance-archive/sources/ato/. Packs are authored
// `in_review` — activation is a human action after verification.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "packs");
const scratch = process.argv[2];

const RETRIEVED = "2026-08-20T21:30:00+08:00";
const ARCHIVE = "compliance-archive/sources/ato";

function src(id, title, url, file, hash, notes) {
  return {
    sourceId: id,
    authority: "Australian Taxation Office",
    title,
    url,
    jurisdiction: "AU",
    domain: "tax",
    retrievedAt: RETRIEVED,
    archivedSnapshotRef: `${ARCHIVE}/${file}`,
    contentHash: hash,
    ...(notes ? { notes } : {}),
  };
}

const SOURCES = {
  residentRates: src(
    "ato-resident-rates-2026-08-20",
    "Tax rates - Australian residents",
    "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
    "resident-rates.2026-08-20.html",
    "43f19b929706165331a9956f14710e06fb680dce2b94d3983a601687b6507841",
  ),
  foreignRates: src(
    "ato-foreign-rates-2026-08-20",
    "Tax rates - foreign residents",
    "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-foreign-residents",
    "foreign-rates.2026-08-20.html",
    "ea6417039778a33a553d33ebb848af72170bd93def684269583cad50dec36367",
  ),
  whm: src(
    "ato-whm-schedule15-2026-08-20",
    "Schedule 15 - Tax table for working holiday makers",
    "https://www.ato.gov.au/tax-rates-and-codes/schedule-15-tax-table-for-working-holiday-makers",
    "whm.2026-08-20.html",
    "4384d2696d1ea7062f705219b192d5fbabeb359d272b8c8db0d872adfcfa3538",
  ),
  lito: src(
    "ato-lito-2026-08-20",
    "Low income tax offset",
    "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset",
    "lito.2026-08-20.html",
    "6b57242f38597c7b7504844148b1d64fd6313215cbb2aee2ae3b06e1c495c1bb",
    "Page states current values without a financial-year label; per-FY applicability requires human verification.",
  ),
  mls: src(
    "ato-mls-thresholds-2026-08-20",
    "Medicare levy surcharge income, thresholds and rates",
    "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates",
    "mls.2026-08-20.html",
    "7e5cad9e27fb81819d3f6b25239bc38c0299ce974789f1c917af5d7325d91264",
  ),
  medicareLow: src(
    "ato-medicare-low-income-2026-08-20",
    "Medicare levy reduction for low income earners",
    "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners",
    "medicare-low-income.2026-08-20.html",
    "4db74ea01f66a8bb652d45064f9a0675c6df31fe2649e04160c16755b91400aa",
    "Phase-in rate 0.10 corroborated by the page's own worked example ($29,000 taxable -> $98.90 levy).",
  ),
  medicareFamily: src(
    "ato-medicare-family-2026-08-20",
    "Medicare levy reduction - family income",
    "https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-family-income",
    "medicare-family.2026-08-20.html",
    "ae00038c6685b433979c1bad800ba51c304ce5c0aec0de8337c5273a8cc9c18e",
    "Page states 2025-26 values.",
  ),
  stsl: src(
    "ato-stsl-thresholds-2026-08-20",
    "Study and training support loans rates and repayment thresholds",
    "https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds",
    "stsl-thresholds.2026-08-20.html",
    "41e7225925f4ba8fb0595e56383cc0b321418eb8f177a1fe7d1a196baa0e7055",
  ),
  superGuarantee: src(
    "ato-super-guarantee-2026-08-20",
    "Super guarantee percentage and maximum contribution base",
    "https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee",
    "super-guarantee.2026-08-20.html",
    "7dc348829c88178f7e399edb18512375dda41e2b5dd2d4b3b408b2e39ec1f132",
  ),
  schedule1: src(
    "ato-schedule1-coefficients-2026-08-20",
    "Schedule 1 - Coefficients for withholding from weekly payments (from 1 July 2026)",
    "https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld/coefficients-to-use-in-formulas-for-withholding-from-weekly-payments",
    "schedule1-coefficients.2026-08-20.html",
    "64b736de0a42eba11d4e17491097c4418e43e723cd69ddae6eaea543514f40c6",
  ),
  schedule8: src(
    "ato-schedule8-2026-08-20",
    "Schedule 8 - Statement of formulas for calculating STSL components",
    "https://www.ato.gov.au/tax-rates-and-codes/schedule-8-statement-of-formulas-for-calculating-study-and-training-support-loans-components",
    "schedule8.2026-08-20.html",
    "377996d2f98bfe2e42b3f0b7eabfbf62e76eca70c74d2ff4d937bd8bd9d1018a",
  ),
};

function pack(id, domain, fy, sources, rules) {
  const [startYear] = fy.split("-");
  const endYear = Number(startYear) + 1;
  return {
    rulePackId: id,
    jurisdiction: "AU",
    subdivision: null,
    domain,
    effectiveFrom: `${startYear}-07-01`,
    effectiveTo: `${endYear}-06-30`,
    status: "in_review",
    schemaVersion: 1,
    rulesVersion: "0.1.0",
    sources,
    review: { preparedBy: "claude-build-agent", approvedBy: null, approvedAt: null },
    verifiedAt: null,
    rules,
  };
}

const bracket = (over, upTo, rate) => ({ over, upTo, rate });

const RESIDENT_16 = [
  bracket("0", "18200", "0"),
  bracket("18200", "45000", "0.16"),
  bracket("45000", "135000", "0.30"),
  bracket("135000", "190000", "0.37"),
  bracket("190000", null, "0.45"),
];
const RESIDENT_15 = [
  bracket("0", "18200", "0"),
  bracket("18200", "45000", "0.15"),
  bracket("45000", "135000", "0.30"),
  bracket("135000", "190000", "0.37"),
  bracket("190000", null, "0.45"),
];
const FOREIGN = [
  bracket("0", "135000", "0.30"),
  bracket("135000", "190000", "0.37"),
  bracket("190000", null, "0.45"),
];
const WHM_2627 = [
  bracket("0", "45000", "0.15"),
  bracket("45000", "135000", "0.30"),
  bracket("135000", "190000", "0.37"),
  bracket("190000", null, "0.45"),
];
const LITO = {
  maxOffset: "700",
  fullUpTo: "37500",
  taper1: { over: "37500", upTo: "45000", reductionPerDollar: "0.05" },
  taper2: { over: "45000", upTo: "66667", startingOffset: "325", reductionPerDollar: "0.015" },
};

const incomeTaxPacks = [
  pack("au-income-tax-2024-25", "income-tax", "2024-25", [SOURCES.residentRates, SOURCES.foreignRates, SOURCES.lito], {
    resident: RESIDENT_16,
    foreignResident: FOREIGN,
    workingHolidayMaker: null,
    lito: LITO,
  }),
  pack("au-income-tax-2025-26", "income-tax", "2025-26", [SOURCES.residentRates, SOURCES.foreignRates, SOURCES.lito], {
    resident: RESIDENT_16,
    foreignResident: FOREIGN,
    workingHolidayMaker: null,
    lito: LITO,
  }),
  pack("au-income-tax-2026-27", "income-tax", "2026-27", [SOURCES.residentRates, SOURCES.whm, SOURCES.lito], {
    resident: RESIDENT_15,
    foreignResident: null,
    workingHolidayMaker: WHM_2627,
    lito: LITO,
  }),
];

const MLS_TIERS = {
  "2024-25": [
    { singleOver: "0", singleUpTo: "97000", familyOver: "0", familyUpTo: "194000", rate: "0" },
    { singleOver: "97000", singleUpTo: "113000", familyOver: "194000", familyUpTo: "226000", rate: "0.01" },
    { singleOver: "113000", singleUpTo: "151000", familyOver: "226000", familyUpTo: "302000", rate: "0.0125" },
    { singleOver: "151000", singleUpTo: null, familyOver: "302000", familyUpTo: null, rate: "0.015" },
  ],
  "2025-26": [
    { singleOver: "0", singleUpTo: "101000", familyOver: "0", familyUpTo: "202000", rate: "0" },
    { singleOver: "101000", singleUpTo: "118000", familyOver: "202000", familyUpTo: "236000", rate: "0.01" },
    { singleOver: "118000", singleUpTo: "158000", familyOver: "236000", familyUpTo: "316000", rate: "0.0125" },
    { singleOver: "158000", singleUpTo: null, familyOver: "316000", familyUpTo: null, rate: "0.015" },
  ],
  "2026-27": [
    { singleOver: "0", singleUpTo: "105000", familyOver: "0", familyUpTo: "210000", rate: "0" },
    { singleOver: "105000", singleUpTo: "123000", familyOver: "210000", familyUpTo: "246000", rate: "0.01" },
    { singleOver: "123000", singleUpTo: "164000", familyOver: "246000", familyUpTo: "328000", rate: "0.0125" },
    { singleOver: "164000", singleUpTo: null, familyOver: "328000", familyUpTo: null, rate: "0.015" },
  ],
};

const medicarePacks = ["2024-25", "2025-26", "2026-27"].map((fy) =>
  pack(`au-medicare-${fy}`, "medicare", fy, [SOURCES.mls, SOURCES.medicareLow, SOURCES.medicareFamily, SOURCES.residentRates], {
    levyRate: "0.02",
    lowIncomeSingle:
      fy === "2025-26"
        ? { lower: "28011", upper: "35013", phaseInRate: "0.10", saptoLower: "44268", saptoUpper: "55335" }
        : null,
    lowIncomeFamily:
      fy === "2025-26"
        ? {
            lower: "47238",
            upper: "59047",
            saptoLower: "61623",
            saptoUpper: "77028",
            perDependentChildLowerIncrease: "4338",
            perDependentChildUpperIncrease: "5423",
          }
        : null,
    mls: { tiers: MLS_TIERS[fy], familyPerChildIncrease: "1500" },
  }),
);

const stslPacks = [
  pack("au-stsl-2024-25", "stsl", "2024-25", [SOURCES.stsl], {
    system: "whole_income_rate",
    threshold: "54434",
    rateTable: [
      { over: "54434", upTo: "62850", rateOfTotal: "0.01" },
      { over: "62850", upTo: "66620", rateOfTotal: "0.02" },
      { over: "66620", upTo: "70618", rateOfTotal: "0.025" },
      { over: "70618", upTo: "74855", rateOfTotal: "0.03" },
      { over: "74855", upTo: "79346", rateOfTotal: "0.035" },
      { over: "79346", upTo: "84107", rateOfTotal: "0.04" },
      { over: "84107", upTo: "89154", rateOfTotal: "0.045" },
      { over: "89154", upTo: "94503", rateOfTotal: "0.05" },
      { over: "94503", upTo: "100174", rateOfTotal: "0.055" },
      { over: "100174", upTo: "106185", rateOfTotal: "0.06" },
      { over: "106185", upTo: "112556", rateOfTotal: "0.065" },
      { over: "112556", upTo: "119309", rateOfTotal: "0.07" },
      { over: "119309", upTo: "126467", rateOfTotal: "0.075" },
      { over: "126467", upTo: "134056", rateOfTotal: "0.08" },
      { over: "134056", upTo: "142100", rateOfTotal: "0.085" },
      { over: "142100", upTo: "150626", rateOfTotal: "0.09" },
      { over: "150626", upTo: "159663", rateOfTotal: "0.095" },
      { over: "159663", upTo: null, rateOfTotal: "0.10" },
    ],
  }),
  pack("au-stsl-2025-26", "stsl", "2025-26", [SOURCES.stsl], {
    system: "marginal",
    threshold: "67000",
    bands: [
      { over: "67000", upTo: "125000", rate: "0.15", baseAmount: "0" },
      { over: "125000", upTo: "179285", rate: "0.17", baseAmount: "8700" },
    ],
    highIncome: { over: "179285", rateOfTotal: "0.10" },
  }),
  pack("au-stsl-2026-27", "stsl", "2026-27", [SOURCES.stsl], {
    system: "marginal",
    threshold: "69528",
    bands: [
      { over: "69528", upTo: "129717", rate: "0.15", baseAmount: "0" },
      { over: "129717", upTo: "186050", rate: "0.17", baseAmount: "9028" },
    ],
    highIncome: { over: "186050", rateOfTotal: "0.10" },
  }),
];

const sgPacks = [
  pack("au-super-guarantee-2024-25", "super-guarantee", "2024-25", [SOURCES.superGuarantee], {
    rate: "0.115",
    maxContributionBase: { basis: "quarterly", amount: "65070" },
  }),
  pack("au-super-guarantee-2025-26", "super-guarantee", "2025-26", [SOURCES.superGuarantee], {
    rate: "0.12",
    maxContributionBase: { basis: "quarterly", amount: "62500" },
  }),
  pack("au-super-guarantee-2026-27", "super-guarantee", "2026-27", [SOURCES.superGuarantee], {
    rate: "0.12",
    maxContributionBase: { basis: "annual", amount: "270830" },
  }),
];

// PAYG withholding pack from the machine-parsed schedule tables.
const s1 = JSON.parse(readFileSync(join(scratch, "schedule1-parsed.json"), "utf8"));
const s8 = JSON.parse(readFileSync(join(scratch, "schedule8-parsed.json"), "utf8"));
const normaliseRows = (rows) =>
  rows.map((r) => ({ ...(r.lessThan ? { lessThan: r.lessThan } : { andOver: r.andOver }), a: r.a, b: r.b }));

const paygPack = pack(
  "au-payg-withholding-2026-27",
  "payg-withholding",
  "2026-27",
  [SOURCES.schedule1, SOURCES.schedule8],
  {
    earningsInput: "floor_dollars_plus_99_cents",
    resultRounding: "nearest_dollar",
    periodConversion: {
      fortnightly: "halve_floor_add_99c",
      monthly: "cents_33_add_1c_times_3_div_13_floor_add_99c",
      quarterly: "div_13_floor_add_99c",
    },
    scales: {
      scale1NoTaxFreeThreshold: normaliseRows(s1.scale1_no_tft),
      scale2TaxFreeThreshold: normaliseRows(s1.scale2_tft),
      scale3ForeignResident: normaliseRows(s1.scale3_foreign),
      scale5FullMedicareExemption: normaliseRows(s1.scale5_full_medicare_exempt),
      scale6HalfMedicareExemption: normaliseRows(s1.scale6_half_medicare_exempt),
    },
    scale4NoTfn: { resident: "0.47", foreignResident: "0.45" },
    stslComponents: {
      taxFreeThresholdOrForeign: normaliseRows(s8.stsl_component_tft_or_foreign),
      noTaxFreeThreshold: normaliseRows(s8.stsl_component_no_tft),
    },
  },
);

const all = [...incomeTaxPacks, ...medicarePacks, ...stslPacks, ...sgPacks, paygPack];
for (const p of all) {
  writeFileSync(join(packsDir, `${p.rulePackId}.json`), JSON.stringify(p, null, 2) + "\n");
  console.log("wrote", p.rulePackId);
}
