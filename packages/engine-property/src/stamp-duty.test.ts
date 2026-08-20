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

  it("unpopulated jurisdictions fail closed, never guess", () => {
    for (const state of ["VIC", "WA", "SA", "ACT", "NT"]) {
      expect(() => generalDuty(d(650_000), rulesFor(state)), state).toThrow(DutyRulesUnavailableError);
    }
  });

  it("duty is monotone non-decreasing in value for populated states", () => {
    for (const state of ["NSW", "QLD", "TAS"]) {
      let previous = d(0);
      for (let value = 0; value <= 2_000_000; value += 50_000) {
        const { duty } = generalDuty(d(value), rulesFor(state));
        expect(duty.greaterThanOrEqualTo(previous), `${state} at ${value}`).toBe(true);
        previous = duty;
      }
    }
  });
});
