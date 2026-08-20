import { describe, expect, it } from "vitest";
import { moneyFromMinorUnits, type CalculationRequestV1 } from "@paymentcalcs/calculation-core";
import { splitGoldenCases, zGoldenFixture } from "@paymentcalcs/test-fixtures";
import fixtureJson from "@paymentcalcs/test-fixtures/gst" with { type: "json" };
import { gstPack } from "@paymentcalcs/rules-au";
import { computeGst, type GstResolution } from "./engine.js";
import type { GstInput } from "./schema.js";

const fixture = zGoldenFixture.parse(fixtureJson);
const { verified, unverified } = splitGoldenCases(fixture);

const resolution: GstResolution = {
  pack: gstPack,
  manifestRef: {
    rulePackId: gstPack.rulePackId,
    rulesVersion: gstPack.rulesVersion,
    status: gstPack.status,
    integritySha256: "0".repeat(64),
  },
};

function makeRequest(input: unknown): CalculationRequestV1<GstInput> {
  return {
    requestId: "req-golden",
    calculatorId: fixture.calculatorId,
    calculatorSchemaVersion: "1",
    jurisdiction: { country: "AU" },
    locale: "en-AU",
    currency: "AUD",
    valuationDate: "2026-08-20",
    input: input as GstInput,
    options: { traceLevel: "none" },
  };
}

describe(`golden: ${fixture.fixtureId}`, () => {
  // Unverified cases still execute — the engine must succeed on every scaffold
  // input — but expected-value assertions are skipped and counted in CI.
  for (const goldenCase of unverified) {
    it(`[unverified — awaiting owner] ${goldenCase.caseId} executes cleanly`, () => {
      const result = computeGst(makeRequest(goldenCase.input), resolution);
      expect(["success", "success_with_warnings"]).toContain(result.status);
      expect(result.reconciliation?.every((r) => r.passed)).toBe(true);
    });
    it.skip(`[golden pending verification] ${goldenCase.caseId}`, () => {
      // Enabled automatically once the owner fills `expected` in the fixture.
    });
  }

  for (const goldenCase of verified) {
    it(`[verified golden] ${goldenCase.caseId}`, () => {
      const result = computeGst(makeRequest(goldenCase.input), resolution);
      const expected = goldenCase.expected as Record<string, unknown>;
      const output = result.output as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(expected)) {
        expect(
          (output[key] as { minorUnits?: string })?.minorUnits ?? output[key],
          key,
        ).toEqual(value);
      }
    });
  }

  it("sanity: fixture inputs parse and money uses minor-unit strings", () => {
    expect(fixture.cases.length).toBeGreaterThanOrEqual(4);
    expect(() => moneyFromMinorUnits("AUD", "10000", 2)).not.toThrow();
  });
});
