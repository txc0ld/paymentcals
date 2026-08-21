import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { StampDutyRules } from "@paymentcalcs/rules-au";

/**
 * E08 — general transfer/stamp duty (§12.8), three published shapes:
 * per-$100 marginal brackets (with optional slab-on-total rows), percentage
 * brackets, and NT's statutory quadratic + slabs. Concessions, exemptions,
 * surcharges and first-home schemes are NOT modelled at P0 and the route
 * says so explicitly.
 */

export class DutyRulesUnavailableError extends Error {
  readonly code = "PC-RULE-0004";
}

export interface DutyComputation {
  duty: DecimalValue;
  method: "per100" | "percent" | "formula";
  /** Present for bracket methods. */
  bracketOver: string | null;
  bracketBase: DecimalValue | null;
  /** per100: the $ rate per $100. percent/formula slab: the percent used. */
  ratePer100: DecimalValue | null;
  percent: DecimalValue | null;
  hundredsCounted: DecimalValue | null;
  /** True when a slab row applied its rate to the whole value. */
  appliedToTotal: boolean;
  /** Present for the formula method when the quadratic branch applied. */
  formulaText: string | null;
  minimumApplied: boolean;
}

const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;

function applyMinimum(duty: DecimalValue, minimumDuty: string | null): { duty: DecimalValue; minimumApplied: boolean } {
  if (minimumDuty !== null && duty.lessThan(dec(minimumDuty))) {
    return { duty: dec(minimumDuty) as DecimalValue, minimumApplied: true };
  }
  return { duty, minimumApplied: false };
}

export function generalDuty(dutiableValue: DecimalValue, rules: StampDutyRules): DutyComputation {
  if (dutiableValue.lessThan(0)) throw new RangeError("Dutiable value cannot be negative.");

  if (rules.general) {
    const { brackets, minimumDuty } = rules.general;
    let selected = brackets[0]!;
    for (const bracket of brackets) {
      if (dutiableValue.greaterThan(dec(bracket.over))) selected = bracket;
    }
    const slab = selected.appliesTo === "total";
    // "$100 or part thereof": any partial hundred counts as a full hundred.
    const basis = slab ? dutiableValue : (Dec.max(d(0), dutiableValue.minus(dec(selected.over))) as DecimalValue);
    const hundreds = basis.div(100).toDecimalPlaces(0, Dec.ROUND_UP) as DecimalValue;
    const gross = (slab ? d(0) : dec(selected.baseAmount)).plus(
      hundreds.times(dec(selected.ratePer100)),
    ) as DecimalValue;
    const { duty, minimumApplied } = applyMinimum(gross, minimumDuty);
    return {
      duty: duty.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue,
      method: "per100",
      bracketOver: selected.over,
      bracketBase: dec(selected.baseAmount) as DecimalValue,
      ratePer100: dec(selected.ratePer100) as DecimalValue,
      percent: null,
      hundredsCounted: hundreds,
      appliedToTotal: slab,
      formulaText: null,
      minimumApplied,
    };
  }

  if (rules.generalPercent) {
    const { brackets, minimumDuty } = rules.generalPercent;
    let selected = brackets[0]!;
    for (const bracket of brackets) {
      if (dutiableValue.greaterThan(dec(bracket.over))) selected = bracket;
    }
    const slab = selected.appliesTo === "total";
    const basis = slab ? dutiableValue : (Dec.max(d(0), dutiableValue.minus(dec(selected.over))) as DecimalValue);
    const gross = (slab ? d(0) : dec(selected.baseAmount)).plus(
      basis.times(dec(selected.percent)),
    ) as DecimalValue;
    const { duty, minimumApplied } = applyMinimum(
      gross.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue,
      minimumDuty,
    );
    return {
      duty,
      method: "percent",
      bracketOver: selected.over,
      bracketBase: dec(selected.baseAmount) as DecimalValue,
      ratePer100: null,
      percent: dec(selected.percent) as DecimalValue,
      hundredsCounted: null,
      appliedToTotal: slab,
      formulaText: null,
      minimumApplied,
    };
  }

  if (rules.generalFormula) {
    const f = rules.generalFormula;
    let gross: DecimalValue;
    let percent: DecimalValue | null = null;
    let formulaText: string | null = null;
    if (dutiableValue.lessThanOrEqualTo(dec(f.upTo))) {
      const v = dutiableValue.div(dec(f.variableDivisor)) as DecimalValue;
      gross = dec(f.quadraticCoefficient).times(v).times(v).plus(dec(f.linearCoefficient).times(v)) as DecimalValue;
      formulaText = `D = ${f.quadraticCoefficient} × V² + ${f.linearCoefficient} × V, V = value ÷ ${Number(f.variableDivisor).toLocaleString("en-AU")}`;
    } else {
      let selected = f.slabs[0]!;
      for (const slab of f.slabs) {
        const bound = dec(slab.from);
        const inBand = slab.fromInclusive
          ? dutiableValue.greaterThanOrEqualTo(bound)
          : dutiableValue.greaterThan(bound);
        if (inBand) selected = slab;
      }
      percent = dec(selected.percentOfTotal) as DecimalValue;
      gross = dutiableValue.times(percent) as DecimalValue;
    }
    // Official calculator convention: floor to the nearest 5 cents.
    const floored = gross.times(20).toDecimalPlaces(0, Dec.ROUND_FLOOR).div(20) as DecimalValue;
    const { duty, minimumApplied } = applyMinimum(floored, f.minimumDuty);
    return {
      duty: duty.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue,
      method: "formula",
      bracketOver: null,
      bracketBase: null,
      ratePer100: null,
      percent,
      hundredsCounted: null,
      appliedToTotal: percent !== null,
      formulaText,
      minimumApplied,
    };
  }

  throw new DutyRulesUnavailableError("This jurisdiction's duty rates are not yet populated.");
}
