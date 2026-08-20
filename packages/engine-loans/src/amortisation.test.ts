import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { amortisingPayment, buildLoanSchedule } from "./amortisation";

const d = (n: number | string) => new Dec(n) as DecimalValue;

describe("closed-form payment (§13.5–13.6)", () => {
  it("matches the standard formula: $500k, 6% p.a., 30y monthly ≈ $2,997.75", () => {
    const pmt = amortisingPayment(d(500_000), d("0.06").div(12) as DecimalValue, 360);
    expect(pmt.toFixed(2)).toBe("2997.75");
  });

  it("zero-rate loans divide principal evenly (no division by zero)", () => {
    expect(amortisingPayment(d(12_000), d(0), 12).toFixed(2)).toBe("1000.00");
  });

  it("a balloon reduces the periodic payment", () => {
    const withBalloon = amortisingPayment(d(30_000), d("0.08").div(12) as DecimalValue, 60, d(10_000));
    const without = amortisingPayment(d(30_000), d("0.08").div(12) as DecimalValue, 60);
    expect(withBalloon.lessThan(without)).toBe(true);
  });
});

describe("schedule construction (§13.7)", () => {
  const base = {
    principal: d(500_000),
    annualRate: d("0.06"),
    termPeriods: 360,
    frequency: "monthly" as const,
    firstPaymentDate: "2026-10-01",
    repaymentType: "principal_and_interest" as const,
  };

  it("ends at exactly zero with the final payment adjusted", () => {
    const result = buildLoanSchedule(base);
    expect(result.rows.length).toBe(360);
    expect(result.rows[359]!.closingBalance.isZero()).toBe(true);
    expect(result.unresolvedBalance).toBeNull();
    expect(result.reconciliation.passed).toBe(true);
    expect(result.payoffDate).toBe("2056-09-01");
  });

  it("total principal equals the loan amount (invariant)", () => {
    const result = buildLoanSchedule(base);
    expect(result.totalPrincipal.minus(500_000).abs().lessThanOrEqualTo("0.02")).toBe(true);
  });

  it("differential: schedule total interest tracks closed-form expectation", () => {
    // Closed form: 360 × 2,997.75 − 500,000 ≈ 579,190; per-period cent
    // rounding shifts this by at most a few dollars over 30 years.
    const result = buildLoanSchedule(base);
    const closedFormTotal = d("2997.75").times(360).minus(500_000);
    expect(result.totalInterest.minus(closedFormTotal).abs().lessThan(15)).toBe(true);
  });

  it("interest-only period keeps the balance level then amortises", () => {
    const result = buildLoanSchedule({
      ...base,
      termPeriods: 360,
      interestOnlyPeriods: 60,
    });
    expect(result.rows[59]!.closingBalance.toFixed(2)).toBe("500000.00");
    expect(result.rows[60]!.principal.greaterThan(0)).toBe(true);
    expect(result.rows[result.rows.length - 1]!.closingBalance.isZero()).toBe(true);
  });

  it("extra repayments shorten the loan and cut interest", () => {
    const withExtra = buildLoanSchedule({ ...base, extraPerPeriod: d(500) });
    const without = buildLoanSchedule(base);
    expect(withExtra.rows.length).toBeLessThan(without.rows.length);
    expect(withExtra.totalInterest.lessThan(without.totalInterest)).toBe(true);
    expect(withExtra.reconciliation.passed).toBe(true);
  });

  it("detects negative amortisation from an insufficient payment override", () => {
    const result = buildLoanSchedule({ ...base, paymentOverride: d(1000) });
    expect(result.negativeAmortisation).toBe(true);
    expect(result.unresolvedBalance).not.toBeNull();
  });

  it("weekly frequency produces weekly dates and 52-per-year periods", () => {
    const result = buildLoanSchedule({
      ...base,
      principal: d(10_000),
      annualRate: d("0.05"),
      termPeriods: 104,
      frequency: "weekly",
    });
    expect(result.rows[0]!.date).toBe("2026-10-01");
    expect(result.rows[1]!.date).toBe("2026-10-08");
    expect(result.rows[result.rows.length - 1]!.closingBalance.isZero()).toBe(true);
  });

  it("reconciliation holds across random loans (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10_000, max: 1_500_000 }),
        fc.integer({ min: 1, max: 95 }),
        fc.integer({ min: 12, max: 360 }),
        (principal, rateTenthsPct, term) => {
          const result = buildLoanSchedule({
            principal: d(principal),
            annualRate: d(rateTenthsPct).div(1000) as DecimalValue,
            termPeriods: term,
            frequency: "monthly",
            firstPaymentDate: "2026-10-01",
            repaymentType: "principal_and_interest",
          });
          expect(result.reconciliation.passed).toBe(true);
          expect(result.rows[result.rows.length - 1]!.closingBalance.isZero()).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });
});
