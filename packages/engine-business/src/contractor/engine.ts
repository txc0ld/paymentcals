import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";

/**
 * E19 — contractor day-rate economics (§12.16). Pure arithmetic on
 * user-entered capacity and cost assumptions; GST comes from the resolved
 * rule pack and is never treated as contractor revenue.
 */

export interface ContractorInput {
  targetIncome: string;
  superReplacementRate: string;
  annualLeaveDays: number;
  personalLeaveDays: number;
  publicHolidays: number;
  nonBillableDays: number;
  utilisation: string; // 0..1 of remaining capacity
  hoursPerBillableDay: string;
  overheadsAnnual: string;
  profitMargin: string; // desired margin on top of break-even, 0..1
  /** Standard GST rate from the resolved rule pack; null = not registered. */
  gstRate: string | null;
}

export interface ContractorResult {
  weekdays: number;
  capacityDays: number;
  billableDays: DecimalValue;
  superReplacement: DecimalValue;
  breakEvenRevenue: DecimalValue;
  targetRevenue: DecimalValue;
  breakEvenDayRate: DecimalValue;
  targetDayRate: DecimalValue;
  targetHourlyRate: DecimalValue;
  gstOnDayRate: DecimalValue | null;
  dayRateIncludingGst: DecimalValue | null;
  warnings: string[];
}

const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;
const cents = (v: DecimalValue): DecimalValue => v.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue;

/** 52 weeks × 5 weekdays. Editable-default capacity assumptions (§12.16). */
export const WEEKDAYS_PER_YEAR = 260;

export function contractorRates(input: ContractorInput): ContractorResult {
  const warnings: string[] = [];
  const capacityDays =
    WEEKDAYS_PER_YEAR -
    input.publicHolidays -
    input.annualLeaveDays -
    input.personalLeaveDays -
    input.nonBillableDays;
  if (capacityDays <= 0) {
    warnings.push("Leave, holidays and non-billable days exceed available weekdays.");
  }
  const utilisation = d(input.utilisation);
  if (utilisation.greaterThan(1)) {
    warnings.push("Utilisation cannot exceed available capacity; it was capped at 100%.");
  }
  const effectiveUtilisation = (Dec.min(utilisation, d(1)) as DecimalValue);
  const billableDays = (Dec.max(d(0), d(capacityDays).times(effectiveUtilisation)) as DecimalValue);

  const superReplacement = d(input.targetIncome).times(d(input.superReplacementRate)) as DecimalValue;
  const breakEvenRevenue = d(input.targetIncome)
    .plus(superReplacement)
    .plus(d(input.overheadsAnnual)) as DecimalValue;
  const targetRevenue = breakEvenRevenue.times(new Dec(1).plus(d(input.profitMargin))) as DecimalValue;

  const safeDays = billableDays.isZero() ? d(1) : billableDays;
  const breakEvenDayRate = breakEvenRevenue.div(safeDays) as DecimalValue;
  const targetDayRate = targetRevenue.div(safeDays) as DecimalValue;
  const hours = d(input.hoursPerBillableDay);
  const targetHourlyRate = hours.isZero() ? d(0) : (targetDayRate.div(hours) as DecimalValue);

  const gstOnDayRate = input.gstRate === null ? null : cents(targetDayRate.times(d(input.gstRate)) as DecimalValue);
  const dayRateIncludingGst =
    gstOnDayRate === null ? null : cents(targetDayRate.plus(gstOnDayRate) as DecimalValue);

  if (billableDays.isZero()) {
    warnings.push("No billable capacity remains under these assumptions.");
  }

  return {
    weekdays: WEEKDAYS_PER_YEAR,
    capacityDays,
    billableDays,
    superReplacement: cents(superReplacement),
    breakEvenRevenue: cents(breakEvenRevenue),
    targetRevenue: cents(targetRevenue),
    breakEvenDayRate: cents(breakEvenDayRate),
    targetDayRate: cents(targetDayRate),
    targetHourlyRate: cents(targetHourlyRate),
    gstOnDayRate,
    dayRateIncludingGst,
    warnings,
  };
}
