import { Dec, type DecimalValue } from "./decimal";

/** §14.1 — payment/compounding frequency. */
export type Frequency =
  | { kind: "daily" }
  | { kind: "weekly"; interval?: number; weekday?: number }
  | { kind: "fortnightly"; weekday?: number }
  | { kind: "four_weekly"; weekday?: number }
  | { kind: "monthly"; day?: number; endOfMonth?: boolean }
  | { kind: "quarterly"; day?: number }
  | { kind: "half_yearly"; day?: number }
  | { kind: "annually"; month?: number; day?: number }
  | { kind: "custom"; isoDuration: string };

/**
 * Nominal periods per year for annualisation and display conversion.
 * Conventions per §13.1: weekly 52, fortnightly 26, four-weekly 13,
 * monthly 12, quarterly 4, half-yearly 2, daily 365.
 * `custom` has no nominal periods-per-year and must be handled by date logic.
 */
export function periodsPerYear(frequency: Frequency): DecimalValue | null {
  switch (frequency.kind) {
    case "daily":
      return new Dec(365);
    case "weekly":
      return new Dec(52).div(frequency.interval ?? 1) as DecimalValue;
    case "fortnightly":
      return new Dec(26);
    case "four_weekly":
      return new Dec(13);
    case "monthly":
      return new Dec(12);
    case "quarterly":
      return new Dec(4);
    case "half_yearly":
      return new Dec(2);
    case "annually":
      return new Dec(1);
    case "custom":
      return null;
  }
}
