import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { stampDutyPacks } from "@paymentcalcs/rules-au";
import { DutyRulesUnavailableError, generalDuty } from "./stamp-duty";

const d = (n: number | string) => new Dec(n) as DecimalValue;
const rulesFor = (state: string) => stampDutyPacks.find((p) => p.subdivision === state)!.rules;

describe("general transfer duty (§12.8) — reproduces the sources' own worked examples", () => {
  it("QLD official example: $850,000 → $17,325 + $13,950 = $31,275", () => {
    // From the QRO page: within $540,000–$1,000,000, duty is $17,325 plus
    // $4.50 for each $100 over $540,000 → 850,000: $31,275.
    const result = generalDuty(d(850_000), rulesFor("QLD"));
    expect(result.duty.toFixed(2)).toBe("31275.00");
  });

  it("SA official FOS examples: $300,000 → $11,330 and $600,000 → $26,830", () => {
    // RevenueSA's own surcharge page states both stamp duty figures.
    expect(generalDuty(d(300_000), rulesFor("SA")).duty.toFixed(2)).toBe("11330.00");
    expect(generalDuty(d(600_000), rulesFor("SA")).duty.toFixed(2)).toBe("26830.00");
  });

  it("NSW page examples: $450,000 → $11,602 + 4.50/100 over $387,000", () => {
    // (450,000 − 387,000) = 63,000 → 630 hundreds × 4.50 = 2,835 → 14,437.
    const result = generalDuty(d(450_000), rulesFor("NSW"));
    expect(result.duty.toFixed(2)).toBe("14437.00");
  });

  it("NSW high-value example: $4,000,000 → 194,137 + 7.00/100 over 3,870,000 = 203,237", () => {
    const result = generalDuty(d(4_000_000), rulesFor("NSW"));
    expect(result.duty.toFixed(2)).toBe("203237.00");
  });

  it("TAS flat $50 under $3,000 and bracket arithmetic above", () => {
    expect(generalDuty(d(2_000), rulesFor("TAS")).duty.toFixed(2)).toBe("50.00");
    // $500,000: bracket 375k–725k → 12,935 + 4.25 × ceil(125,000/100) = 12,935 + 5,312.50
    expect(generalDuty(d(500_000), rulesFor("TAS")).duty.toFixed(2)).toBe("18247.50");
  });

  it("part-thereof rounding counts a partial hundred in full (boundary)", () => {
    const exact = generalDuty(d(75_000), rulesFor("QLD"));
    const oneDollarOver = generalDuty(d(75_001), rulesFor("QLD"));
    // $1 over the bound adds a full $3.50 hundred-increment.
    expect(oneDollarOver.duty.minus(exact.duty).toFixed(2)).toBe("3.50");
  });

  it("NSW minimum duty applies at trivial values", () => {
    const result = generalDuty(d(100), rulesFor("NSW"));
    expect(result.duty.toFixed(2)).toBe("20.00");
    expect(result.minimumApplied).toBe(true);
  });

  it("WA general rate arithmetic: $500,000 → $11,115 + $4.75 × 1,400 = $17,765", () => {
    expect(generalDuty(d(500_000), rulesFor("WA")).duty.toFixed(2)).toBe("17765.00");
  });

  it("ACT non-owner-occupier: marginal bands, and the >$1,455,000 flat-on-total slab", () => {
    // $500,000 sits at a band cap: 4,600 + 3.40 × 2,000 = 11,400 (equals the
    // next band's printed base — the table's own continuity).
    expect(generalDuty(d(500_000), rulesFor("ACT")).duty.toFixed(2)).toBe("11400.00");
    // $1,455,000 is NOT "more than": 36,950 + 6.40 × 4,550 = 66,070.
    expect(generalDuty(d(1_455_000), rulesFor("ACT")).duty.toFixed(2)).toBe("66070.00");
    // Above it, $4.54 per $100 of the WHOLE value: 2,000,000 → 90,800.
    const slab = generalDuty(d(2_000_000), rulesFor("ACT"));
    expect(slab.duty.toFixed(2)).toBe("90800.00");
    expect(slab.appliedToTotal).toBe(true);
  });

  it("VIC percentage table: marginal bands, the 5.5%-of-total slab, and the >$2M band", () => {
    // $650,000: 2,870 + 6% × 520,000 = 34,070.
    expect(generalDuty(d(650_000), rulesFor("VIC")).duty.toFixed(2)).toBe("34070.00");
    // $1,000,000 sits in the slab band: 5.5% of the whole value.
    const slab = generalDuty(d(1_000_000), rulesFor("VIC"));
    expect(slab.duty.toFixed(2)).toBe("55000.00");
    expect(slab.appliedToTotal).toBe(true);
    // $3,000,000: 110,000 + 6.5% × 1,000,000 = 175,000 (base = 5.5% of $2M,
    // the table's own continuity at the slab boundary).
    expect(generalDuty(d(3_000_000), rulesFor("VIC")).duty.toFixed(2)).toBe("175000.00");
  });

  it("NT statutory formula and slabs with Act boundary semantics", () => {
    // $500,000: V=500 → 0.06571441 × 250,000 + 15 × 500 = 23,928.6025,
    // floored to 5 cents per the official calculator → 23,928.60.
    const formula = generalDuty(d(500_000), rulesFor("NT"));
    expect(formula.duty.toFixed(2)).toBe("23928.60");
    expect(formula.method).toBe("formula");
    expect(formula.formulaText).toContain("0.06571441");
    // (b) exceeds $525,000 but less than $3M → 4.95% of the whole value.
    expect(generalDuty(d(2_999_999), rulesFor("NT")).duty.toFixed(2)).toBe("148499.95");
    // (c) $3,000,000 or more → 5.75%; (d) $5,000,000 or more → 5.95%.
    expect(generalDuty(d(3_000_000), rulesFor("NT")).duty.toFixed(2)).toBe("172500.00");
    expect(generalDuty(d(5_000_000), rulesFor("NT")).duty.toFixed(2)).toBe("297500.00");
  });

  it("empty rule sets fail closed, never guess", () => {
    expect(() =>
      generalDuty(d(650_000), { general: null, generalPercent: null, generalFormula: null }),
    ).toThrow(DutyRulesUnavailableError);
  });

  it("duty is monotone non-decreasing in value for populated states", () => {
    // ACT is excluded: its >$1,455,000 flat-on-total band genuinely dips a
    // few dollars at the boundary in the published table. NT's slab boundary
    // dips ~3 cents at exactly $525,000; the $50k grid does not straddle it.
    for (const state of ["NSW", "QLD", "TAS", "SA", "WA", "VIC", "NT"]) {
      let previous = d(0);
      for (let value = 0; value <= 2_000_000; value += 50_000) {
        const { duty } = generalDuty(d(value), rulesFor(state));
        expect(duty.greaterThanOrEqualTo(previous), `${state} at ${value}`).toBe(true);
        previous = duty;
      }
    }
  });
});
