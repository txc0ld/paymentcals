import { Temporal } from "@js-temporal/polyfill";
import type { Frequency } from "./frequency";
import type { ISODate } from "./contracts";

/**
 * §11.4 date layer: Temporal-backed, date-only, no UTC round-trips. All
 * schedule engines derive payment dates through these helpers so month-end
 * behaviour and leap years are handled in one audited place.
 */

export function plainDate(iso: ISODate): Temporal.PlainDate {
  return Temporal.PlainDate.from(iso);
}

export function isoDate(date: Temporal.PlainDate): ISODate {
  return date.toString();
}

/**
 * The k-th occurrence (k ≥ 0) of a recurring schedule anchored at `start`.
 * Monthly-family frequencies anchor to the start's day-of-month and clamp to
 * shorter months (Temporal's default month arithmetic).
 */
export function nthOccurrence(start: Temporal.PlainDate, frequency: Frequency, k: number): Temporal.PlainDate {
  switch (frequency.kind) {
    case "daily":
      return start.add({ days: k });
    case "weekly":
      return start.add({ weeks: k * (frequency.interval ?? 1) });
    case "fortnightly":
      return start.add({ weeks: 2 * k });
    case "four_weekly":
      return start.add({ weeks: 4 * k });
    case "monthly":
      return start.add({ months: k });
    case "quarterly":
      return start.add({ months: 3 * k });
    case "half_yearly":
      return start.add({ months: 6 * k });
    case "annually":
      return start.add({ years: k });
    case "custom":
      return start.add(Temporal.Duration.from(frequency.isoDuration).round({ largestUnit: "years", smallestUnit: "days", relativeTo: start }));
  }
}

export function compareDates(a: Temporal.PlainDate, b: Temporal.PlainDate): -1 | 0 | 1 {
  return Temporal.PlainDate.compare(a, b) as -1 | 0 | 1;
}

export { Temporal };
