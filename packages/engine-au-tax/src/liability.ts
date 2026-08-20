import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type {
  IncomeTaxRules,
  MedicareRules,
  StslRules,
  TaxBracket,
} from "@paymentcalcs/rules-au";

/**
 * E02 annual-liability primitives. Everything here is pure decimal arithmetic
 * on rule-pack data; dollars are Decimal values, never floats. Component-level
 * separation per §13.13 — offsets, levies, surcharges and study loans are
 * never folded into brackets.
 */

export class RuleValueUnavailableError extends Error {
  readonly code = "PC-RULE-0004";
  constructor(what: string) {
    super(`Required rule value is not populated: ${what}`);
  }
}

/** §13.13 piecewise progressive tax. Formula F-TAX-001. */
export function progressiveTax(taxableIncome: DecimalValue, brackets: TaxBracket[]): DecimalValue {
  let tax = new Dec(0) as DecimalValue;
  for (const bracket of brackets) {
    const over = dec(bracket.over);
    const upTo = bracket.upTo === null ? null : dec(bracket.upTo);
    const slice = (upTo === null ? taxableIncome : (Dec.min(taxableIncome, upTo) as DecimalValue))
      .minus(over) as DecimalValue;
    if (slice.greaterThan(0)) {
      tax = tax.plus(slice.times(dec(bracket.rate))) as DecimalValue;
    }
  }
  return tax;
}

export function marginalBracketRate(taxableIncome: DecimalValue, brackets: TaxBracket[]): string {
  let rate = "0";
  for (const bracket of brackets) {
    if (taxableIncome.greaterThan(dec(bracket.over))) rate = bracket.rate;
  }
  return rate;
}

/** LITO per the rule pack (non-refundable; capped by the caller). F-TAX-002. */
export function litoAmount(taxableIncome: DecimalValue, rules: IncomeTaxRules): DecimalValue {
  const zero = new Dec(0) as DecimalValue;
  if (!rules.lito) return zero;
  const { maxOffset, fullUpTo, taper1, taper2 } = rules.lito;
  if (taxableIncome.lessThanOrEqualTo(dec(fullUpTo))) return dec(maxOffset) as DecimalValue;
  if (taxableIncome.lessThanOrEqualTo(dec(taper1.upTo))) {
    const reduced = dec(maxOffset).minus(
      taxableIncome.minus(dec(taper1.over)).times(dec(taper1.reductionPerDollar)),
    ) as DecimalValue;
    return (Dec.max(zero, reduced) as DecimalValue);
  }
  if (taxableIncome.lessThanOrEqualTo(dec(taper2.upTo))) {
    const reduced = dec(taper2.startingOffset).minus(
      taxableIncome.minus(dec(taper2.over)).times(dec(taper2.reductionPerDollar)),
    ) as DecimalValue;
    return (Dec.max(zero, reduced) as DecimalValue);
  }
  return zero;
}

export interface MedicareContext {
  status: "standard" | "half_exemption" | "full_exemption";
  familyStatus: "single" | "family";
  dependants: number;
  spouseIncome: DecimalValue;
}

export interface MedicareResult {
  levy: DecimalValue;
  /** True when the family reduction path was used (approximation — warned). */
  usedFamilyReduction: boolean;
}

