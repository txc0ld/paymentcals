import { describe, expect, it } from "vitest";
import { createAnalytics, type AnalyticsProvider } from "./analytics";
import { redactEvent } from "./redaction";

function expectRejected(event: string, props: Record<string, unknown>, key?: string) {
  const outcome = redactEvent(event, props);
  expect(outcome.accepted, JSON.stringify(props)).toBe(false);
  if (!outcome.accepted && key !== undefined) {
    expect(outcome.rejection.propertyKey).toBe(key);
  }
}

describe("§18.4 rejection — forbidden property classes never pass", () => {
  it("rejects money amounts, however they arrive", () => {
    expectRejected("calculation_completed", { amount: 1234.56 }, "amount");
    expectRejected("calculation_completed", { salary: "120000" }, "salary");
    expectRejected("calculation_completed", { balance: "1,234.56" }, "balance");
    expectRejected("calculation_completed", { property_price: 950000 }, "property_price");
  });

  it("rejects income, debt, tax settings, age and dates of birth", () => {
    expectRejected("calculation_completed", { income: 90000 }, "income");
    expectRejected("calculation_completed", { debt: "40000" }, "debt");
    expectRejected("calculation_completed", { tax_free_threshold: true }, "tax_free_threshold");
    expectRejected("calculation_completed", { age: 34 }, "age");
    expectRejected("calculation_completed", { dob: "1992-01-01" }, "dob");
  });

  it("rejects rates as personal facts and free text", () => {
    expectRejected("calculation_completed", { interest_rate: 0.0619 }, "interest_rate");
    expectRejected("scenario_action", { label: "our mortgage" }, "label");
    expectRejected("scenario_action", { employer: "Acme Pty Ltd" }, "employer");
    expectRejected("scenario_action", { note: "any free text" }, "note");
  });

  it("rejects numbers wholesale, even under allowlisted keys", () => {
    expectRejected("calculation_completed", { calculator_id: 42 }, "calculator_id");
    expectRejected("calculation_completed", { has_warnings: 1 }, "has_warnings");
  });

  it("rejects non-allowlisted events entirely", () => {
    expectRejected("user_typed_value", {});
  });

  it("rejects allowlisted keys whose values fail their validator", () => {
    expectRejected("calculation_completed", { calculator_id: "salary is 90k" }, "calculator_id");
    expectRejected("calculation_completed", { financial_year: "ninety" }, "financial_year");
  });

  it("drops the whole event when any property is rejected — no partial sends", () => {
    const sent: unknown[] = [];
    const provider: AnalyticsProvider = { send: (e, p) => sent.push([e, p]) };
    const analytics = createAnalytics(provider);
    analytics.track("calculation_completed", {
      calculator_id: "AU-BIZ-001",
      amount: 1234.56,
    });
    expect(sent).toHaveLength(0);
  });
});

describe("§18.4 allowed categorical metadata passes", () => {
  it("accepts the PRD's example event", () => {
    const outcome = redactEvent("calculation_completed", {
      calculator_id: "AU-PAY-001",
      mode: "advanced",
      financial_year: "2026-27",
      has_warnings: true,
      duration_bucket: "under_100ms",
    });
    expect(outcome.accepted).toBe(true);
  });

  it("forwards accepted events to the provider", () => {
    const sent: Array<[string, unknown]> = [];
    const analytics = createAnalytics({ send: (e, p) => sent.push([e, p]) });
    analytics.track("rule_unavailable_shown", {
      calculator_id: "AU-BIZ-001",
      rule_status: "unavailable",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]![0]).toBe("rule_unavailable_shown");
  });
});
