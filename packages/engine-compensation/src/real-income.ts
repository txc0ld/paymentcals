import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { CpiQuarter, CpiRules } from "@paymentcalcs/rules-au";

/**
 * Inflation adjustment over the ABS All groups CPI (RBA table G1), pure over
 * the resolved CPI pack. No forecasting: both dates must sit inside the
 * pack's published range, and the engine fails closed outside it.
 *
 * factor = index(to) / index(from)
 * neededSalary   = salary × factor   (keeps purchasing power)
 * effectiveValue = salary ÷ factor   (today's salary in from-date dollars)
 */

export class CpiRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CpiRangeError";
  }
}

/** Latest quarter at or before the date; fails closed outside the range. */
export function quarterAtOrBefore(rules: CpiRules, isoDate: string): CpiQuarter {
  const first = rules.quarters[0];
  const last = rules.quarters[rules.quarters.length - 1];
  if (!first || !last) throw new CpiRangeError("CPI pack contains no quarters");
  if (isoDate < first.date) {
    throw new CpiRangeError(`Date ${isoDate} is before the CPI series start (${first.date}).`);
  }
  if (isoDate > last.date) {
    throw new CpiRangeError(
      `Date ${isoDate} is after the last published CPI quarter (${last.date}); this engine never forecasts.`,
    );
  }
  let match = first;
  for (const quarter of rules.quarters) {
    if (quarter.date <= isoDate) match = quarter;
    else break;
  }
  return match;
}

export interface RealIncomeStep {
  quarterDate: string;
  index: string;
  /** salary × index/fromIndex — what the salary must be at this quarter. */
  neededSalary: string;
  /** salary × fromIndex/index — the salary's value in from-date dollars. */
  effectiveValue: string;
}

export interface RealIncomeResult {
  fromQuarter: CpiQuarter;
  toQuarter: CpiQuarter;
  /** index(to) ÷ index(from), decimal string. */
  factor: string;
  /** Cumulative inflation over the window, decimal (0.0682 = 6.82%). */
  cumulativeInflation: string;
  /** Salary required at `to` to match the `from` purchasing power (2 dp). */
  neededSalary: string;
  /** The unchanged salary expressed in `from`-date dollars (2 dp). */
  effectiveValue: string;
  /** neededSalary − salary (2 dp): the raise required. */
  shortfall: string;
  /** salary − effectiveValue (2 dp): purchasing power lost. */
  erosion: string;
  /** One step per quarter in the window, for charting. */
  steps: RealIncomeStep[];
}

export function computeRealIncome(
  rules: CpiRules,
  salaryMajor: string,
  fromDate: string,
  toDate: string,
): RealIncomeResult {
  const salary = new Dec(salaryMajor);
  if (!salary.isFinite() || salary.lessThanOrEqualTo(0)) {
    throw new CpiRangeError("Salary must be a positive amount.");
  }
  if (toDate < fromDate) throw new CpiRangeError("The comparison date is before the pay-rise date.");
  const fromQuarter = quarterAtOrBefore(rules, fromDate);
  const toQuarter = quarterAtOrBefore(rules, toDate);
  const fromIndex = new Dec(fromQuarter.index);
  const toIndex = new Dec(toQuarter.index);
  const factor: DecimalValue = toIndex.div(fromIndex);

  const money = (value: DecimalValue) => value.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2);
  const steps = rules.quarters
    .filter((quarter) => quarter.date >= fromQuarter.date && quarter.date <= toQuarter.date)
    .map((quarter) => {
      const stepFactor = new Dec(quarter.index).div(fromIndex);
      return {
        quarterDate: quarter.date,
        index: quarter.index,
        neededSalary: money(salary.times(stepFactor)),
        effectiveValue: money(salary.div(stepFactor)),
      };
    });

  return {
    fromQuarter,
    toQuarter,
    factor: factor.toFixed(8),
    cumulativeInflation: factor.minus(1).toFixed(6),
    neededSalary: money(salary.times(factor)),
    effectiveValue: money(salary.div(factor)),
    shortfall: money(salary.times(factor).minus(salary)),
    erosion: money(salary.minus(salary.div(factor))),
    steps,
  };
}
