"use client";

import { useMemo } from "react";
import type { LedgerEvent } from "@paymentcalcs/engine-mortgage-ledger";
import type { LoanFrequencyKind } from "@paymentcalcs/engine-loans";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SCompareResult, SLedgerResult } from "../../lib/ledger-serialize";
import { useLedgerJob } from "../../lib/use-ledger";
import { PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";
import { diffMajor, divideMajor, formatSignedMajor, sumMajor } from "./result-parts";
import { FIRST_REPAYMENT_DATE } from "./working-notes";

/**
 * Multi-run side comparisons for the mortgage cluster. Each row is a separate
 * ledger job on its own worker (several `useLedgerJob` instances per route), so
 * a row whose job has not returned yet renders "—" rather than a number left
 * over from the previous inputs.
 *
 * The AU-HOME-001 panels are mounted only while their disclosure is open —
 * nine idle workers is not a cost to pay before the comparison is asked for.
 */

const CYCLE_LABEL: Record<LoanFrequencyKind, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
};

const FREQUENCIES: readonly LoanFrequencyKind[] = ["weekly", "fortnightly", "monthly"];

/** One `run` job built from a loan-basics state; null whenever it does not parse. */
function useLoanRun(state: LoanBasicsState, events: LedgerEvent[]) {
  const job = useMemo(() => {
    const parsed = parseLoanBasics(state);
    if (!parsed.ok) return null;
    return {
      kind: "run" as const,
      input: {
        openingPrincipal: parsed.principal,
        annualRate: parsed.annualRate,
        termPeriods: parsed.termPeriods,
        repaymentFrequency: parsed.frequency,
        firstRepaymentDate: FIRST_REPAYMENT_DATE,
        repaymentType: "principal_and_interest" as const,
        interestOnlyPeriods: parsed.ioPeriods,
        repaymentResetPolicy: "recalculate_to_term" as const,
        events,
      },
    };
  }, [state, events]);
  return useLedgerJob<SLedgerResult>(job).result;
}

