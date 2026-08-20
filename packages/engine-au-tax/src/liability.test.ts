import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Dec, dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { incomeTaxPacks, medicarePacks, stslPacks } from "@paymentcalcs/rules-au";
import {
  litoAmount,
  medicareLevy,
  medicareLevySurcharge,
  progressiveTax,
  stslRepayment,
} from "./liability";

const d = (n: number | string) => new Dec(n) as DecimalValue;

const byYear = <T extends { rulePackId: string }>(packs: T[], fy: string): T =>
  packs.find((p) => p.rulePackId.endsWith(fy))!;

describe("progressive tax — PAY-AC-003 boundary tests generated from pack data", () => {
  for (const pack of incomeTaxPacks) {
    const brackets = pack.rules.resident!;
    describe(pack.rulePackId, () => {
      for (const bracket of brackets) {
        if (bracket.upTo === null) continue;
        const boundary = Number(bracket.upTo);
        it(`is continuous and correct at the $${boundary} boundary`, () => {
          const atBoundary = progressiveTax(d(boundary), brackets);
          const below = progressiveTax(d(boundary - 1), brackets);
          const above = progressiveTax(d(boundary + 1), brackets);
          // Continuity: stepping $1 over the boundary adds at most the next
          // marginal rate on that dollar; never a jump.
          const nextRate = brackets[brackets.indexOf(bracket) + 1]!.rate;
          expect(above.minus(atBoundary).toFixed(4)).toBe(dec(nextRate).toFixed(4));
          expect(atBoundary.minus(below).toFixed(4)).toBe(dec(bracket.rate).toFixed(4));
        });
      }

      it("reproduces the pack's own bracket base amounts", () => {
        // e.g. FY2026-27: tax at $45,000 must equal $4,020 (the page's stated base).
        const secondBoundary = brackets[1]!.upTo!;
        const tax = progressiveTax(d(secondBoundary), brackets);
        const expected = dec(brackets[1]!.rate).times(Number(secondBoundary) - 18200);
        expect(tax.toFixed(2)).toBe(expected.toFixed(2));
      });

      it("is monotone non-decreasing (property)", () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 500_000 }),
            fc.integer({ min: 0, max: 500_000 }),
            (a, b) => {
              const [lo, hi] = a <= b ? [a, b] : [b, a];
              expect(
                progressiveTax(d(hi), brackets).greaterThanOrEqualTo(progressiveTax(d(lo), brackets)),
              ).toBe(true);
            },
          ),
        );
      });

      it("tax never exceeds income (property)", () => {
        fc.assert(
          fc.property(fc.integer({ min: 0, max: 2_000_000 }), (income) => {
            expect(progressiveTax(d(income), brackets).lessThanOrEqualTo(d(income))).toBe(true);
          }),
        );
      });
    });
  }
});

describe("LITO", () => {
  const pack = byYear(incomeTaxPacks, "2026-27");
  it("hits the documented anchor points", () => {
    expect(litoAmount(d(30_000), pack.rules).toFixed(2)).toBe("700.00");
    expect(litoAmount(d(37_500), pack.rules).toFixed(2)).toBe("700.00");
    expect(litoAmount(d(45_000), pack.rules).toFixed(2)).toBe("325.00");
    expect(litoAmount(d(66_667), pack.rules).toFixed(2)).toBe("0.00");
    expect(litoAmount(d(80_000), pack.rules).toFixed(2)).toBe("0.00");
  });
});

describe("Medicare levy — official worked example (PAY-AC-004)", () => {
  it("reproduces Angie 2025-26: taxable $29,000 → levy $98.90", () => {
    const pack = byYear(medicarePacks, "2025-26");
    const { levy } = medicareLevy(d(29_000), pack.rules, {
      status: "standard",
      familyStatus: "single",
      dependants: 0,
      spouseIncome: d(0),
    });
    expect(levy.toFixed(2)).toBe("98.90");
  });

  it("no levy at or below the lower threshold; full 2% above the upper", () => {
    const pack = byYear(medicarePacks, "2025-26");
    const rules = pack.rules;
    const single = { status: "standard" as const, familyStatus: "single" as const, dependants: 0, spouseIncome: d(0) };
    expect(medicareLevy(d(Number(rules.lowIncomeSingle!.lower)), rules, single).levy.toFixed(2)).toBe("0.00");
    const aboveUpper = Number(rules.lowIncomeSingle!.upper) + 1000;
    expect(medicareLevy(d(aboveUpper), rules, single).levy.toFixed(2)).toBe(
      d(aboveUpper).times("0.02").toFixed(2),
    );
  });
});

describe("Medicare levy surcharge — official worked example (PAY-AC-004)", () => {
  it("reproduces Tom 2026-27: $90,000 taxable + $27,000 RFB → MLS $1,170", () => {
    const pack = byYear(medicarePacks, "2026-27");
    const mls = medicareLevySurcharge(d(90_000), pack.rules, {
      hasPrivateHospitalCover: false,
      familyStatus: "single",
      dependants: 0,
      spouseIncome: d(0),
      reportableFringeBenefits: d(27_000),
    });
    expect(mls.toFixed(2)).toBe("1170.00");
  });

  it("is zero with private hospital cover regardless of income", () => {
    const pack = byYear(medicarePacks, "2026-27");
    const mls = medicareLevySurcharge(d(500_000), pack.rules, {
      hasPrivateHospitalCover: true,
      familyStatus: "single",
      dependants: 0,
      spouseIncome: d(0),
      reportableFringeBenefits: d(0),
    });
    expect(mls.isZero()).toBe(true);
  });
});

describe("STSL — official worked examples (PAY-AC-004)", () => {
  it("Christina 2026-27: repayment income $86,380 → $2,527.80", () => {
    const pack = byYear(stslPacks, "2026-27");
    expect(stslRepayment(d(86_380), pack.rules).toFixed(2)).toBe("2527.80");
  });

  it("Barry 2026-27: repayment income $137,064 → $10,276.99", () => {
    const pack = byYear(stslPacks, "2026-27");
    expect(stslRepayment(d(137_064), pack.rules).toFixed(2)).toBe("10276.99");
  });

  it("Priya 2026-27: repayment income $254,780 → $25,478 (10% of total)", () => {
    const pack = byYear(stslPacks, "2026-27");
    expect(stslRepayment(d(254_780), pack.rules).toFixed(2)).toBe("25478.00");
  });

  it("Branson 2024-25 (whole-income system): $99,736 at 5.5%", () => {
    // The ATO example page prints $5,485.52, but 99,736 × 0.055 = 5,485.48 —
    // the page's own arithmetic is off by 4c. The engine computes exactly;
    // the discrepancy is logged in VERIFICATION-QUEUE.md for the owner.
    const pack = byYear(stslPacks, "2024-25");
    expect(stslRepayment(d(99_736), pack.rules).toFixed(2)).toBe("5485.48");
  });

  it("nil at the threshold for every FY", () => {
    for (const pack of stslPacks) {
      expect(stslRepayment(d(Number(pack.rules.threshold)), pack.rules).isZero(), pack.rulePackId).toBe(true);
    }
  });

  it("marginal system is continuous at band boundaries (2026-27)", () => {
    const pack = byYear(stslPacks, "2026-27");
    // At $129,717 the first band tops out at 15% × (129,717 − 69,528) ≈ 9,028.35;
    // the second band starts from base $9,028 — the ATO's own published base.
    const atBoundary = stslRepayment(d(129_717), pack.rules);
    const justAbove = stslRepayment(d(129_718), pack.rules);
    expect(justAbove.minus(atBoundary).abs().lessThan(1)).toBe(true);
  });
});
