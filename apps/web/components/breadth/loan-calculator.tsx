"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  UniversalDisclosure,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { buildLoanSchedule } from "@paymentcalcs/engine-loans";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SCompareResult, SLedgerResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { ScheduleView } from "../home/schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "../home/loan-fields";

const FIRST_PAYMENT_DATE = "2026-10-01";

const PERIOD_NOUN: Record<"weekly" | "fortnightly" | "monthly", string> = {
  weekly: "week",
  fortnightly: "fortnight",
  monthly: "month",
};

/** Cost-of-credit ledger row: label plus an already-computed major-unit string. */
function CostRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-2 last:border-b-0">
      <span className="min-w-0 text-[13px] leading-5 text-ink-2">
        {label}
        {detail ? <span className="block text-[12px] leading-4 text-ink-3">{detail}</span> : null}
      </span>
      <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">{formatMajor(value)}</span>
    </div>
  );
}

/**
 * AU-DEBT-001 (general/personal loan) and AU-DEBT-003 (car loan with balloon).
 * Balloon amounts here reduce the periodic repayment and fall due at term end;
 * they are shown, never hidden in a lower repayment.
 */
export function LoanCalculator({ variant }: { variant: "personal" | "car" }) {
  const entry = getRegistryEntry(variant === "car" ? "AU-DEBT-003" : "AU-DEBT-001")!;
  const [state, setState] = useState<LoanBasicsState>({ ...LOAN_BASICS_DEFAULTS, termYearsRaw: variant === "car" ? "5" : "5" });
  const [balloonRaw, setBalloonRaw] = useState("");
  const [extraRaw, setExtraRaw] = useState("");
  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const balloon = useMemo(() => parseMoneyInput(balloonRaw), [balloonRaw]);
  const extra = useMemo(() => parseMoneyInput(extraRaw), [extraRaw]);

  // The extra repayment is a local what-if only: an empty field reproduces the
  // plain schedule exactly, and nothing here touches the share URL.
  const extraAmount = useMemo(() => {
    if (extraRaw.trim() === "" || !extra.ok) return null;
    const value = moneyToDecimalString(extra.money);
    return new Dec(value).greaterThan(0) ? value : null;
  }, [extraRaw, extra]);

  // Balloon handling runs on the closed-form E11 engine via the ledger's
  // payment override: compute the balloon payment via the worker-run schedule.
  const job = useMemo(() => {
    if (!parsed.ok) return null;
    const input = {
      openingPrincipal: parsed.principal,
      annualRate: parsed.annualRate,
      termPeriods: parsed.termPeriods,
      repaymentFrequency: parsed.frequency,
      firstRepaymentDate: FIRST_PAYMENT_DATE,
      repaymentType: "principal_and_interest" as const,
      repaymentResetPolicy: "recalculate_to_term" as const,
    };
    if (extraAmount === null) return { kind: "run" as const, input: { ...input, events: [] } };
    return {
      kind: "compare" as const,
      input: {
        ...input,
        events: [
          { type: "extra_recurring" as const, startDate: FIRST_PAYMENT_DATE, amount: extraAmount },
        ],
      },
    };
  }, [parsed, extraAmount]);

  const { result: jobResult } = useLedgerJob<SLedgerResult | SCompareResult>(job);
  // "compare" returns scenario + baseline; the headline always reads the
  // baseline so the displayed loan is the loan as contracted.
  const comparison = jobResult && "baseline" in jobResult ? jobResult : null;
  const result: SLedgerResult | null = comparison
    ? comparison.baseline
    : ((jobResult as SLedgerResult | null) ?? null);

  // The balloon variant runs the full §13.6-aware E11 schedule so every
  // displayed metric (repayment, interest, total, payoff) reflects the balloon.
  const balloonInfo = useMemo(() => {
    if (variant !== "car" || !balloonRaw.trim() || !balloon.ok || !parsed.ok) return null;
    const principal = new Dec(parsed.principal) as DecimalValue;
    const balloonAmount = new Dec(balloonRaw.replace(/,/g, "")) as DecimalValue;
    if (balloonAmount.greaterThanOrEqualTo(principal)) {
      return {
        schedule: null,
        withExtra: null,
        balloon: null,
        error: "The balloon must be smaller than the loan amount.",
      };
    }
    const base = {
      principal,
      annualRate: new Dec(parsed.annualRate) as DecimalValue,
      termPeriods: parsed.termPeriods,
      frequency: parsed.frequency,
      firstPaymentDate: FIRST_PAYMENT_DATE,
      repaymentType: "principal_and_interest" as const,
      balloon: balloonAmount,
    };
    const schedule = buildLoanSchedule(base);
    // Same engine, same inputs, extra repayment added: the pair is internally
    // consistent, so the saving is a difference of two comparable runs.
    const withExtra =
      extraAmount === null
        ? null
        : buildLoanSchedule({ ...base, extraPerPeriod: new Dec(extraAmount) as DecimalValue });
    return { schedule, withExtra, balloon: balloonAmount.toFixed(2), error: null };
  }, [variant, balloonRaw, balloon, parsed, extraAmount]);

  const balloonActive = balloonInfo !== null && balloonInfo.error === null;
  const balloonSchedule = balloonActive ? balloonInfo.schedule! : null;

  // Total cost of credit, from whichever schedule drives the headline.
  const costOfCredit = useMemo(() => {
    if (balloonSchedule) {
      return {
        principal: balloonSchedule.totalPrincipal.toFixed(2),
        interest: balloonSchedule.totalInterest.toFixed(2),
        fees: balloonSchedule.totalFees.toFixed(2),
        total: balloonSchedule.totalPaid.toFixed(2),
      };
    }
    if (!result || !parsed.ok) return null;
    const interest = new Dec(result.totalInterest);
    const fees = new Dec(result.totalFees);
    const principal = new Dec(result.totalPaid).minus(interest).minus(fees);
    return {
      principal: principal.toFixed(2),
      interest: interest.toFixed(2),
      fees: fees.toFixed(2),
      total: new Dec(result.totalPaid).toFixed(2),
    };
  }, [balloonSchedule, result, parsed]);

  // Extra-repayment saving: interest and periods avoided, from two runs of the
  // same engine on the same inputs.
  const saving = useMemo(() => {
    if (extraAmount === null) return null;
    if (balloonActive) {
      const withExtra = balloonInfo.withExtra;
      if (!withExtra || !balloonSchedule) return null;
      return {
        interestSaved: balloonSchedule.totalInterest.minus(withExtra.totalInterest).toFixed(2),
        periodsSaved: balloonSchedule.rows.length - withExtra.rows.length,
        newInterest: withExtra.totalInterest.toFixed(2),
        newPayoffDate: withExtra.payoffDate,
        periodsUsed: withExtra.rows.length,
      };
    }
    if (!comparison) return null;
    return {
      interestSaved: comparison.interestSaved,
      periodsSaved: comparison.periodsSaved,
      newInterest: comparison.scenario.totalInterest,
      newPayoffDate: comparison.scenario.payoffDate,
      periodsUsed: comparison.scenario.periodsUsed,
    };
  }, [extraAmount, balloonActive, balloonInfo, balloonSchedule, comparison]);

  const periodNoun = PERIOD_NOUN[state.frequency];

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
            periodLabel: "Scheduled model",
            calculationClass: entry.calculationClass,
            ruleStatus: { label: "No statutory rules required", tone: "neutral" },
          }}
        />
      }
      inputs={
        <div className="grid gap-6">
          <LoanBasicsFields state={state} onChange={(patch) => setState((s) => ({ ...s, ...patch }))} errors={parsed.errors} />
          {variant === "car" ? (
            <MoneyField
              id="loan-balloon"
              label="Balloon / residual payment"
              description="A lump owed at the end of the term. It lowers the repayment but not the total cost."
              value={balloonRaw}
              onChange={setBalloonRaw}
              error={
                balloonInfo && "error" in balloonInfo && balloonInfo.error
                  ? balloonInfo.error
                  : !balloon.ok && balloon.error
                    ? balloon.error
                    : undefined
              }
            />
          ) : null}
          <MoneyField
            id="loan-extra"
            label={`Extra repayment per ${periodNoun}`}
            description="Optional what-if. Leave empty for the contracted repayment only."
            value={extraRaw}
            onChange={setExtraRaw}
            error={!extra.ok && extra.error ? extra.error : undefined}
          />
        </div>
      }
      results={
        !result && !balloonSchedule ? (
          <EmptyState>Enter the loan to see repayments, total interest and the schedule.</EmptyState>
        ) : (
          <div className="nexus-result grid min-w-0 gap-6 p-6 md:p-8">
            <PrimaryResult
              label={`Repayment per ${periodNoun}`}
              amount={moneyFromDecimalString(
                "AUD",
                balloonSchedule ? balloonSchedule.scheduledPayment.toFixed(2) : result!.scheduledPaymentInitial,
                2,
              )}
              qualifier={
                balloonSchedule
                  ? `Plus a ${formatMajor(balloonInfo!.balloon!)} balloon due at the end of the term. The balloon reduces each repayment, not the amount you owe.`
                  : `Over ${state.termYearsRaw} years at ${state.ratePctRaw || "…"}% p.a.`
              }
            />
            <div className="grid gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
              <ResultMetric
                label="Total interest"
                amount={moneyFromDecimalString(
                  "AUD",
                  balloonSchedule ? balloonSchedule.totalInterest.toFixed(2) : result!.totalInterest,
                  2,
                )}
              />
              <ResultMetric
                label="Total paid"
                amount={moneyFromDecimalString(
                  "AUD",
                  balloonSchedule ? balloonSchedule.totalPaid.toFixed(2) : result!.totalPaid,
                  2,
                )}
                detail={balloonSchedule ? "including the balloon at term end" : undefined}
              />
              <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Paid off</span>
                <span className="font-mono text-xl tabular-nums text-ink">
                  {balloonSchedule
                    ? (balloonSchedule.payoffDate ?? "at term with balloon")
                    : (result!.payoffDate ?? "beyond term")}
                </span>
                <span className="text-[12px] leading-4 text-ink-3">
                  {periodsToYearsLabel(
                    balloonSchedule ? balloonSchedule.rows.length : result!.periodsUsed,
                    PPY[state.frequency],
                  )}
                </span>
              </div>
            </div>
            {costOfCredit ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  Total cost of credit
                </h3>
                <div className="nexus-panel-soft grid min-w-0 px-4 py-2">
                  <CostRow label="Principal repaid" value={costOfCredit.principal} />
                  <CostRow label="Interest charged" value={costOfCredit.interest} />
                  {new Dec(costOfCredit.fees).greaterThan(0) ? (
                    <CostRow label="Fees charged" value={costOfCredit.fees} />
                  ) : null}
                  {balloonSchedule ? (
                    <CostRow
                      label="of which balloon at term end"
                      value={balloonInfo!.balloon!}
                      detail="already counted inside the principal repaid"
                    />
                  ) : null}
                  <CostRow label="Total paid over the loan" value={costOfCredit.total} />
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  Principal, interest and fees sum to the total paid, and all of them come from the
                  same schedule as the repayment and payoff date above.
                </p>
              </div>
            ) : null}
            {saving ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  {/* Accent used as a rule, never as small coloured text. */}
                  <span aria-hidden="true" className="h-0.5 w-6 shrink-0 bg-accent" />
                  With {formatMajor(extraAmount!)} extra per {periodNoun}
                </h3>
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <ResultMetric
                    label="Interest saved"
                    amount={moneyFromDecimalString("AUD", saving.interestSaved, 2)}
                    detail={`interest falls to ${formatMajor(saving.newInterest)}`}
                  />
                  <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Time saved</span>
                    <span className="font-mono text-xl tabular-nums text-ink">
                      {periodsToYearsLabel(Math.max(0, saving.periodsSaved), PPY[state.frequency])}
                    </span>
                    <span className="text-[12px] leading-4 text-ink-3">
                      {saving.newPayoffDate
                        ? `paid off ${saving.newPayoffDate}`
                        : "still beyond the contracted term"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      }
      explanation={
        result && !balloonSchedule ? (
          <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
            <ScheduleView result={result} calculatorId={entry.id} frequency={state.frequency} />
          </div>
        ) : null
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
