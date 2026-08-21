"use client";

import { useMemo } from "react";
import { analytics } from "../../lib/analytics";
import { formatMajor } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { BalanceChart } from "./balance-chart";
import { PanelHeading, diffMajor, sumMajor } from "./result-parts";
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
  // Year-end subtotals summed exactly on the serialized decimal strings.
  const yearly = useMemo(() => {
    const groups = new Map<
      string,
      { periods: number; interest: string[]; paid: string[]; closing: string }
    >();
    for (const row of result.rows) {
      const year = row.date.slice(0, 4);
      const group = groups.get(year) ?? { periods: 0, interest: [], paid: [], closing: row.closingBalance };
      group.periods += 1;
      group.interest.push(row.interest);
      group.paid.push(row.payment, row.extraPayment);
      group.closing = row.closingBalance;
      groups.set(year, group);
    }
    let interestToDate = "0.00";
    return Array.from(groups.entries()).map(([year, group]) => {
      const interest = sumMajor(group.interest);
      const payments = sumMajor(group.paid);
      interestToDate = sumMajor([interestToDate, interest]);
      return {
        year,
        periods: group.periods,
        interest,
        payments,
        principal: diffMajor(payments, interest),
        closing: group.closing,
        interestToDate,
      };
    });
  }, [result.rows]);

  // Totals are the sum of the rows above them, so the column always reconciles
  // with what is on screen. Fees sit outside these columns (see the note below).
  const totals = useMemo(() => {
    const last = yearly[yearly.length - 1];
    if (!last) return null;
    const payments = sumMajor(yearly.map((group) => group.payments));
    const interest = sumMajor(yearly.map((group) => group.interest));
    return { payments, interest, principal: diffMajor(payments, interest), closing: last.closing };
  }, [yearly]);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PanelHeading>Schedule by year ({result.rows.length} repayments)</PanelHeading>
        <button
          type="button"
          onClick={exportCsv}
          className="nexus-quiet-button min-h-11 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Export full schedule (CSV)
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="nexus-table w-full min-w-[680px] border-collapse text-left">
          <caption className="sr-only">
            Year-end subtotals of payments, interest and principal, with the interest paid to date
            and the closing balance, followed by the totals over the whole loan
          </caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <th scope="col" className="py-2 pe-4 font-normal">Year</th>
              <th scope="col" className="hidden py-2 pe-4 text-right font-normal sm:table-cell">Payments</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">Principal</th>
              <th scope="col" className="hidden py-2 pe-4 text-right font-normal sm:table-cell">Interest to date</th>
              <th scope="col" className="py-2 text-right font-normal">Closing balance</th>
            </tr>
          </thead>
          <tbody>
            {yearly.map((group) => (
              <tr key={group.year} className="border-b border-hairline">
                <th scope="row" className="py-2 pe-4 font-mono text-[13px] font-normal tabular-nums text-ink">
                  {group.year}
                  <span className="ps-2 text-[11px] text-ink-3">
                    {group.periods}
                    <span className="sr-only"> repayments</span>
                  </span>
                </th>
                <td className="hidden py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink sm:table-cell">
                  {formatMajor(group.payments)}
                </td>
                <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.interest)}
                </td>
                <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.principal)}
                </td>
                <td className="hidden py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2 sm:table-cell">
                  {formatMajor(group.interestToDate)}
                </td>
                <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(group.closing)}
                </td>
              </tr>
            ))}
          </tbody>
          {totals ? (
            <tfoot>
              <tr className="border-t-2 border-hairline-strong">
                <th scope="row" className="py-2 pe-4 font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-ink-2">
                  Whole loan
                </th>
                <td className="hidden py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink sm:table-cell">
                  {formatMajor(totals.payments)}
                </td>
                <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(totals.interest)}
                </td>
                <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                  {formatMajor(totals.principal)}
                </td>
                <td className="hidden py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2 sm:table-cell">
                  {formatMajor(totals.interest)}
                </td>
                <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                  {formatMajor(totals.closing)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      <p className="text-[12px] leading-5 text-ink-3">
        Each row is a year-end subtotal of the underlying per-repayment schedule, with that year's
        repayment count beside the year; the CSV export contains every repayment with dates and
        rates.
        {result.totalFees === "0.00"
          ? " "
          : ` Payments and principal exclude fees; ${formatMajor(result.totalFees)} in fees over the loan is reported separately. `}
        Reconciliation{" "}
        {result.reconciliationPassed ? "passed for every period." : "FAILED — this result is not valid."}
      </p>
    </div>
  );
}
