"use client";

import { useMemo, useState } from "react";
import { toCsv, downloadCsv } from "@paymentcalcs/calculation-ui";
import { formatMajor } from "../../lib/format-major";
import { extremeMajor, formatSignedMajor } from "./result-parts";

/**
 * Cumulative advantage of switching, plotted straight from
 * RefinanceComparison.cumulativeDelta[]. §20.8: title, unit, accessible
 * summary and a full data-table alternative; the zero crossing is a hairline
 * rule rather than a colour, so the sign never rests on colour alone.
 *
 * Money maths stays on the serialized decimal strings (result-parts helpers);
 * only the plotted geometry is float, which never reaches a reported number.
 */

const WIDTH = 720;
const HEIGHT = 240;
const PAD_X = 8;
const PAD_Y = 16;

export function AdvantageChart({
  points,
  periodsPerYear,
  breakEvenDate,
  calculatorId,
}: {
  points: ReadonlyArray<{ date: string; delta: string }>;
  periodsPerYear: number;
  breakEvenDate: string | null;
  calculatorId: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const deltas = points.map((point) => point.delta);
    const maxIndex = extremeMajor(deltas, "max");
    const minIndex = extremeMajor(deltas, "min");
    const high = Number.parseFloat(deltas[maxIndex]!);
    const low = Number.parseFloat(deltas[minIndex]!);
    // Always include zero so the crossing is on-canvas.
    const top = Math.max(high, 0);
    const bottom = Math.min(low, 0);
    const span = top - bottom || 1;
    const x = (index: number) => PAD_X + (index / (points.length - 1)) * (WIDTH - PAD_X * 2);
    const y = (value: number) => PAD_Y + ((top - value) / span) * (HEIGHT - PAD_Y * 2);
    return {
      path: points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(Number.parseFloat(point.delta)).toFixed(1)}`).join(" "),
      zeroY: y(0),
      x,
      high: { value: deltas[maxIndex]!, date: points[maxIndex]!.date },
      low: { value: deltas[minIndex]!, date: points[minIndex]!.date },
      end: { value: deltas[deltas.length - 1]!, date: points[points.length - 1]!.date },
      breakEvenIndex: breakEvenDate ? points.findIndex((point) => point.date >= breakEvenDate) : -1,
    };
  }, [points, breakEvenDate]);

  /** ~5 evenly spaced ticks, labelled in months elapsed at any frequency. */
  const ticks = useMemo(() => {
    if (!geometry || points.length < 2) return [];
    const count = 4;
    return Array.from({ length: count + 1 }, (_, step) => {
      const index = Math.round((step / count) * (points.length - 1));
      return { index, months: Math.round((index * 12) / periodsPerYear), x: geometry.x(index) };
    });
  }, [geometry, points.length, periodsPerYear]);

  /** Year-end sampling: the table alternative, not a second calculation. */
  const yearly = useMemo(() => {
    const byYear = new Map<string, { date: string; delta: string; months: number }>();
    points.forEach((point, index) => {
      byYear.set(point.date.slice(0, 4), {
        date: point.date,
        delta: point.delta,
        months: Math.round((index * 12) / periodsPerYear),
      });
    });
    return Array.from(byYear.entries()).map(([year, value]) => ({ year, ...value }));
  }, [points, periodsPerYear]);

  if (!geometry) return null;

  const summary = `Cumulative advantage of switching, in Australian dollars, from the switch date to the common horizon. It starts at ${formatSignedMajor(points[0]!.delta)}, reaches a low of ${formatSignedMajor(geometry.low.value)} and a high of ${formatSignedMajor(geometry.high.value)}, and ends at ${formatSignedMajor(geometry.end.value)}. ${
    breakEvenDate ? `It crosses zero for good on ${breakEvenDate}.` : "It never stays above zero within the horizon."
  }`;

  function exportCsv() {
    downloadCsv(
      `${calculatorId.toLowerCase()}-cumulative-advantage.csv`,
      toCsv(["date", "months_elapsed", "cumulative_advantage"], points.map((point, index) => [point.date, Math.round((index * 12) / periodsPerYear), point.delta])),
    );
  }

  return (
    <figure aria-label="Cumulative advantage of switching over time" className="@container grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <figcaption className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
          Cumulative advantage (AUD, per repayment)
        </figcaption>
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="nexus-quiet-button min-h-11 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {view === "chart" ? "View as table" : "View as chart"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="nexus-quiet-button min-h-11 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Export series (CSV)
          </button>
        </span>
      </div>
      {view === "chart" ? (
        <div className="grid min-w-0 gap-2">
          <svg
            role="img"
            aria-label={summary}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="h-56 w-full"
          >
            {/* Zero axis: a hairline rule, so "ahead" and "behind" read
              * without relying on the line colour. */}
            <line
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={geometry.zeroY}
              y2={geometry.zeroY}
              stroke="var(--pc-hairline-strong)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {geometry.breakEvenIndex >= 0 ? (
              <line
                x1={geometry.x(geometry.breakEvenIndex)}
                x2={geometry.x(geometry.breakEvenIndex)}
                y1={PAD_Y}
                y2={HEIGHT - PAD_Y}
                stroke="var(--pc-hairline-strong)"
                strokeWidth="1"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            <path
              d={geometry.path}
              fill="none"
              stroke="var(--pc-accent)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex justify-between font-mono text-[10px] tabular-nums text-ink-3">
            {ticks.map((tick) => (
              <span key={tick.index}>{tick.months}m</span>
            ))}
          </div>
          <p className="text-[12px] leading-5 text-ink-3">
            Above the hairline the refinanced loan is ahead; below it the current loan is ahead.
            {breakEvenDate ? ` The dashed rule marks the sustained crossing on ${breakEvenDate}.` : " No sustained crossing occurs within the horizon."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="nexus-table w-full min-w-[360px] border-collapse text-left">
            <caption className="sr-only">
              Cumulative advantage of switching at the end of each year, with months elapsed
            </caption>
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th scope="col" className="py-2 pe-4 font-normal">Year</th>
                <th scope="col" className="py-2 pe-4 text-right font-normal">Months</th>
                <th scope="col" className="py-2 text-right font-normal">Cumulative advantage</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((point) => (
                <tr key={point.year} className="border-b border-hairline">
                  <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink">{point.year}</td>
                  <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">{point.months}</td>
                  <td className="py-1.5 text-right font-mono text-[13px] tabular-nums text-ink">
                    {formatSignedMajor(point.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <dl className="grid gap-4 border-t border-hairline pt-4 @sm:grid-cols-3">
        {[
          { term: "Deepest point", point: geometry.low },
          { term: "Highest point", point: geometry.high },
          { term: "At the horizon", point: geometry.end },
        ].map(({ term, point }) => (
          <div key={term} className="grid min-w-0 gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{term}</dt>
            <dd className="break-words font-mono text-[15px] tabular-nums text-ink">
              {formatSignedMajor(point.value)}
              <span className="ps-2 text-[12px] text-ink-3">{point.date}</span>
            </dd>
          </div>
        ))}
      </dl>
      <span className="sr-only">
        The hairline sits at {formatMajor("0")}: the point where the two loans have cost the same in
        cash to date. Every point is one repayment period.
      </span>
    </figure>
  );
}
