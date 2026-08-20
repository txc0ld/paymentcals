"use client";

import { useEffect, useRef, useState } from "react";
import type { Money } from "@paymentcalcs/calculation-core";
import { formatMoney } from "./format";

/**
 * §20.7 — result count animation ≤250ms that never delays the true value:
 * the accessible value updates immediately; only the visual glyphs sweep.
 */
function useSweptValue(target: Money, durationMs = 200): string {
  const [display, setDisplay] = useState(() => formatMoney(target));
  const previous = useRef<Money>(target);
  const frame = useRef<number>(0);

  useEffect(() => {
    const from = BigInt(previous.current.minorUnits);
    const to = BigInt(target.minorUnits);
    previous.current = target;
    if (
      from === to ||
      durationMs === 0 ||
      (typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      setDisplay(formatMoney(target));
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const current = from + ((to - from) * BigInt(Math.round(eased * 1000))) / 1000n;
      setDisplay(
        formatMoney({ ...target, minorUnits: current.toString() === "-0" ? "0" : current.toString() }),
      );
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, durationMs]);

  return display;
}

/** §9.4 primary answer. Announced politely to screen readers, mono, no shift. */
export function PrimaryResult({
  label,
  amount,
  qualifier,
}: {
  label: string;
  amount: Money;
  qualifier?: string;
}) {
  const swept = useSweptValue(amount);
  const exact = formatMoney(amount);
  return (
    <div className="flex min-w-0 flex-col gap-3 border border-hairline-strong bg-surface p-5 md:p-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">{label}</span>
      {/* Visual sweep is aria-hidden; the true value is announced immediately. */}
      <span aria-hidden="true" data-money className="break-words font-mono text-[length:var(--pc-text-result-xl)] font-medium leading-none tracking-tight tabular-nums text-ink">
        {swept}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {label}: {exact}
      </span>
      {qualifier ? <p className="text-[13px] leading-5 text-ink-2">{qualifier}</p> : null}
    </div>
  );
}

export function ResultMetric({
  label,
  amount,
  detail,
}: {
  label: string;
  amount: Money;
  detail?: string;
}) {
  return (
    <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="font-mono text-xl tabular-nums text-ink">{formatMoney(amount)}</span>
      {detail ? <span className="text-[12px] leading-4 text-ink-3">{detail}</span> : null}
    </div>
  );
}
