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
