import { describe, expect, it } from "vitest";
import { decodeUrlState, encodeUrlState } from "./url-state";
import { zScenarioDocumentV1 } from "./scenario";

describe("url state codec", () => {
  it("round-trips input state including unicode", () => {
    const state = {
      calculatorId: "AU-BIZ-001",
      input: { mode: "add", amount: "1234.56", note: "café ✓" },
      financialYear: "2026-27",
    };
    const decoded = decodeUrlState(encodeUrlState(state));
    expect(decoded).toEqual({ ok: true, state });
  });

  it("is URL-safe (no +, /, =)", () => {
    const encoded = encodeUrlState({ calculatorId: "AU-BIZ-001", input: { a: "???>>>" } });
    expect(encoded).toMatch(/^1\.[A-Za-z0-9_-]+$/);
  });

  it("rejects unknown versions and malformed payloads explicitly", () => {
    expect(decodeUrlState("2.abc")).toEqual({ ok: false, reason: "unsupported_version" });
    expect(decodeUrlState("1.!!!!")).toEqual({ ok: false, reason: "malformed" });
    const noCalculator = encodeUrlState({ calculatorId: "x", input: {} }).replace(/^1\./, "");
    expect(decodeUrlState(`1.${btoa('{"a":1}')}`).ok).toBe(false);
    expect(noCalculator.length).toBeGreaterThan(0);
  });
});

describe("scenario document schema", () => {
  it("accepts a minimal valid document and caps compare scenarios at 3", () => {
    const base = {
      scenarioId: "s1",
      schemaVersion: "1" as const,
      calculatorId: "AU-BIZ-001",
      createdAt: "2026-08-20T10:00:00+08:00",
      updatedAt: "2026-08-20T10:00:00+08:00",
      jurisdiction: { country: "AU" },
      locale: "en-AU",
      currency: "AUD",
      input: { amount: "100.00" },
      selectedRulePacks: ["au-gst-standard"],
      consent: { storage: "local" as const },
    };
    expect(zScenarioDocumentV1.safeParse(base).success).toBe(true);
    const tooMany = {
      ...base,
      compareScenarios: [base, base, base, base],
    };
    expect(zScenarioDocumentV1.safeParse(tooMany).success).toBe(false);
  });
});
