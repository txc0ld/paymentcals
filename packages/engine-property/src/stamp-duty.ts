import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { StampDutyRules } from "@paymentcalcs/rules-au";

/**
 * E08 — general transfer/stamp duty (§12.8). Duty = bracket base + rate per
 * $100 (or part thereof) of the value above the bracket bound. Concessions,
 * exemptions, surcharges and first-home schemes are NOT modelled at P0 and
 * the route says so explicitly.
 */

export class DutyRulesUnavailableError extends Error {
  readonly code = "PC-RULE-0004";
}

export interface DutyComputation {
  duty: DecimalValue;
  bracketOver: string;
  bracketBase: DecimalValue;
  ratePer100: DecimalValue;
  hundredsCounted: DecimalValue;
  minimumApplied: boolean;
}

const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;

export function generalDuty(dutiableValue: DecimalValue, rules: StampDutyRules): DutyComputation {
  if (!rules.general) {
    throw new DutyRulesUnavailableError("This jurisdiction's duty rates are not yet populated.");
  }
  if (dutiableValue.lessThan(0)) {
    throw new RangeError("Dutiable value cannot be negative.");
  }
  const { brackets, minimumDuty } = rules.general;
  let selected = brackets[0]!;
  for (const bracket of brackets) {
    if (dutiableValue.greaterThan(dec(bracket.over))) selected = bracket;
  }
  const excess = (Dec.max(d(0), dutiableValue.minus(dec(selected.over))) as DecimalValue);
  // "$100 or part thereof": any partial hundred counts as a full hundred.
  const hundreds = excess.div(100).toDecimalPlaces(0, Dec.ROUND_UP) as DecimalValue;
  let duty = dec(selected.baseAmount).plus(hundreds.times(dec(selected.ratePer100))) as DecimalValue;
  let minimumApplied = false;
  if (minimumDuty !== null && duty.lessThan(dec(minimumDuty))) {
    duty = dec(minimumDuty) as DecimalValue;
    minimumApplied = true;
  }
  return {
    duty: duty.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue,
    bracketOver: selected.over,
    bracketBase: dec(selected.baseAmount) as DecimalValue,
    ratePer100: dec(selected.ratePer100) as DecimalValue,
    hundredsCounted: hundreds,
    minimumApplied,
  };
}
