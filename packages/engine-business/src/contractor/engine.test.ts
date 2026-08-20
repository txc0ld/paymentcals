import { describe, expect, it } from "vitest";
import { contractorRates } from "./engine";

const base = {
  targetIncome: "120000",
  superReplacementRate: "0.12",
  annualLeaveDays: 20,
  personalLeaveDays: 10,
  publicHolidays: 11,
  nonBillableDays: 20,
  utilisation: "0.85",
  hoursPerBillableDay: "7.6",
  overheadsAnnual: "15000",
  profitMargin: "0.1",
  gstRate: "0.10" as string | null,
};

describe("contractor day rate (§12.16)", () => {
  it("derives capacity without double-counting leave and holidays", () => {
    const result = contractorRates(base);
    expect(result.capacityDays).toBe(260 - 11 - 20 - 10 - 20); // 199
    expect(Number(result.billableDays.toFixed(2))).toBeCloseTo(199 * 0.85, 1);
  });

  it("super replacement is separate from spendable income and GST is never revenue", () => {
    const result = contractorRates(base);
    expect(result.superReplacement.toFixed(2)).toBe("14400.00");
    // Break-even = income + super + overheads; GST sits on top of the quote.
    expect(result.breakEvenRevenue.toFixed(2)).toBe("149400.00");
    expect(result.dayRateIncludingGst!.greaterThan(result.targetDayRate)).toBe(true);
    expect(
      result.dayRateIncludingGst!.minus(result.targetDayRate).minus(result.gstOnDayRate!).abs().lessThan("0.01"),
    ).toBe(true);
  });

  it("unregistered contractors get no GST line", () => {
    const result = contractorRates({ ...base, gstRate: null });
    expect(result.gstOnDayRate).toBeNull();
    expect(result.dayRateIncludingGst).toBeNull();
  });

  it("caps utilisation above 100% with a warning", () => {
    const result = contractorRates({ ...base, utilisation: "1.4" });
    expect(result.warnings.some((w) => w.includes("Utilisation"))).toBe(true);
    expect(Number(result.billableDays.toFixed(0))).toBe(199);
  });

  it("warns when capacity is exhausted", () => {
    const result = contractorRates({ ...base, nonBillableDays: 240 });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
