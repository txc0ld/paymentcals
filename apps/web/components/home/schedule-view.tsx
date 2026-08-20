"use client";

import { useMemo } from "react";
import { analytics } from "../../lib/analytics";
import { formatMajor } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { BalanceChart } from "./balance-chart";
import { PPY } from "./loan-fields";

/** Yearly-aggregated schedule with CSV export (MORT-AC-009) and chart. */
export function ScheduleView({
  result,
  calculatorId,
  frequency,
}: {
  result: SLedgerResult;
  calculatorId: string;
  frequency: keyof typeof PPY;
}) {
  const yearly = useMemo(() => {
    const groups = new Map<
      string,
      { interest: number; principal: number; payments: number; fees: number; closing: string }
    >();
    for (const row of result.rows) {
      const year = row.date.slice(0, 4);
      const group = groups.get(year) ?? { interest: 0, principal: 0, payments: 0, fees: 0, closing: row.closingBalance };
      group.interest += Number.parseFloat(row.interest);
      group.payments += Number.parseFloat(row.payment) + Number.parseFloat(row.extraPayment);
      group.principal +=
        Number.parseFloat(row.payment) + Number.parseFloat(row.extraPayment) - Number.parseFloat(row.interest);
      group.fees += Number.parseFloat(row.fees);
      group.closing = row.closingBalance;
      groups.set(year, group);
    }
    return Array.from(groups.entries());
  }, [result.rows]);

  function exportCsv() {
    const header = "period,date,annual_rate,payment,extra_payment,interest,fees,offset_balance,closing_balance";
    const lines = result.rows.map(
      (row) =>
        `${row.period},${row.date},${row.annualRate},${row.payment},${row.extraPayment},${row.interest},${row.fees},${row.offsetBalance},${row.closingBalance}`,
    );
    const blob = new Blob([`${header}\n${lines.join("\n")}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${calculatorId.toLowerCase()}-schedule.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    analytics.track("scenario_action", { calculator_id: calculatorId, action: "export_csv" });
  }

  return (
    <div className="grid min-w-0 gap-6">
      <BalanceChart rows={result.rows} periodsPerYear={PPY[frequency]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2">
          Schedule by year ({result.rows.length} repayments)
        </h3>
        <button
          type="button"
          onClick={exportCsv}
          className="nexus-quiet-button min-h-11 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Export full schedule (CSV)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="nexus-table w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">Yearly totals of payments, interest and closing balance</caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <th scope="col" className="py-2 pe-4 font-normal">Year</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Payments</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Principal</th>
              <th scope="col" className="py-2 text-right font-normal">Closing balance</th>
            </tr>
          </thead>
          <tbody>
            {yearly.map(([year, group]) => (
              <tr key={year} className="border-b border-hairline">
                <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink">{year}</td>
                <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.payments.toFixed(2))}
                </td>
                <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.interest.toFixed(2))}
                </td>
                <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.principal.toFixed(2))}
                </td>
                <td className="py-1.5 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.closing)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] leading-5 text-ink-3">
        Yearly rows aggregate the underlying per-repayment schedule; the CSV export contains every
        repayment with dates and rates. Reconciliation{" "}
        {result.reconciliationPassed ? "passed for every period." : "FAILED — this result is not valid."}
      </p>
    </div>
  );
}