/** Medicare levy with low-income reduction (F-TAX-003). */
export function medicareLevy(
  taxableIncome: DecimalValue,
  rules: MedicareRules,
  context: MedicareContext,
): MedicareResult {
  const zero = new Dec(0) as DecimalValue;
  if (context.status === "full_exemption") return { levy: zero, usedFamilyReduction: false };
  if (rules.levyRate === null) throw new RuleValueUnavailableError("medicare levyRate");
  let levy = taxableIncome.times(dec(rules.levyRate)) as DecimalValue;

  if (context.familyStatus === "single" && rules.lowIncomeSingle) {
    const { lower, upper, phaseInRate } = rules.lowIncomeSingle;
    if (taxableIncome.lessThanOrEqualTo(dec(lower))) {
      levy = zero;
    } else if (taxableIncome.lessThanOrEqualTo(dec(upper))) {
      levy = taxableIncome.minus(dec(lower)).times(dec(phaseInRate)) as DecimalValue;
    }
  }

  let usedFamilyReduction = false;
  if (context.familyStatus === "family" && rules.lowIncomeFamily) {
    const familyIncome = taxableIncome.plus(context.spouseIncome) as DecimalValue;
    const childIncrease = new Dec(rules.lowIncomeFamily.perDependentChildLowerIncrease).times(
      Math.max(0, context.dependants),
    );
    const upperIncrease = new Dec(rules.lowIncomeFamily.perDependentChildUpperIncrease).times(
      Math.max(0, context.dependants),
    );
    const lower = dec(rules.lowIncomeFamily.lower).plus(childIncrease) as DecimalValue;
    const upper = dec(rules.lowIncomeFamily.upper).plus(upperIncrease) as DecimalValue;
    if (familyIncome.lessThanOrEqualTo(lower)) {
      levy = zero;
      usedFamilyReduction = true;
    } else if (familyIncome.lessThanOrEqualTo(upper)) {
      // Estimate: the statutory family reduction apportions between spouses;
      // this applies the 10%-of-excess shape capped at the standard levy and
      // is surfaced as a warning + limitation on the result.
      const phased = familyIncome.minus(lower).times("0.10") as DecimalValue;
      levy = (Dec.min(levy, phased) as DecimalValue);
      usedFamilyReduction = true;
    }
  }

  if (context.status === "half_exemption") {
    levy = levy.div(2) as DecimalValue;
  }
  return { levy, usedFamilyReduction };
}

export interface MlsContext {
  hasPrivateHospitalCover: boolean;
  familyStatus: "single" | "family";
  dependants: number;
  spouseIncome: DecimalValue;
  reportableFringeBenefits: DecimalValue;
}

/** Medicare levy surcharge (F-TAX-004). MLS income = taxable + RFB (per ATO example). */
export function medicareLevySurcharge(
  taxableIncome: DecimalValue,
  rules: MedicareRules,
  context: MlsContext,
): DecimalValue {
  const zero = new Dec(0) as DecimalValue;
  if (context.hasPrivateHospitalCover || !rules.mls) return zero;
  const mlsIncome = taxableIncome.plus(context.reportableFringeBenefits) as DecimalValue;
  const testIncome =
    context.familyStatus === "family"
      ? (mlsIncome.plus(context.spouseIncome) as DecimalValue)
      : mlsIncome;
  const extraChildren = Math.max(0, context.dependants - 1);
  const childIncrease = new Dec(rules.mls.familyPerChildIncrease).times(extraChildren);

  let rate = new Dec(0) as DecimalValue;
  for (const tier of rules.mls.tiers) {
    const over =
      context.familyStatus === "family"
        ? (dec(tier.familyOver).plus(childIncrease) as DecimalValue)
        : (dec(tier.singleOver) as DecimalValue);
    if (testIncome.greaterThan(over)) rate = dec(tier.rate) as DecimalValue;
  }
  return mlsIncome.times(rate) as DecimalValue;
}

/** STSL compulsory repayment (F-TAX-005), marginal or whole-income systems. */
export function stslRepayment(repaymentIncome: DecimalValue, rules: StslRules): DecimalValue {
  const zero = new Dec(0) as DecimalValue;
  if (repaymentIncome.lessThanOrEqualTo(dec(rules.threshold))) return zero;

  if (rules.system === "whole_income_rate") {
    let rate = new Dec(0) as DecimalValue;
    for (const band of rules.rateTable) {
      if (repaymentIncome.greaterThan(dec(band.over))) rate = dec(band.rateOfTotal) as DecimalValue;
    }
    return repaymentIncome.times(rate) as DecimalValue;
  }

  if (repaymentIncome.greaterThan(dec(rules.highIncome.over))) {
    return repaymentIncome.times(dec(rules.highIncome.rateOfTotal)) as DecimalValue;
  }
  for (const band of rules.bands) {
    const upTo = band.upTo === null ? null : dec(band.upTo);
    if (
      repaymentIncome.greaterThan(dec(band.over)) &&
      (upTo === null || repaymentIncome.lessThanOrEqualTo(upTo))
    ) {
      return dec(band.baseAmount).plus(
        repaymentIncome.minus(dec(band.over)).times(dec(band.rate)),
      ) as DecimalValue;
    }
  }
  return zero;
}