function HeadCell({ children, align = "right" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`py-2 pe-4 font-normal ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

function Amount({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className={`py-2 pe-4 text-right font-mono text-[13px] tabular-nums ${muted ? "text-ink-2" : "text-ink"}`}>
      {children}
    </td>
  );
}

/** Weekly / fortnightly / monthly on identical facts (MORT §12.5). */
export function FrequencyComparison({ state, events }: { state: LoanBasicsState; events: LedgerEvent[] }) {
  const weeklyState = useMemo(() => ({ ...state, frequency: "weekly" as const }), [state]);
  const fortnightlyState = useMemo(() => ({ ...state, frequency: "fortnightly" as const }), [state]);
  const monthlyState = useMemo(() => ({ ...state, frequency: "monthly" as const }), [state]);

  const weekly = useLoanRun(weeklyState, events);
  const fortnightly = useLoanRun(fortnightlyState, events);
  const monthly = useLoanRun(monthlyState, events);

  const rows = FREQUENCIES.map((frequency) => ({
    frequency,
    result: frequency === "weekly" ? weekly : frequency === "fortnightly" ? fortnightly : monthly,
  }));

  return (
    <div className="grid min-w-0 gap-4">
      <div className="overflow-x-auto">
        <table className="nexus-table w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">
            Scheduled repayment, interest over the loan and payoff date at weekly, fortnightly and
            monthly repayment frequencies, on the same loan amount, rate and term
          </caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <HeadCell align="left">Frequency</HeadCell>
              <HeadCell>Repayment</HeadCell>
              <HeadCell>Interest over the loan</HeadCell>
              <HeadCell>vs monthly</HeadCell>
              <HeadCell>Payoff date</HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ frequency, result }) => (
              <tr key={frequency} className="border-b border-hairline">
                <th scope="row" className="py-2 pe-4 text-[13px] font-normal text-ink-2">
                  {CYCLE_LABEL[frequency]}
                  {frequency === state.frequency ? (
                    <span className="ps-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                      selected
                    </span>
                  ) : null}
                </th>
                <Amount>{result ? formatMajor(result.scheduledPaymentInitial) : "—"}</Amount>
                <Amount>{result ? formatMajor(result.totalInterest) : "—"}</Amount>
                <Amount muted>
                  {result && monthly ? formatSignedMajor(diffMajor(result.totalInterest, monthly.totalInterest)) : "—"}
                </Amount>
                <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                  {result ? (
                    <>
                      {result.payoffDate ?? "beyond term"}
                      <span className="ps-2 text-[11px] text-ink-3">
                        {periodsToYearsLabel(result.periodsUsed, PPY[frequency])}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] leading-5 text-ink-3">
        Every row runs the same loan amount, rate, term in years and fees; only the repayment cycle
        changes. Each cycle accrues interest once per period, so a shorter cycle both accrues more
        often and, at 26 fortnights or 52 weeks a year, moves more money in a calendar year than 12
        monthly repayments of the same size. A dash means that run has not finished yet.
      </p>
    </div>
  );
}

/** ±0.25 / ±0.50 / ±1.00 percentage points around the entered rate. */
const STEPS = [-1, -0.5, -0.25, 0.25, 0.5, 1] as const;

function shiftedState(state: LoanBasicsState, step: number): LoanBasicsState {
  const base = Number.parseFloat(state.ratePctRaw);
  if (!Number.isFinite(base)) return { ...state, ratePctRaw: "" };
  // Rate arithmetic, not money arithmetic: a percentage-point step, rendered
  // to 2dp before it re-enters the parser as a rate string.
  return { ...state, ratePctRaw: (base + step).toFixed(2) };
}

function signedPp(step: number): string {
  return `${step > 0 ? "+" : "−"}${Math.abs(step).toFixed(2)} pp`;
}

export function RateSensitivityLadder({
  state,
  events,
  anchor,
}: {
  state: LoanBasicsState;
  events: LedgerEvent[];
  /** The run already on screen, used as the zero-step reference. */
  anchor: SLedgerResult | null;
}) {
  const s0 = useMemo(() => shiftedState(state, STEPS[0]), [state]);
  const s1 = useMemo(() => shiftedState(state, STEPS[1]), [state]);
  const s2 = useMemo(() => shiftedState(state, STEPS[2]), [state]);
  const s3 = useMemo(() => shiftedState(state, STEPS[3]), [state]);
  const s4 = useMemo(() => shiftedState(state, STEPS[4]), [state]);
  const s5 = useMemo(() => shiftedState(state, STEPS[5]), [state]);

  const r0 = useLoanRun(s0, events);
  const r1 = useLoanRun(s1, events);
  const r2 = useLoanRun(s2, events);
  const r3 = useLoanRun(s3, events);
  const r4 = useLoanRun(s4, events);
  const r5 = useLoanRun(s5, events);

  const base = Number.parseFloat(state.ratePctRaw);
  const step = (index: 0 | 1 | 2 | 3 | 4 | 5, shifted: LoanBasicsState, result: SLedgerResult | null) => ({
    key: String(STEPS[index]),
    label: signedPp(STEPS[index]),
    rate: shifted.ratePctRaw,
    result,
    selected: false,
  });

  const rows: Array<{ key: string; label: string; rate: string; result: SLedgerResult | null; selected: boolean }> = [
    step(0, s0, r0),
    step(1, s1, r1),
    step(2, s2, r2),
    {
      key: "0",
      label: "Entered rate",
      rate: Number.isFinite(base) ? base.toFixed(2) : state.ratePctRaw,
      result: anchor,
      selected: true,
    },
    step(3, s3, r3),
    step(4, s4, r4),
    step(5, s5, r5),
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <div className="overflow-x-auto">
        <table className="nexus-table w-full min-w-[520px] border-collapse text-left">
          <caption className="sr-only">
            Repayment and interest over the loan at a quarter, a half and a full percentage point
            either side of the entered rate, with the interest difference against the entered rate
          </caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <HeadCell align="left">Rate move</HeadCell>
              <HeadCell>Rate</HeadCell>
              <HeadCell>Repayment</HeadCell>
              <HeadCell>Interest over the loan</HeadCell>
              <HeadCell>Interest difference</HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={`border-b border-hairline ${row.selected ? "bg-surface" : ""}`}>
                <th scope="row" className="py-2 pe-4 font-mono text-[13px] font-normal tabular-nums text-ink-2">
                  {row.label}
                  {row.selected ? (
                    <span className="ps-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                      selected
                    </span>
                  ) : null}
                </th>
                <Amount muted>{/^\d+(\.\d+)?$/.test(row.rate) ? `${row.rate}%` : "—"}</Amount>
                <Amount>{row.result ? formatMajor(row.result.scheduledPaymentInitial) : "—"}</Amount>
                <Amount>{row.result ? formatMajor(row.result.totalInterest) : "—"}</Amount>
                <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                  {row.result && anchor
                    ? row.selected
                      ? "—"
                      : formatSignedMajor(diffMajor(row.result.totalInterest, anchor.totalInterest))
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] leading-5 text-ink-3">
        Each row is a full re-run of the schedule at that rate, held at that rate for the whole term
        — not a rate change part-way through, which the rate change calculator models instead. Rows
        that would fall below zero per cent are not run. A dash means that run has not finished yet.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AU-HOME-004 — the extra-repayment plateau                           */
/* ------------------------------------------------------------------ */

/** Per-period extra amounts the plateau table walks. */
const PLATEAU_AMOUNTS = ["50", "100", "250", "500"] as const;

/** One `compare` job (scenario vs the same loan without the extras). */
function useLoanCompare(state: LoanBasicsState, events: LedgerEvent[], offsetOpening: string) {
  const job = useMemo(() => {
    const parsed = parseLoanBasics(state);
    if (!parsed.ok) return null;
    return {
      kind: "compare" as const,
      input: {
        openingPrincipal: parsed.principal,
        annualRate: parsed.annualRate,
        termPeriods: parsed.termPeriods,
        repaymentFrequency: parsed.frequency,
        firstRepaymentDate: FIRST_REPAYMENT_DATE,
        repaymentType: "principal_and_interest" as const,
        interestOnlyPeriods: parsed.ioPeriods,
        repaymentResetPolicy: "keep_amount" as const,
        offsetOpeningBalance: offsetOpening,
        events,
      },
    };
  }, [state, events, offsetOpening]);
  return useLedgerJob<SCompareResult>(job).result;
}

function useExtraEvents(amount: string, startDate: string): LedgerEvent[] {
  return useMemo(() => [{ type: "extra_recurring", startDate, amount }], [amount, startDate]);
}

export function ExtraRepaymentPlateau({
  state,
  startDate,
  entered,
}: {
  state: LoanBasicsState;
  startDate: string;
  /** The amount already typed in, marked in the table when it is one of the steps. */
  entered: string;
}) {
  const e0 = useExtraEvents(PLATEAU_AMOUNTS[0], startDate);
  const e1 = useExtraEvents(PLATEAU_AMOUNTS[1], startDate);
  const e2 = useExtraEvents(PLATEAU_AMOUNTS[2], startDate);
  const e3 = useExtraEvents(PLATEAU_AMOUNTS[3], startDate);

  const c0 = useLoanCompare(state, e0, "0");
  const c1 = useLoanCompare(state, e1, "0");
  const c2 = useLoanCompare(state, e2, "0");
  const c3 = useLoanCompare(state, e3, "0");

  const rows = [
    { amount: PLATEAU_AMOUNTS[0], compared: c0 },
    { amount: PLATEAU_AMOUNTS[1], compared: c1 },
    { amount: PLATEAU_AMOUNTS[2], compared: c2 },
    { amount: PLATEAU_AMOUNTS[3], compared: c3 },
  ];

  return (
    <div className="grid min-w-0 gap-4">
      <div className="overflow-x-auto">
        <table className="nexus-table w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">
            Interest saved, how much sooner the loan is paid off, the payoff date and the interest
            saved per dollar, for extra repayments of fifty, one hundred, two hundred and fifty and
            five hundred dollars each repayment period
          </caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <HeadCell align="left">Extra per period</HeadCell>
              <HeadCell>Interest saved</HeadCell>
              <HeadCell>Paid off sooner by</HeadCell>
              <HeadCell>Payoff date</HeadCell>
              <HeadCell>Saved per extra dollar</HeadCell>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ amount, compared }) => (
              <tr key={amount} className="border-b border-hairline">
                <th scope="row" className="py-2 pe-4 font-mono text-[13px] font-normal tabular-nums text-ink-2">
                  {formatMajor(amount)}
                  {entered.trim().replace(/,/g, "") === amount ? (
                    <span className="ps-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                      entered
                    </span>
                  ) : null}
                </th>
                <Amount>{compared ? formatMajor(compared.interestSaved) : "—"}</Amount>
                <Amount muted>
                  {compared ? periodsToYearsLabel(compared.periodsSaved, PPY[state.frequency]) : "—"}
                </Amount>
                <Amount muted>{compared ? (compared.scenario.payoffDate ?? "beyond term") : "—"}</Amount>
                <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                  {compared ? savedPerDollar(compared) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] leading-5 text-ink-3">
        Each row is a full schedule run with that extra repayment from {startDate}, against the same
        loan with no extras on identical dates. The last column divides the interest saved by the
        total extra actually paid before payoff, which is where the plateau shows: past a point,
        each additional dollar buys less saved interest than the one before it. A dash means that
        run has not finished yet.
      </p>
    </div>
  );
}

/** Interest saved ÷ extra actually paid, exactly, on the serialized strings. */
function savedPerDollar(compared: SCompareResult): string {
  const extraPaid = sumMajor(compared.scenario.rows.map((row) => row.extraPayment));
  const ratio = divideMajor(compared.interestSaved, extraPaid);
  return ratio === null ? "—" : `${formatMajor(ratio)} per $1`;
}
