"use client";

import type { ReactNode } from "react";
import { dec } from "@paymentcalcs/calculation-core";
import { formatMajor } from "../../lib/format-major";

/**
 * Shared result-surface parts for the mortgage cluster.
 *
 * Money arithmetic here runs on decimal.js (via calculation-core's `dec`)
 * over the serialized major-unit strings the ledger engines already produced —
 * never on JS floats, and never a new calculation the engines did not make.
 */

/** Normalise "-0.00" so a signed zero never renders as a negative amount. */
function plain(value: string): string {
  return value === "-0.00" ? "0.00" : value;
}

/** Exact sum of major-unit decimal strings, at 2dp. */
export function sumMajor(values: readonly string[]): string {
  return plain(values.reduce((acc, value) => acc.plus(value), dec(0)).toFixed(2));
}

/** Exact `a − b` over major-unit decimal strings, at 2dp. */
export function diffMajor(a: string, b: string): string {
  return plain(dec(a).minus(b).toFixed(2));
}

/** Exact `value × numerator ÷ denominator`, at 2dp. Used for per-period ↔ per-month. */
export function scaleMajor(value: string, numerator: number, denominator: number): string {
  return plain(dec(value).times(numerator).div(denominator).toFixed(2));
}

/** `part ÷ whole` as a whole-percent display string. */
export function sharePct(part: string, whole: string): string {
  const total = dec(whole);
  if (total.isZero()) return "—";
  return `${dec(part).div(total).times(100).toFixed(0)}%`;
}

/** Largest / smallest of a set of major-unit decimal strings. */
export function extremeMajor(values: readonly string[], pick: "max" | "min"): number {
  let best = 0;
  for (let i = 1; i < values.length; i += 1) {
    const better = pick === "max" ? dec(values[i]!).greaterThan(values[best]!) : dec(values[i]!).lessThan(values[best]!);
    if (better) best = i;
  }
  return best;
}

export type Direction = "up" | "down" | "flat";

export function directionOf(signedValue: string): Direction {
  const value = dec(signedValue);
  if (value.isZero()) return "flat";
  return value.isNegative() ? "down" : "up";
}

/** "+$120.44" / "−$120.44" / "$0.00" — sign is always explicit on a delta. */
export function formatSignedMajor(signedValue: string): string {
  return directionOf(signedValue) === "up" ? `+${formatMajor(signedValue)}` : formatMajor(signedValue);
}

/** Non-colour direction glyph. Always paired with a word in the detail line. */
export function directionGlyph(direction: Direction): string {
  return direction === "up" ? "▲" : direction === "down" ? "▼" : "—";
}

/**
 * Non-money metric cell. Deliberately mirrors calculation-ui's `ResultMetric`
 * markup and padding so mixed rows sit level and share one baseline grid.
 */
export function MetricCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="font-mono text-xl tabular-nums text-ink">{value}</span>
      {detail ? <span className="text-[12px] leading-4 text-ink-3">{detail}</span> : null}
    </div>
  );
}

/**
 * Signed money cell: glyph + sign + a word, so direction never rests on colour
 * (§20.8). `detail` carries the plain-language reading of the sign.
 */
export function DeltaCell({
  label,
  signedValue,
  detail,
}: {
  label: string;
  signedValue: string;
  detail?: ReactNode;
}) {
  const direction = directionOf(signedValue);
  return (
    <MetricCell
      label={label}
      value={
        <span className="inline-flex items-baseline gap-2">
          <span aria-hidden="true" className="text-[13px] text-ink-3">
            {directionGlyph(direction)}
          </span>
          <span>{formatSignedMajor(signedValue)}</span>
        </span>
      }
      detail={detail}
    />
  );
}

/** Section heading inside a result or explanation panel. */
export function PanelHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">{children}</h3>
  );
}
