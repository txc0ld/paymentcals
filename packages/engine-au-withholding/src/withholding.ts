import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { CoefficientRow, PaygWithholdingRules } from "@paymentcalcs/rules-au";

/**
 * E03 — PAYG withholding per the ATO statement of formulas (Schedule 1) and
 * STSL components (Schedule 8). Never annual-tax ÷ periods (§13.16).
 *
 * Method (per the schedule):
 *   x = whole dollars of weekly-equivalent earnings + 0.99
 *   y = a·x − b for the row bounding the weekly earnings
 *   weekly amount = y rounded to the nearest dollar (50c rounds up)
 *   period amount = weekly ×2 (fortnight), ×13/3 (month), ×13 (quarter)
 */

export type WithholdingScaleId =
  | "scale1_no_tft"
  | "scale2_tft"
  | "scale3_foreign"
  | "scale5_full_medicare_exempt"
  | "scale6_half_medicare_exempt";

export type WithholdingCycle = "weekly" | "fortnightly" | "monthly" | "quarterly";

export class WithholdingRuleUnavailableError extends Error {
  readonly code = "PC-RULE-0004";
}

/** Weekly-equivalent x per the schedule's period-conversion rules. */
export function weeklyEquivalentX(periodEarnings: DecimalValue, cycle: WithholdingCycle): DecimalValue {
  const cents99 = new Dec("0.99");
  switch (cycle) {
    case "weekly":
      return periodEarnings.floor().plus(cents99) as DecimalValue;
    case "fortnightly":
      return periodEarnings.div(2).floor().plus(cents99) as DecimalValue;
    case "monthly": {
      const cents = periodEarnings.minus(periodEarnings.floor());
      const adjusted = cents.toFixed(2) === "0.33" ? periodEarnings.plus("0.01") : periodEarnings;
      return adjusted.times(3).div(13).floor().plus(cents99) as DecimalValue;
    }
    case "quarterly":
      return periodEarnings.div(13).floor().plus(cents99) as DecimalValue;
  }
}

function rowFor(rows: CoefficientRow[], weeklyX: DecimalValue): CoefficientRow {
  for (const row of rows) {
    if (row.lessThan !== undefined && weeklyX.lessThan(dec(row.lessThan))) return row;
  }
  const terminal = rows.find((row) => row.andOver !== undefined);
  if (terminal) return terminal;
  return rows[rows.length - 1]!;
}

/** Nearest-dollar rounding; an exact 50c rounds up (schedule note). */
function roundDollars(amount: DecimalValue): DecimalValue {
  return amount.toDecimalPlaces(0, Dec.ROUND_HALF_UP) as DecimalValue;
}

function periodMultiple(weeklyDollars: DecimalValue, cycle: WithholdingCycle): DecimalValue {
  switch (cycle) {
    case "weekly":
      return weeklyDollars;
    case "fortnightly":
      return weeklyDollars.times(2) as DecimalValue;
    case "monthly":
      return roundDollars(weeklyDollars.times(13).div(3) as DecimalValue);
    case "quarterly":
      return weeklyDollars.times(13) as DecimalValue;
  }
}

export interface WithholdingComputation {
  scale: WithholdingScaleId;
  weeklyX: string;
  weeklyOrdinary: DecimalValue;
  periodOrdinary: DecimalValue;
  weeklyStsl: DecimalValue;
  periodStsl: DecimalValue;
  periodTotal: DecimalValue;
}

export function computeWithholding(
  rules: PaygWithholdingRules,
  options: {
    periodEarnings: DecimalValue;
    cycle: WithholdingCycle;
    scale: WithholdingScaleId;
    stslEnabled: boolean;
  },
): WithholdingComputation {
  const scaleRows: Record<WithholdingScaleId, CoefficientRow[] | null> = {
    scale1_no_tft: rules.scales.scale1NoTaxFreeThreshold,
    scale2_tft: rules.scales.scale2TaxFreeThreshold,
    scale3_foreign: rules.scales.scale3ForeignResident,
    scale5_full_medicare_exempt: rules.scales.scale5FullMedicareExemption,
    scale6_half_medicare_exempt: rules.scales.scale6HalfMedicareExemption,
  };
  const rows = scaleRows[options.scale];
  if (!rows) throw new WithholdingRuleUnavailableError(`coefficients for ${options.scale} are not populated`);

  const x = weeklyEquivalentX(options.periodEarnings, options.cycle);
  const row = rowFor(rows, x);
  const rawWeekly = dec(row.a).times(x).minus(dec(row.b)) as DecimalValue;
  const weeklyOrdinary = roundDollars(
    (Dec.max(new Dec(0) as DecimalValue, rawWeekly) as DecimalValue),
  );
  const periodOrdinary = periodMultiple(weeklyOrdinary, options.cycle);

  let weeklyStsl = new Dec(0) as DecimalValue;
  if (options.stslEnabled) {
    // Schedule 8: the no-TFT component table applies only when the tax-free
    // threshold is not claimed (scale 1); all other supported scales use the
    // claimed/foreign table.
    const componentRows =
      options.scale === "scale1_no_tft"
        ? rules.stslComponents.noTaxFreeThreshold
        : rules.stslComponents.taxFreeThresholdOrForeign;
    if (!componentRows) {
      throw new WithholdingRuleUnavailableError("STSL component coefficients are not populated");
    }
    const componentRow = rowFor(componentRows, x);
    const rawStsl = dec(componentRow.a).times(x).minus(dec(componentRow.b)) as DecimalValue;
    weeklyStsl = roundDollars((Dec.max(new Dec(0) as DecimalValue, rawStsl) as DecimalValue));
  }
  const periodStsl = periodMultiple(weeklyStsl, options.cycle);

  return {
    scale: options.scale,
    weeklyX: x.toFixed(2),
    weeklyOrdinary,
    periodOrdinary,
    weeklyStsl,
    periodStsl,
    periodTotal: periodOrdinary.plus(periodStsl) as DecimalValue,
  };
}

