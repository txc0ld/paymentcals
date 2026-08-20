import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { buildLoanSchedule } from "@paymentcalcs/engine-loans";
import { compareToBaseline, runLedger, type LedgerInput } from "./ledger";

const d = (n: number | string) => new Dec(n) as DecimalValue;

const base: LedgerInput = {
  openingPrincipal: "500000",
  annualRate: "0.06",
  termPeriods: 360,
  repaymentFrequency: "monthly",
  firstRepaymentDate: "2026-10-01",
  repaymentType: "principal_and_interest",
  repaymentResetPolicy: "recalculate_to_term",
};

describe("scheduled ledger core (§12.5.8 invariants)", () => {
  it("MORT-AC-001: with no events it reconciles to the closed-form engine", () => {
    const ledger = runLedger(base);
    const closedForm = buildLoanSchedule({
      principal: d("500000"),
      annualRate: d("0.06"),
      termPeriods: 360,
      frequency: "monthly",
      firstPaymentDate: "2026-10-01",
      repaymentType: "principal_and_interest",
    });
    expect(ledger.rows.length).toBe(closedForm.rows.length);
    expect(ledger.totalInterest.minus(closedForm.totalInterest).abs().lessThan("0.05")).toBe(true);
    expect(ledger.payoffDate).toBe(closedForm.payoffDate);
    expect(ledger.reconciliation.passed).toBe(true);
    expect(ledger.badge).toBe("scheduled_model");
  });

  it("every period reconciles: opening + interest − payment − extra = closing (MORT-AC-010)", () => {
    const result = runLedger({
      ...base,
      offsetOpeningBalance: "50000",
      events: [
        { type: "extra_recurring", startDate: "2027-01-01", amount: "400" },
        { type: "extra_oneoff", effectiveDate: "2030-06-15", amount: "20000" },
        { type: "rate_change", effectiveDate: "2029-10-01", annualRate: "0.07" },
        { type: "fee_annual", startDate: "2026-12-01", amount: "395", financed: false },
      ],
    });
    let previous = d("500000");
    for (const row of result.rows) {
      const reconstructed = previous
        .plus(row.interest)
        .minus(row.payment)
        .minus(row.extraPayment);
      expect(
        reconstructed.minus(row.closingBalance).abs().lessThanOrEqualTo("0.011"),
        `period ${row.period}`,
      ).toBe(true);
      previous = row.closingBalance;
    }
    expect(result.reconciliation.passed).toBe(true);
  });

  it("offset equivalence: a 100% offset balance matches direct principal reduction before fees", () => {
    const offsetRun = runLedger({ ...base, offsetOpeningBalance: "100000", paymentOverride: "3000" });
    const reducedRun = runLedger({
      ...base,
      openingPrincipal: "400000",
      paymentOverride: "3000",
    });
    // First-period interest bases must be identical (AC in §12.6).
    expect(offsetRun.rows[0]!.interest.toFixed(2)).toBe(reducedRun.rows[0]!.interest.toFixed(2));
  });

  it("MORT-AC-004: an offset withdrawal raises later interest but leaves principal unchanged", () => {
    const withWithdrawal = runLedger({
      ...base,
      offsetOpeningBalance: "80000",
      events: [{ type: "offset_withdrawal", effectiveDate: "2030-01-01", amount: "50000" }],
    });
    const without = runLedger({ ...base, offsetOpeningBalance: "80000" });
    const idx = withWithdrawal.rows.findIndex((r) => r.date >= "2030-01-01");
    expect(withWithdrawal.rows[idx]!.interest.greaterThan(without.rows[idx]!.interest)).toBe(true);
    // Principal on the withdrawal date is not directly changed by the event.
    expect(withWithdrawal.rows[idx - 1]!.closingBalance.toFixed(2)).toBe(
      without.rows[idx - 1]!.closingBalance.toFixed(2),
    );
    expect(withWithdrawal.totalInterest.greaterThan(without.totalInterest)).toBe(true);
  });

  it("MORT-AC-005: a rate change applies from its effective date with recalculation policy", () => {
    const result = runLedger({
      ...base,
      events: [{ type: "rate_change", effectiveDate: "2031-10-01", annualRate: "0.08" }],
    });
    const before = result.rows.find((r) => r.date === "2031-09-01")!;
    const after = result.rows.find((r) => r.date === "2031-10-01")!;
    expect(before.annualRate).toBe("0.06");
    expect(after.annualRate).toBe("0.08");
    expect(after.payment.greaterThan(before.payment)).toBe(true);
    expect(result.rows[result.rows.length - 1]!.closingBalance.isZero()).toBe(true);
  });

  it("keep_amount policy holds the repayment and extends time on a rate rise", () => {
    const keep = runLedger({
      ...base,
      repaymentResetPolicy: "keep_amount",
      events: [{ type: "rate_change", effectiveDate: "2031-10-01", annualRate: "0.07" }],
    });
    const recalc = runLedger({
      ...base,
      repaymentResetPolicy: "recalculate_to_term",
      events: [{ type: "rate_change", effectiveDate: "2031-10-01", annualRate: "0.07" }],
    });
    const keepAfter = keep.rows.find((r) => r.date === "2031-10-01")!;
    const recalcAfter = recalc.rows.find((r) => r.date === "2031-10-01")!;
    expect(keepAfter.payment.lessThan(recalcAfter.payment)).toBe(true);
    expect(keep.unresolvedBalance !== null || keep.periodsUsed >= recalc.periodsUsed).toBe(true);
  });

  it("interest-only expiry recalculates the repayment over the remaining term", () => {
    const result = runLedger({
      ...base,
      repaymentType: "principal_and_interest",
      interestOnlyPeriods: 60,
    });
    expect(result.rows[59]!.closingBalance.toFixed(2)).toBe("500000.00");
    expect(result.rows[60]!.payment.greaterThan(result.rows[59]!.payment)).toBe(true);
    expect(result.rows[result.rows.length - 1]!.closingBalance.isZero()).toBe(true);
    expect(result.reconciliation.passed).toBe(true);
  });

  it("weekly and fortnightly extra repayments are first-class (MORT-AC-003)", () => {
    const result = runLedger({
      ...base,
      repaymentFrequency: "fortnightly",
      termPeriods: 780,
      events: [{ type: "extra_recurring", startDate: "2026-10-01", amount: "200" }],
    });
    expect(result.rows[5]!.extraPayment.toFixed(2)).toBe("200.00");
    expect(result.periodsUsed).toBeLessThan(780);
  });
});

