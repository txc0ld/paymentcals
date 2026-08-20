"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { SLedgerRow } from "../../lib/ledger-serialize";
import { formatMajor } from "../../lib/format-major";

const AreaChartInner = dynamic(() => import("./balance-chart-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-64 place-items-center text-[13px] text-ink-3">Loading chart…</div>
  ),
});

/**
 * §20.8: every chart carries a title, unit, accessible summary and a full
 * data-table alternative. Series colours are paired with non-colour cues.
 */
export function BalanceChart({ rows, periodsPerYear }: { rows: SLedgerRow[]; periodsPerYear: number }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const yearly = useMemo(() => {
    const byYear = new Map<string, { date: string; balance: string; offset: string; interestYtd: number }>();
    let interestRunning = 0;
    for (const row of rows) {
      interestRunning += Number.parseFloat(row.interest);
      byYear.set(row.date.slice(0, 4), {
        date: row.date,
        balance: row.closingBalance,
        offset: row.offsetBalance,
        interestYtd: interestRunning,
      });
    }
    return Array.from(byYear.entries()).map(([year, v]) => ({ year, ...v }));
  }, [rows]);

  return (
    <figure aria-label="Loan balance over time" className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
          Balance over time (AUD, end of each year)
        </figcaption>
        <button
          type="button"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          className="clay-quiet-button min-h-9 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {view === "chart" ? "View as table" : "View as chart"}
        </button>
      </div>
      <p className="sr-only">
        The loan balance declines from {formatMajor(rows[0]?.closingBalance ?? "0")} to zero across
        the schedule. A full table alternative is available with the toggle button.
      </p>
      {view === "chart" ? (
        <AreaChartInner data={yearly} />
      ) : (
        <div className="overflow-x-auto">
          <table className="clay-table w-full min-w-[360px] border-collapse text-left">
            <caption className="sr-only">Year-end loan balance and offset balance</caption>
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                <th scope="col" className="py-2 pe-4 font-normal">Year</th>
                <th scope="col" className="py-2 pe-4 text-right font-normal">Balance</th>
                <th scope="col" className="py-2 text-right font-normal">Offset</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((point) => (
                <tr key={point.year} className="border-b border-hairline">
                  <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink">{point.year}</td>
                  <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                    {formatMajor(point.balance)}
                  </td>
                  <td className="py-1.5 text-right font-mono text-[13px] tabular-nums text-ink">
                    {formatMajor(point.offset)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span className="sr-only">{periodsPerYear} repayment periods per year.</span>
    </figure>
  );
}
