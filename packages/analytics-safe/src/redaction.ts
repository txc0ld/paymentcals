/**
 * §18.4 — central analytics redaction.
 *
 * Design: strict allowlist, not blocklist. A property is accepted only when its
 * key is registered AND its value passes that key's validator. Everything else
 * — money amounts, incomes, balances, rates-as-personal-facts, ages, free text,
 * unknown keys — is rejected by construction. Rejection is per-event: one bad
 * property drops the whole event, so partial leakage is impossible.
 */
export type AllowedValue = string | boolean;

export interface RejectedEvent {
  event: string;
  reason: string;
  /** The offending KEY only. Values are never echoed anywhere. */
  propertyKey?: string;
}

const CALCULATOR_ID = /^(AU|GL)-[A-Z]+-\d{3}$/;
const FINANCIAL_YEAR = /^\d{4}-\d{2}$/;
const DURATION_BUCKET = /^(under_100ms|under_750ms|under_2s|over_2s)$/;
const ERROR_CODE = /^PC-[A-Z]+-\d{4}$/;

const ALLOWED_PROPERTIES: Record<string, (value: AllowedValue) => boolean> = {
  calculator_id: (v) => typeof v === "string" && CALCULATOR_ID.test(v),
  mode: (v) => v === "simple" || v === "advanced" || v === "compare",
  financial_year: (v) => typeof v === "string" && FINANCIAL_YEAR.test(v),
  jurisdiction: (v) => typeof v === "string" && /^[A-Z]{2}(-[A-Z]{2,3})?$/.test(v),
  has_warnings: (v) => typeof v === "boolean",
  duration_bucket: (v) => typeof v === "string" && DURATION_BUCKET.test(v),
  error_code: (v) => typeof v === "string" && ERROR_CODE.test(v),
  rule_status: (v) =>
    v === "active" || v === "draft" || v === "unavailable" || v === "historical",
  theme: (v) => v === "light" || v === "dark" || v === "system",
  action: (v) =>
    typeof v === "string" &&
    ["save", "share", "export_csv", "export_json", "print", "reset", "mode_switch"].includes(v),
  /** Route path only — never a query string, fragment or user-provided text. */
  path: (v) => typeof v === "string" && /^\/[a-z0-9\-/]{0,80}$/.test(v),
};

const ALLOWED_EVENTS = [
  "page_view",
  "calculation_completed",
  "calculation_failed",
  "rule_unavailable_shown",
  "scenario_action",
  "explainability_opened",
  "disclosure_viewed",
] as const;

export type AllowedEventName = (typeof ALLOWED_EVENTS)[number];

export type RedactionOutcome =
  | { accepted: true; event: string; props: Record<string, AllowedValue> }
  | { accepted: false; rejection: RejectedEvent };

export function redactEvent(event: string, props: Record<string, unknown>): RedactionOutcome {
  if (!(ALLOWED_EVENTS as readonly string[]).includes(event)) {
    return { accepted: false, rejection: { event, reason: "event_not_allowlisted" } };
  }
  const clean: Record<string, AllowedValue> = {};
  for (const [key, value] of Object.entries(props)) {
    const validator = ALLOWED_PROPERTIES[key];
    if (!validator) {
      return {
        accepted: false,
        rejection: { event, reason: "property_not_allowlisted", propertyKey: key },
      };
    }
    if (typeof value !== "string" && typeof value !== "boolean") {
      // Numbers are rejected wholesale: every §18.4-forbidden class (amounts,
      // incomes, balances, ages) arrives as a number or numeric string.
      return {
        accepted: false,
        rejection: { event, reason: "value_type_forbidden", propertyKey: key },
      };
    }
    if (!validator(value)) {
      return {
        accepted: false,
        rejection: { event, reason: "value_failed_validation", propertyKey: key },
      };
    }
    clean[key] = value;
  }
  return { accepted: true, event, props: clean };
}
