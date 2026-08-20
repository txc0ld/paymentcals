import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { superGuaranteePacks } from "@paymentcalcs/rules-au";
import { baseFromPackage, baseFromPackageIterative, packageFromBase } from "./package-decomposition";

const d = (n: number | string) => new Dec(n) as DecimalValue;
const sg2627 = superGuaranteePacks.find((p) => p.rulePackId.endsWith("2026-27"))!.rules;
const sg2425 = superGuaranteePacks.find((p) => p.rulePackId.endsWith("2024-25"))!.rules;

describe("package decomposition (§12.1.7)", () => {
  it("simple formula below the cap: 112,000 → base 100,000 at 12%", () => {
    const result = baseFromPackage(d(112_000), sg2627, true);
    expect(result.method).toBe("simple_formula");
    expect(result.baseSalary.toFixed(2)).toBe("100000.00");
    expect(result.employerSuper.toFixed(2)).toBe("12000.00");
  });

  it("caps at the annual maximum contribution base (2026-27: $270,830)", () => {
    const result = baseFromPackage(d(500_000), sg2627, true);
    expect(result.method).toBe("capped_contribution_base");
    expect(result.employerSuper.toFixed(2)).toBe("32499.60");
    expect(result.baseSalary.toFixed(2)).toBe("467500.40");
  });

  it("quarterly-basis cap annualises ×4 (2024-25: 65,070 × 4 at 11.5%)", () => {
    const result = baseFromPackage(d(600_000), sg2425, true);
    expect(result.employerSuper.toFixed(2)).toBe(d(65_070 * 4).times("0.115").toFixed(2));
  });

  it("closed form always reconciles: base + super = package (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 2_000_000 }), (packageDollars) => {
        for (const rules of [sg2627, sg2425]) {
          const result = baseFromPackage(d(packageDollars), rules, true);
          expect(
            result.baseSalary.plus(result.employerSuper).minus(packageDollars).abs().lessThan("0.000001"),
          ).toBe(true);
        }
      }),
    );
  });

  it("iterative §12.1.7 solve agrees with the closed form (property)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 10_000, max: 1_000_000 }), (packageDollars) => {
        const closed = baseFromPackage(d(packageDollars), sg2627, true);
        const iterative = baseFromPackageIterative(d(packageDollars), sg2627, true);
        expect(closed.baseSalary.minus(iterative.baseSalary).abs().lessThan("0.01")).toBe(true);
      }),
      { numRuns: 25 },
    );
  });

  it("forward and reverse are inverses", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 400_000 }), (baseDollars) => {
        const forward = packageFromBase(d(baseDollars), sg2627, true);
        const reverse = baseFromPackage(forward.totalPackage, sg2627, true);
        expect(reverse.baseSalary.minus(baseDollars).abs().lessThan("0.01")).toBe(true);
      }),
    );
  });
});