describe("baseline comparison (interest and time saved)", () => {
  it("offset and extras strictly reduce interest and shorten the loan", () => {
    const { interestSaved, periodsSaved, scenario, baseline } = compareToBaseline({
      ...base,
      offsetOpeningBalance: "40000",
      events: [{ type: "extra_recurring", startDate: "2026-10-01", amount: "500" }],
    });
    expect(interestSaved.greaterThan(0)).toBe(true);
    expect(periodsSaved).toBeGreaterThan(0);
    expect(scenario.reconciliation.passed).toBe(true);
    expect(baseline.reconciliation.passed).toBe(true);
  });

  it("property: reconciliation passes across random event mixes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100_000, max: 900_000 }),
        fc.integer({ min: 20, max: 75 }),
        fc.integer({ min: 0, max: 80_000 }),
        fc.integer({ min: 0, max: 1500 }),
        (principal, rateTenths, offset, extra) => {
          const result = runLedger({
            ...base,
            openingPrincipal: String(principal),
            annualRate: new Dec(rateTenths).div(1000).toString(),
            termPeriods: 300,
            offsetOpeningBalance: String(offset),
            events: extra > 0 ? [{ type: "extra_recurring", startDate: "2026-10-01", amount: String(extra) }] : [],
          });
          expect(result.reconciliation.passed).toBe(true);
        },
      ),
      { numRuns: 20 },
    );
  });
});
