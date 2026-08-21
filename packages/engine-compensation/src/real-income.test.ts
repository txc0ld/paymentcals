import { describe, expect, it } from "vitest";
import { Dec } from "@paymentcalcs/calculation-core";
import { cpiPack } from "@paymentcalcs/rules-au";
import { CpiRangeError, computeRealIncome, quarterAtOrBefore } from "./real-income";

const rules = cpiPack.rules;
const first = rules.quarters[0]!;
const last = rules.quarters[rules.quarters.length - 1]!;

describe("quarterAtOrBefore", () => {
  it("snaps a mid-quarter date back to the published quarter", () => {
    const q = quarterAtOrBefore(rules, "2021-02-14");
    expect(q.date <= "2021-02-14").toBe(true);
    const next = rules.quarters[rules.quarters.indexOf(q) + 1];
    expect(next && next.date > "2021-02-14").toBe(true);
  });

  it("fails closed before the series and after the last published quarter — never forecasts", () => {
    expect(() => quarterAtOrBefore(rules, "1999-12-31")).toThrow(CpiRangeError);
    expect(() => quarterAtOrBefore(rules, "2099-01-01")).toThrow(CpiRangeError);
  });
});

describe("computeRealIncome", () => {
  it("reproduces the index ratio exactly from the pack values", () => {
    const result = computeRealIncome(rules, "100000", first.date, last.date);
    const expected = new Dec(last.index).div(new Dec(first.index));
    expect(result.factor).toBe(expected.toFixed(8));
    expect(result.neededSalary).toBe(
      new Dec("100000").times(expected).toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2),
    );
  });

  it("same-quarter comparison is the identity", () => {
    const result = computeRealIncome(rules, "90000", last.date, last.date);
    expect(result.factor).toBe(new Dec(1).toFixed(8));
    expect(result.neededSalary).toBe("90000.00");
    expect(result.effectiveValue).toBe("90000.00");
    expect(result.shortfall).toBe("0.00");
  });

  it("needed and effective are reciprocal directions of the same factor", () => {
    const result = computeRealIncome(rules, "120000", "2021-01-15", last.date);
    const factor = new Dec(result.factor);
    const roundTrip = new Dec(result.effectiveValue).times(factor);
    // effective × factor ≈ salary within rounding of the 2dp intermediate
    expect(roundTrip.minus(new Dec("120000")).abs().lessThan(new Dec("0.02"))).toBe(true);
    expect(result.steps.length).toBeGreaterThan(10);
    expect(result.steps[0]?.quarterDate).toBe(result.fromQuarter.date);
    expect(result.steps[result.steps.length - 1]?.quarterDate).toBe(result.toQuarter.date);
  });

  it("rejects reversed windows and non-positive salaries", () => {
    expect(() => computeRealIncome(rules, "100000", last.date, first.date)).toThrow(CpiRangeError);
    expect(() => computeRealIncome(rules, "0", first.date, last.date)).toThrow(CpiRangeError);
  });
});
