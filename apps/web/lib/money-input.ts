import { moneyFromDecimalString, type Money } from "@paymentcalcs/calculation-core";

export type MoneyParse =
  | { ok: true; money: Money }
  | { ok: false; error: string }
  | { ok: false; error: null; empty: true };

/**
 * §9.3 input behaviour: preserve partial entry, never coerce blank to zero,
 * reject impossible values with remediation. Accepts "1,234.56", "1234.5",
 * "-20". Rejects more than two decimal places rather than silently rounding.
 */
export function parseMoneyInput(raw: string, currency = "AUD"): MoneyParse {
  const trimmed = raw.trim().replace(/,/g, "").replace(/^\$/, "");
  if (trimmed === "" || trimmed === "-") return { ok: false, error: null, empty: true };
  if (!/^-?\d+(\.\d{0,2})?$/.test(trimmed)) {
    if (/^-?\d+\.\d{3,}$/.test(trimmed)) {
      return { ok: false, error: "Use at most two decimal places (cents)." };
    }
    return { ok: false, error: "Enter an amount like 1,250.00." };
  }
  const normalised = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
  return { ok: true, money: moneyFromDecimalString(currency, normalised, 2) };
}