export type MethodACycle = "weekly" | "fortnightly" | "monthly";

const PERIODS_PER_YEAR: Record<MethodACycle, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

export interface MethodAComputation {
  /** Step 2 — withholding on ordinary gross earnings alone. */
  periodOnEarnings: DecimalValue;
  /** Step 9 — withholding on the additional payment (capped, cents ignored). */
  periodOnAdditional: DecimalValue;
  /** Step 10 — total for the pay period. */
  periodTotal: DecimalValue;
  /** True when the 47% cap (step 8) was the lesser amount at step 9. */
  capApplied: boolean;
  /** Pay periods used to apportion the additional payment at step 3. */
  apportionPeriods: number;
  steps: { step3: string; step6: string; step7: string; step8: string };
}

/**
 * Schedule 5, Method A — withholding on back payments, commissions, bonuses
 * and similar payments. The ten published steps, verbatim: apportion the
 * additional payment across the year's pay periods, difference the regular
 * schedule at the marginal average, cap at the pack's rate (47%), negatives
 * are nil. Delegates every tax-table lookup to Schedule 1 (`computeWithholding`).
 */
export function computeMethodAWithholding(
  rules: PaygWithholdingRules,
  schedule5: { additionalPaymentCapRate: string; negativeResultsAreNil: boolean },
  options: {
    /** Gross earnings for the current pay period, excluding the additional payment. */
    periodEarnings: DecimalValue;
    additionalPayment: DecimalValue;
    cycle: MethodACycle;
    scale: WithholdingScaleId;
    stslEnabled: boolean;
    /**
     * Step 3 override: for a payment relating to a defined period of less than
     * 12 months, the number of pay periods it relates to. Defaults to the
     * periods in a financial year (52 / 26 / 12).
     */
    apportionPeriods?: number;
  },
): MethodAComputation {
  if (options.additionalPayment.lessThan(0)) throw new RangeError("Additional payment cannot be negative.");
  const zero = new Dec(0) as DecimalValue;
  const periods = options.apportionPeriods ?? PERIODS_PER_YEAR[options.cycle];
  if (!Number.isInteger(periods) || periods < 1) throw new RangeError("apportionPeriods must be a positive integer.");

  // Step 1: gross earnings excluding additional payments, cents ignored.
  const step1 = options.periodEarnings.floor() as DecimalValue;
  const lookup = (earnings: DecimalValue) =>
    computeWithholding(rules, {
      periodEarnings: earnings,
      cycle: options.cycle,
      scale: options.scale,
      stslEnabled: options.stslEnabled,
    }).periodTotal;
  // Step 2: withholding on step 1 from the relevant tax table.
  const step2 = lookup(step1);
  // Step 3: additional payment ÷ pay periods, cents ignored.
  const step3 = options.additionalPayment.div(periods).floor() as DecimalValue;
  // Steps 4–5: withholding at step 1 + step 3.
  const step5 = lookup(step1.plus(step3) as DecimalValue);
  // Steps 6–7: the difference, scaled back up.
  const step6 = step5.minus(step2) as DecimalValue;
  const step7 = step6.times(periods) as DecimalValue;
  // Step 8: cap at the pack's rate on the additional payment itself.
  const step8 = options.additionalPayment.times(dec(schedule5.additionalPaymentCapRate)) as DecimalValue;
  // Step 9: the lesser of steps 7 and 8, cents ignored; negatives are nil.
  let step9 = (Dec.min(step7, step8) as DecimalValue).floor() as DecimalValue;
  if (schedule5.negativeResultsAreNil && step9.lessThan(0)) step9 = zero;
  const capApplied = step8.lessThan(step7);

  return {
    periodOnEarnings: step2,
    periodOnAdditional: step9,
    periodTotal: step2.plus(step9) as DecimalValue,
    capApplied,
    apportionPeriods: periods,
    steps: { step3: step3.toFixed(0), step6: step6.toFixed(2), step7: step7.toFixed(2), step8: step8.toFixed(2) },
  };
}

/** Route residency + declarations to the applicable schedule scale. */
export function selectScale(taxpayer: {
  residency: "resident" | "foreign_resident" | "working_holiday_maker";
  claimsTaxFreeThreshold: boolean;
  medicareStatus: "standard" | "half_exemption" | "full_exemption";
}): WithholdingScaleId | { unsupported: string } {
  if (taxpayer.residency === "working_holiday_maker") {
    return {
      unsupported:
        "Working holiday maker withholding follows Schedule 15 and depends on employer registration; it is not yet supported.",
    };
  }
  if (taxpayer.residency === "foreign_resident") return "scale3_foreign";
  if (taxpayer.medicareStatus === "full_exemption") return "scale5_full_medicare_exempt";
  if (taxpayer.medicareStatus === "half_exemption") return "scale6_half_medicare_exempt";
  return taxpayer.claimsTaxFreeThreshold ? "scale2_tft" : "scale1_no_tft";
}
