import { describe, expect, it } from "vitest";
import { simulateCreditCard } from "./credit-card";

const base = {
  balance: "5000",
  annualPurchaseRate: "0.2099",
  minimumPercent: "0.02",
  minimumFloor: "25",
  firstCycleDate: "2026-10-01",
  strategy: "minimum_only" as const,
};

describe("credit-card payoff (§12.11)", () => {
  it("minimum-only takes far longer and costs far more than a fixed payment", () => {
    const minimumOnly = simulateCreditCard(base);
    const fixed = simulateCreditCard({ ...base, strategy: "fixed_payment", fixedPayment: "400" });
    expect(fixed.payoffDate).not.toBeNull();
    expect(fixed.monthsToPayoff!).toBeLessThan(20);
    expect(minimumOnly.totalInterest.greaterThan(fixed.totalInterest)).toBe(true);
    if (minimumOnly.payoffDate) {
      expect(minimumOnly.monthsToPayoff!).toBeGreaterThan(fixed.monthsToPayoff!);
    }
  });

  it("the minimum-payment floor engages when 2% falls below $25 (boundary)", () => {
    const result = simulateCreditCard({ ...base, balance: "1000" });
    // 2% of ~1017 ≈ 20.35 < 25 floor → minimum is 25.
    expect(result.cycles[0]!.minimumPayment.toFixed(2)).toBe("25.00");
  });

  it("warns when payments cannot cover interest, fees and spending", () => {
    const result = simulateCreditCard({
      ...base,
      newSpendingPerMonth: "300",
      monthlyFee: "10",
    });
    expect(result.nonAmortising).toBe(true);
    expect(result.payoffDate).toBeNull();
  });

  it("promotional rate applies until its exact end date", () => {
    const result = simulateCreditCard({
      ...base,
      promotionalRate: "0",
      promotionalEndDate: "2027-01-01",
      strategy: "fixed_payment",
      fixedPayment: "200",
    });
    expect(result.cycles[0]!.rateApplied).toBe("0");
    expect(result.cycles[0]!.interest.isZero()).toBe(true);
    const after = result.cycles.find((c) => c.date >= "2027-01-01")!;
    expect(after.rateApplied).toBe("0.2099");
    expect(after.interest.greaterThan(0)).toBe(true);
  });

  it("every statement cycle reconciles opening to closing", () => {
    const result = simulateCreditCard({ ...base, strategy: "fixed_payment", fixedPayment: "250" });
    expect(result.reconciliationPassed).toBe(true);
    expect(result.payoffDate).not.toBeNull();
  });
});
