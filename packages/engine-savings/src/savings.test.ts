import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { futureValueClosedForm, requiredContribution, simulateSavings } from "./savings";

describe("compound interest (§13.11 / §12.13)", () => {
  it("matches the textbook closed form: $10k at 5% monthly for 10y with $500/mo", () => {
    const input = {
      openingBalance: "10000",
      contribution: "500",
      annualRate: "0.05",
      years: 10,
      compounding: "monthly" as const,
      timing: "end" as const,
    };
    // P(1+i)^n = 10,000 × (1+0.05/12)^120 ≈ 16,470.09
    // C[((1+i)^n −1)/i] = 500 × 155.28216 ≈ 77,641.08
    const closedForm = futureValueClosedForm(input);
    expect(Number(closedForm.toFixed(0))).toBeGreaterThan(94_000);
    expect(Number(closedForm.toFixed(0))).toBeLessThan(94_300);

    const simulated = simulateSavings(input);
    expect(simulated.reconciliationPassed).toBe(true);
    expect(simulated.years).toHaveLength(10);
    expect(simulated.totalContributions.toFixed(2)).toBe("60000.00");
  });

  it("zero-rate accumulates contributions linearly", () => {
    const result = simulateSavings({
      openingBalance: "1000",
      contribution: "100",
      annualRate: "0",
      years: 2,
      compounding: "monthly",
      timing: "end",
    });
    expect(result.futureValue.toFixed(2)).toBe("3400.00");
    expect(result.totalInterest.isZero()).toBe(true);
  });

  it("beginning-of-period contributions earn strictly more", () => {
    const base = {
      openingBalance: "0",
      contribution: "200",
      annualRate: "0.06",
      years: 5,
      compounding: "monthly" as const,
    };
    const end = simulateSavings({ ...base, timing: "end" });
    const beginning = simulateSavings({ ...base, timing: "beginning" });
    expect(beginning.futureValue.greaterThan(end.futureValue)).toBe(true);
  });

  it("goal solving round-trips through the forward calculation (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10_000, max: 2_000_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 90 }),
        (target, opening, years, rateTenths) => {
          const settings = {
            openingBalance: String(opening),
            annualRate: (rateTenths / 1000).toString(),
            years,
            compounding: "monthly" as const,
            timing: "end" as const,
          };
          const contribution = requiredContribution(String(target), settings);
          const achieved = futureValueClosedForm({ ...settings, contribution: contribution.toString() });
          if (contribution.isZero()) {
            // Opening balance alone meets or exceeds the target.
            expect(achieved.greaterThanOrEqualTo(target - 1)).toBe(true);
          } else {
            expect(achieved.minus(target).abs().lessThan(1)).toBe(true);
          }
        },
      ),
      { numRuns: 40 },
    );
  });
});
