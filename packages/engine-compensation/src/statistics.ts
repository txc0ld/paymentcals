import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type {
  IncomePercentileRow,
  IncomePercentilesRules,
  SuperBalanceCell,
  SuperStatisticsRules,
  SuperThresholdsRules,
  SuperGuaranteeRules,
} from "@paymentcalcs/rules-au";

/**
 * Pure lookups over the descriptive ATO statistics packs, plus the super
 * contribution summary. Comparison displays only — never a liability input.
 */

/** The percentile whose range contains the taxable income. Incomes above the
 * top range land in percentile 100; the pack guarantees 100 ascending rows. */
export function incomePercentileFor(
  rules: IncomePercentilesRules,
  taxableIncomeMajor: string,
): IncomePercentileRow {
  const income = new Dec(taxableIncomeMajor);
  if (!income.isFinite() || income.lessThan(0)) throw new RangeError("Income must be a non-negative amount.");
  for (const row of rules.percentiles) {
    if (row.upper !== null && income.lessThanOrEqualTo(new Dec(row.upper))) return row;
  }
  return rules.percentiles[rules.percentiles.length - 1]!;
}

export interface GenderMix {
  malePercent: string;
  femalePercent: string;
}

export function genderMix(row: IncomePercentileRow): GenderMix {
  const males = new Dec(row.males);
  const females = new Dec(row.females);
  const total = males.plus(females);
  if (total.lessThanOrEqualTo(0)) return { malePercent: "0", femalePercent: "0" };
  return {
    malePercent: males.div(total).times(100).toFixed(0),
    femalePercent: females.div(total).times(100).toFixed(0),
  };
}

/** The (age, sex, income-range) cell, exactly as published — no aggregation. */
export function superBalanceCell(
  rules: SuperStatisticsRules,
  ageRange: string,
  sex: "Male" | "Female",
  taxableIncomeRange: string,
): SuperBalanceCell | null {
  return (
    rules.cells.find(
      (cell) => cell.ageRange === ageRange && cell.sex === sex && cell.taxableIncomeRange === taxableIncomeRange,
    ) ?? null
  );
}

/** All cells for a (sex, income-range) slice, ordered by the source's own
 * age-range label prefixes (a., b., c. …) for charting across ages. */
export function superBalanceSlice(
  rules: SuperStatisticsRules,
  sex: "Male" | "Female",
  taxableIncomeRange: string,
): SuperBalanceCell[] {
  return rules.cells
    .filter((cell) => cell.sex === sex && cell.taxableIncomeRange === taxableIncomeRange)
    .sort((a, b) => a.ageRange.localeCompare(b.ageRange));
}

export interface SuperContributionSummary {
  /** Employer SG on the (capped) base, per the SG pack rate. */
  sgAmount: string;
  sgRate: string;
  /** SG + salary sacrifice: the concessional contributions being made. */
  concessionalTotal: string;
  concessionalCap: string;
  capRemaining: string;
  overCapBy: string;
  /** income + concessional vs the Division 293 threshold. */
  division293Threshold: string;
  division293Excess: string;
}

export class SuperThresholdUnavailableError extends Error {}

export function superContributionSummary(
  sg: SuperGuaranteeRules,
  thresholds: SuperThresholdsRules,
  financialYear: string,
  baseSalaryMajor: string,
  salarySacrificeMajor: string,
): SuperContributionSummary {
  const capRow = thresholds.concessionalCaps.find((row) => row.financialYear === financialYear);
  if (!capRow) {
    throw new SuperThresholdUnavailableError(
      `No concessional cap is published in the pack for FY ${financialYear}.`,
    );
  }
  const salary = new Dec(baseSalaryMajor);
  const sacrifice = new Dec(salarySacrificeMajor || "0");
  if (!salary.isFinite() || salary.lessThan(0) || !sacrifice.isFinite() || sacrifice.lessThan(0)) {
    throw new RangeError("Amounts must be non-negative.");
  }
  if (sg.rate === null) {
    throw new SuperThresholdUnavailableError("The super guarantee rate is not populated in the resolved pack.");
  }
  const rate = new Dec(sg.rate);
  /* Maximum contribution base: quarterly in most packs, annual for the
   * Payday-Super era pack — normalise to an annual earnings cap. */
  const annualBaseCap =
    sg.maxContributionBase === null
      ? null
      : new Dec(sg.maxContributionBase.amount).times(sg.maxContributionBase.basis === "quarterly" ? 4 : 1);
  const cappedSalary = annualBaseCap === null ? salary : (Dec.min(salary, annualBaseCap) as DecimalValue);
  const sgAmount = cappedSalary.times(rate);
  const concessional = sgAmount.plus(sacrifice);
  const cap = new Dec(capRow.cap);
  const money = (v: DecimalValue) => v.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2);
  const div293 = new Dec(thresholds.division293Threshold);
  const combined = salary.plus(concessional);
  return {
    sgAmount: money(sgAmount as DecimalValue),
    sgRate: sg.rate,
    concessionalTotal: money(concessional as DecimalValue),
    concessionalCap: capRow.cap,
    capRemaining: money(Dec.max(new Dec(0), cap.minus(concessional)) as DecimalValue),
    overCapBy: money(Dec.max(new Dec(0), concessional.minus(cap)) as DecimalValue),
    division293Threshold: thresholds.division293Threshold,
    division293Excess: money(Dec.max(new Dec(0), combined.minus(div293)) as DecimalValue),
  };
}
