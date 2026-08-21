import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { DutyConcessionRules, StampDutyRules } from "@paymentcalcs/rules-au";
import { generalDuty } from "./stamp-duty";

/**
 * Published owner-occupier / first-home duty concessions, computed exactly
 * as each authority publishes them. Eligibility is always the buyer's own
 * assessment — this engine only prices the published scheme.
 */

export type ConcessionScheme =
  | "nsw_fhbas_home"
  | "nsw_fhbas_vacant_land"
  | "qld_home"
  | "qld_first_home"
  | "vic_ppr"
  | "act_owner_occupier";

export interface ConcessionComputation {
  duty: DecimalValue;
  scheme: ConcessionScheme;
  /** True when the scheme did not apply at this value and the general rate was charged. */
  fellBackToGeneral: boolean;
  /** Duty at the general rate for the same value, for the saving line. */
  generalDuty: DecimalValue;
  saving: DecimalValue;
  note: string | null;
}

export class ConcessionUnavailableError extends Error {}

const d = (v: string | number): DecimalValue => new Dec(v) as DecimalValue;

function per100Brackets(
  value: DecimalValue,
  brackets: NonNullable<StampDutyRules["general"]>["brackets"],
): DecimalValue {
  let selected = brackets[0]!;
  for (const bracket of brackets) if (value.greaterThan(dec(bracket.over))) selected = bracket;
  const slab = selected.appliesTo === "total";
  const basis = slab ? value : (Dec.max(d(0), value.minus(dec(selected.over))) as DecimalValue);
  const hundreds = basis.div(100).toDecimalPlaces(0, Dec.ROUND_UP);
  return (slab ? d(0) : dec(selected.baseAmount)).plus(hundreds.times(dec(selected.ratePer100))) as DecimalValue;
}

export function concessionalDuty(
  dutiableValue: DecimalValue,
  general: StampDutyRules,
  concessions: DutyConcessionRules,
  scheme: ConcessionScheme,
): ConcessionComputation {
  if (dutiableValue.lessThan(0)) throw new RangeError("Dutiable value cannot be negative.");
  const generalResult = generalDuty(dutiableValue, general).duty;
  const finish = (duty: DecimalValue, fellBack: boolean, note: string | null): ConcessionComputation => {
    const rounded = duty.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue;
    return {
      duty: rounded,
      scheme,
      fellBackToGeneral: fellBack,
      generalDuty: generalResult,
      saving: Dec.max(d(0), generalResult.minus(rounded)) as DecimalValue,
      note,
    };
  };

  if (scheme === "nsw_fhbas_home" || scheme === "nsw_fhbas_vacant_land") {
    const fhbas = concessions.nswFhbas;
    if (!fhbas) throw new ConcessionUnavailableError("NSW FHBAS rules are not populated.");
    const s = scheme === "nsw_fhbas_home" ? fhbas.homes : fhbas.vacantLand;
    if (dutiableValue.lessThanOrEqualTo(dec(s.exemptUpTo))) {
      return finish(d(0), false, "Fully exempt under the First Home Buyers Assistance Scheme.");
    }
    if (dutiableValue.greaterThanOrEqualTo(dec(s.capValue))) {
      return finish(generalResult, true, "Above the scheme cap; the general rate applies.");
    }
    // s78A: N − ((cap − V) ÷ divisor × D), D = general duty at the exemption cap.
    const dAtExempt = per100Brackets(dec(s.exemptUpTo) as DecimalValue, general.general!.brackets);
    const slide = dec(s.capValue).minus(dutiableValue).div(dec(s.divisor)).times(dAtExempt);
    return finish(Dec.max(d(0), generalResult.minus(slide)) as DecimalValue, false, "Concessional rate under Duties Act 1997 s78A.");
  }

  if (scheme === "qld_home" || scheme === "qld_first_home") {
    const qld = concessions.qldHome;
    if (!qld) throw new ConcessionUnavailableError("QLD home concession rules are not populated.");
    const homeDuty = per100Brackets(dutiableValue, qld.brackets);
    if (scheme === "qld_home") {
      return finish(homeDuty, false, "Home (owner-occupier) concession rate.");
    }
    if (dutiableValue.greaterThanOrEqualTo(dec(qld.firstHome.capValue))) {
      return finish(homeDuty, false, "Value at or above the first-home cap; only the home concession applies.");
    }
    let deduction = d(0);
    for (const band of qld.firstHome.bands) {
      const inBand =
        dutiableValue.greaterThanOrEqualTo(dec(band.over)) &&
        (band.upToExclusive === null || dutiableValue.lessThan(dec(band.upToExclusive)));
      if (inBand) deduction = dec(band.deduction) as DecimalValue;
    }
    return finish(Dec.max(d(0), homeDuty.minus(deduction)) as DecimalValue, false, "First home concession: home rate minus the concession amount.");
  }

  if (scheme === "vic_ppr") {
    const ppr = concessions.vicPpr;
    if (!ppr) throw new ConcessionUnavailableError("VIC PPR rules are not populated.");
    if (dutiableValue.greaterThan(dec(ppr.appliesUpTo))) {
      return finish(generalResult, true, "Above $550,000 the PPR concessional rate does not apply; the general rate is charged.");
    }
    let selected = ppr.brackets[0]!;
    for (const bracket of ppr.brackets) if (dutiableValue.greaterThan(dec(bracket.over))) selected = bracket;
    const basis =
      selected.appliesTo === "total" ? dutiableValue : (Dec.max(d(0), dutiableValue.minus(dec(selected.over))) as DecimalValue);
    const duty = dec(selected.baseAmount).plus(basis.times(dec(selected.percent))) as DecimalValue;
    return finish(duty, false, "Principal place of residence concessional rate.");
  }

  // act_owner_occupier
  const act = concessions.actOwnerOccupier;
  if (!act) throw new ConcessionUnavailableError("ACT owner-occupier rules are not populated.");
  return finish(per100Brackets(dutiableValue, act.brackets), false, "Eligible owner-occupier rate (Table 1).");
}
