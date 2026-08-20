import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { bisect, defaultSolverOptions } from "@paymentcalcs/financial-solvers";
import type { SuperGuaranteeRules } from "@paymentcalcs/rules-au";

/**
 * E04 — salary/package decomposition (§12.1.7).
 *
 * The simple closed form base = package ÷ (1 + r) applies only when the whole
 * base is OTE and no maximum-contribution-base effect bites. When the cap
 * applies the employer contribution is r × min(base, cap), which this module
 * solves both in closed form and (as a §12.1.7 verification path) iteratively.
 */

export class SuperRuleUnavailableError extends Error {
  readonly code = "PC-RULE-0004";
}

export interface PackageDecomposition {
  baseSalary: DecimalValue;
  employerSuper: DecimalValue;
  totalPackage: DecimalValue;
  /** "simple_formula" or "capped_contribution_base" or "iterative_solve". */
  method: string;
  capApplied: boolean;
  annualContributionCap: DecimalValue | null;
}

export function annualContributionCap(rules: SuperGuaranteeRules): DecimalValue | null {
  if (!rules.maxContributionBase) return null;
  const amount = dec(rules.maxContributionBase.amount);
  return rules.maxContributionBase.basis === "quarterly"
    ? (amount.times(4) as DecimalValue)
    : (amount as DecimalValue);
}

/** Employer SG on a given base (annual view). */
export function superOnBase(
  baseSalary: DecimalValue,
  rules: SuperGuaranteeRules,
  applyCap: boolean,
): DecimalValue {
  if (rules.rate === null) throw new SuperRuleUnavailableError("super guarantee rate is not populated");
  const cap = applyCap ? annualContributionCap(rules) : null;
  const oteBase = cap !== null ? (Dec.min(baseSalary, cap) as DecimalValue) : baseSalary;
  return oteBase.times(dec(rules.rate)) as DecimalValue;
}

/** Forward: base salary known, derive super and total package. */
export function packageFromBase(
  baseSalary: DecimalValue,
  rules: SuperGuaranteeRules,
  applyCap: boolean,
): PackageDecomposition {
  const employerSuper = superOnBase(baseSalary, rules, applyCap);
  const cap = applyCap ? annualContributionCap(rules) : null;
  return {
    baseSalary,
    employerSuper,
    totalPackage: baseSalary.plus(employerSuper) as DecimalValue,
    method: "forward_from_base",
    capApplied: cap !== null && baseSalary.greaterThan(cap),
    annualContributionCap: cap,
  };
}

/** Reverse: total package known, derive base (§12.1.7). */
export function baseFromPackage(
  totalPackage: DecimalValue,
  rules: SuperGuaranteeRules,
  applyCap: boolean,
): PackageDecomposition {
  if (rules.rate === null) throw new SuperRuleUnavailableError("super guarantee rate is not populated");
  const rate = dec(rules.rate);
  const cap = applyCap ? annualContributionCap(rules) : null;

  const uncappedBase = totalPackage.div(new Dec(1).plus(rate)) as DecimalValue;
  if (cap === null || uncappedBase.lessThanOrEqualTo(cap)) {
    return {
      baseSalary: uncappedBase,
      employerSuper: totalPackage.minus(uncappedBase) as DecimalValue,
      totalPackage,
      method: "simple_formula",
      capApplied: false,
      annualContributionCap: cap,
    };
  }

  // Cap binds: SG is fixed at r × cap, the remainder of the package is base.
  const employerSuper = cap.times(rate) as DecimalValue;
  const baseSalary = totalPackage.minus(employerSuper) as DecimalValue;
  return {
    baseSalary,
    employerSuper,
    totalPackage,
    method: "capped_contribution_base",
    capApplied: true,
    annualContributionCap: cap,
  };
}

/**
 * Iterative §12.1.7 verification path: solve base so that
 * base + super(base) = package using E24 bisection. Used by tests to prove
 * the closed forms, and by future package shapes with fixed benefits.
 */
export function baseFromPackageIterative(
  totalPackage: DecimalValue,
  rules: SuperGuaranteeRules,
  applyCap: boolean,
): PackageDecomposition {
  const result = bisect(
    (base) => base.plus(superOnBase(base, rules, applyCap)).minus(totalPackage) as DecimalValue,
    {
      ...defaultSolverOptions(0, Number(totalPackage.toFixed(0)) + 1),
      absoluteTolerance: new Dec("0.0001") as DecimalValue,
      intervalTolerance: new Dec("0.0001") as DecimalValue,
    },
  );
  if (result.status !== "converged") {
    throw new Error(`package decomposition did not converge (${result.status})`);
  }
  const employerSuper = superOnBase(result.value, rules, applyCap);
  const cap = applyCap ? annualContributionCap(rules) : null;
  return {
    baseSalary: result.value,
    employerSuper,
    totalPackage,
    method: "iterative_solve",
    capApplied: cap !== null && result.value.greaterThan(cap),
    annualContributionCap: cap,
  };
}
