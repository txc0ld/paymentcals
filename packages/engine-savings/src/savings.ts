import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";

/**
 * E14 — deposit growth and target solving (§13.11, §12.13). Closed forms for
 * constant settings; the yearly schedule is produced by period simulation so
 * displayed rows always reconcile with the headline (§13.30 discipline).
 */

export type CompoundingFrequency = "monthly" | "quarterly" | "annually";
export type ContributionTiming = "end" | "beginning";

const PERIODS: Record<CompoundingFrequency, number> = { monthly: 12, quarterly: 4, annually: 1 };
const cents = (v: DecimalValue): DecimalValue => v.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue;
const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;

export interface SavingsInput {
  openingBalance: string;
  /** Per-period contribution (same period as compounding). */
  contribution: string;
  annualRate: string;
  years: number;
  compounding: CompoundingFrequency;
  timing: ContributionTiming;
}

export interface SavingsYearRow {
  year: number;
  contributions: DecimalValue;
  interest: DecimalValue;
  closingBalance: DecimalValue;
}

export interface SavingsResult {
  futureValue: DecimalValue;
  totalContributions: DecimalValue;
  totalInterest: DecimalValue;
  years: SavingsYearRow[];
  /** Closed-form §13.11 value; simulation must agree within rounding. */
  closedFormValue: DecimalValue;
  reconciliationPassed: boolean;
}

/** §13.11 closed form. */
export function futureValueClosedForm(input: SavingsInput): DecimalValue {
  const periods = PERIODS[input.compounding] * input.years;
  const i = d(input.annualRate).div(PERIODS[input.compounding]) as DecimalValue;
  const p = d(input.openingBalance);
  const c = d(input.contribution);
  if (i.isZero()) return p.plus(c.times(periods)) as DecimalValue;
  const growth = new Dec(1).plus(i).pow(periods) as DecimalValue;
  let contributionTerm = c.times(growth.minus(1).div(i)) as DecimalValue;
  if (input.timing === "beginning") contributionTerm = contributionTerm.times(new Dec(1).plus(i)) as DecimalValue;
  return p.times(growth).plus(contributionTerm) as DecimalValue;
}

export function simulateSavings(input: SavingsInput): SavingsResult {
  const ppy = PERIODS[input.compounding];
  const i = d(input.annualRate).div(ppy) as DecimalValue;
  let balance = d(input.openingBalance);
  let totalContributions = d(0);
  let totalInterest = d(0);
  const years: SavingsYearRow[] = [];

  for (let year = 1; year <= input.years; year += 1) {
    let yearContributions = d(0);
    let yearInterest = d(0);
    for (let k = 0; k < ppy; k += 1) {
      if (input.timing === "beginning") {
        balance = balance.plus(d(input.contribution)) as DecimalValue;
        yearContributions = yearContributions.plus(d(input.contribution)) as DecimalValue;
      }
      const interest = cents(balance.times(i) as DecimalValue);
      balance = balance.plus(interest) as DecimalValue;
      yearInterest = yearInterest.plus(interest) as DecimalValue;
      if (input.timing === "end") {
        balance = balance.plus(d(input.contribution)) as DecimalValue;
        yearContributions = yearContributions.plus(d(input.contribution)) as DecimalValue;
      }
    }
    totalContributions = totalContributions.plus(yearContributions) as DecimalValue;
    totalInterest = totalInterest.plus(yearInterest) as DecimalValue;
    years.push({
      year,
      contributions: cents(yearContributions),
      interest: cents(yearInterest),
      closingBalance: cents(balance),
    });
  }

  const closedForm = futureValueClosedForm(input);
  const futureValue = cents(balance);
  // Per-period cent rounding causes drift vs the exact closed form; tolerance
  // scales with the number of periods (≤ half a cent per period).
  const tolerance = d(0.01).times(ppy * input.years + 1) as DecimalValue;
  return {
    futureValue,
    totalContributions: cents(totalContributions),
    totalInterest: cents(totalInterest),
    years,
    closedFormValue: cents(closedForm),
    reconciliationPassed: futureValue.minus(closedForm).abs().lessThanOrEqualTo(tolerance),
  };
}

/** Savings goal: required per-period contribution for a target (§12.13). */
export function requiredContribution(
  target: string,
  input: Omit<SavingsInput, "contribution">,
): DecimalValue {
  const periods = PERIODS[input.compounding] * input.years;
  const i = d(input.annualRate).div(PERIODS[input.compounding]) as DecimalValue;
  const p = d(input.openingBalance);
  const t = d(target);
  if (periods <= 0) return d(0);
  if (i.isZero()) {
    return (Dec.max(d(0), t.minus(p).div(periods)) as DecimalValue);
  }
  const growth = new Dec(1).plus(i).pow(periods) as DecimalValue;
  let annuity = growth.minus(1).div(i) as DecimalValue;
  if (input.timing === "beginning") annuity = annuity.times(new Dec(1).plus(i)) as DecimalValue;
  const needed = t.minus(p.times(growth)).div(annuity) as DecimalValue;
  return (Dec.max(d(0), needed) as DecimalValue);
}
