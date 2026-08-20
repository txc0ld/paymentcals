import { describe, expect, it } from "vitest";
import { compareRefinance } from "./refinance";
import type { LedgerInput } from "./ledger";

const oldLoan: LedgerInput = {
  openingPrincipal: "480000",
  annualRate: "0.065",
  termPeriods: 300,
  repaymentFrequency: "monthly",
  firstRepaymentDate: "2026-10-01",
  repaymentType: "principal_and_interest",
  repaymentResetPolicy: "recalculate_to_term",
};

describe("refinance break-even (§12.7, §13.10)", () => {
  it("a lower rate with modest costs breaks even and stays ahead", () => {
    const result = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.055" },
      { upfrontCash: "1100", financedCosts: "0", cashback: "0" },
    );
    expect(result.repaymentDifference.greaterThan(0)).toBe(true);
    // Cash-only break-even (§13.10): ~$290/month saving against $1,100 costs
    // crosses within the first several payments.
    expect(result.breakEvenDate).not.toBeNull();
    expect(result.breakEvenDate! <= "2027-06-01").toBe(true);
    expect(result.economicAdvantageAtHorizon.greaterThan(0)).toBe(true);
    expect(result.reversalsAfterBreakEven).toBe(0);
  });

  it("a marginally better rate with huge costs shows no break-even in horizon", () => {
    const result = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.0649" },
      { upfrontCash: "15000", financedCosts: "0", cashback: "0" },
    );
    expect(result.breakEvenDate).toBeNull();
  });

  it("financed switching costs accrue interest in the new scenario (§12.7 AC)", () => {
    const financed = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.055" },
      { upfrontCash: "0", financedCosts: "8000", cashback: "0" },
    );
    const cash = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.055" },
      { upfrontCash: "8000", financedCosts: "0", cashback: "0" },
    );
    // Financing the costs must cost more in interest over the life.
    expect(financed.newLoan.totalInterest.greaterThan(cash.newLoan.totalInterest)).toBe(true);
  });

  it("a cashback is not counted before its received date (§12.7 AC)", () => {
    const late = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.055" },
      { upfrontCash: "1000", financedCosts: "0", cashback: "3000", cashbackDate: "2028-01-01" },
    );
    const first = late.cumulativeDelta[0]!;
    const immediate = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.055" },
      { upfrontCash: "1000", financedCosts: "0", cashback: "3000" },
    );
    expect(first.delta.lessThan(immediate.cumulativeDelta[0]!.delta)).toBe(true);
  });

  it("a longer new term lowers repayments but shows higher lifetime cost (§12.7 AC)", () => {
    const result = compareRefinance(
      oldLoan,
      { ...oldLoan, annualRate: "0.065", termPeriods: 360 },
      { upfrontCash: "0", financedCosts: "0", cashback: "0" },
    );
    expect(result.repaymentDifference.greaterThan(0)).toBe(true); // lower new repayment
    // Same rate, longer term: total interest on the new loan is higher.
    expect(result.newLoan.totalInterest.greaterThan(result.oldLoan.totalInterest)).toBe(true);
  });
});
