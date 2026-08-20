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
import { Dec, moneyFromDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { buildLoanSchedule } from "@paymentcalcs/engine-loans";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { ScheduleView } from "../home/schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "../home/loan-fields";

/**
 * AU-DEBT-001 (general/personal loan) and AU-DEBT-003 (car loan with balloon).
 * Balloon amounts here reduce the periodic repayment and fall due at term end;
 * they are shown, never hidden in a lower repayment.
 */
export function LoanCalculator({ variant }: { variant: "personal" | "car" }) {
  const entry = getRegistryEntry(variant === "car" ? "AU-DEBT-003" : "AU-DEBT-001")!;
  const [state, setState] = useState<LoanBasicsState>({ ...LOAN_BASICS_DEFAULTS, termYearsRaw: variant === "car" ? "5" : "5" });
  const [balloonRaw, setBalloonRaw] = useState("");
  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const balloon = useMemo(() => parseMoneyInput(balloonRaw), [balloonRaw]);

  // Balloon handling runs on the closed-form E11 engine via the ledger's
  // payment override: compute the balloon payment via the worker-run schedule.
  const job = useMemo(() => {
    if (!parsed.ok) return null;
    return {
      kind: "run" as const,
      input: {
        openingPrincipal: parsed.principal,
        annualRate: parsed.annualRate,
        termPeriods: parsed.termPeriods,
        repaymentFrequency: parsed.frequency,
        firstRepaymentDate: "2026-10-01",
        repaymentType: "principal_and_interest" as const,
        repaymentResetPolicy: "recalculate_to_term" as const,
        ...(variant === "car" && balloonRaw.trim() && balloon.ok
          ? { paymentOverride: undefined, events: [] }
          : { events: [] }),
      },
    };
  }, [parsed, variant, balloonRaw, balloon]);

  const { result } = useLedgerJob<SLedgerResult>(job);

  // The balloon variant runs the full §13.6-aware E11 schedule so every
  // displayed metric (repayment, interest, total, payoff) reflects the balloon.
  const balloonInfo = useMemo(() => {
    if (variant !== "car" || !balloonRaw.trim() || !balloon.ok || !parsed.ok) return null;
    const principal = new Dec(parsed.principal) as DecimalValue;
    const balloonAmount = new Dec(balloonRaw.replace(/,/g, "")) as DecimalValue;
    if (balloonAmount.greaterThanOrEqualTo(principal)) {
      return { schedule: null, balloon: null, error: "The balloon must be smaller than the loan amount." };
    }
    const schedule = buildLoanSchedule({
      principal,
      annualRate: new Dec(parsed.annualRate) as DecimalValue,
      termPeriods: parsed.termPeriods,
      frequency: parsed.frequency,
      firstPaymentDate: "2026-10-01",
      repaymentType: "principal_and_interest",
      balloon: balloonAmount,
    });
    return { schedule, balloon: balloonAmount.toFixed(2), error: null };
  }, [variant, balloonRaw, balloon, parsed]);

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
        </div>
      }
      results={
        !result ? (
          <EmptyState>Enter the loan to see repayments, total interest and the schedule.</EmptyState>
        ) : (
          <div className="nexus-result grid gap-6 p-6">
            <PrimaryResult
              label={`Repayment per ${state.frequency === "monthly" ? "month" : state.frequency === "fortnightly" ? "fortnight" : "week"}`}
              amount={moneyFromDecimalString(
                "AUD",
                balloonInfo && balloonInfo.error === null
                  ? balloonInfo.schedule!.scheduledPayment.toFixed(2)
                  : result.scheduledPaymentInitial,
                2,
              )}
              qualifier={
                balloonInfo && balloonInfo.error === null
                  ? `Plus a ${formatMajor(balloonInfo.balloon!)} balloon due at the end of the term. The balloon reduces each repayment, not the amount you owe.`
                  : `Over ${state.termYearsRaw} years at ${state.ratePctRaw || "…"}% p.a.`
              }
            />
            <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
              <ResultMetric
                label="Total interest"
                amount={moneyFromDecimalString(
                  "AUD",
                  balloonInfo && balloonInfo.error === null
                    ? balloonInfo.schedule!.totalInterest.toFixed(2)
                    : result.totalInterest,
                  2,
                )}
              />
              <ResultMetric
                label="Total paid"
                amount={moneyFromDecimalString(
                  "AUD",
                  balloonInfo && balloonInfo.error === null
                    ? balloonInfo.schedule!.totalPaid.toFixed(2)
                    : result.totalPaid,
                  2,
                )}
                detail={balloonInfo && balloonInfo.error === null ? "including the balloon at term end" : undefined}
              />
              <div className="grid gap-1 rounded-[var(--pc-radius-control)] border border-hairline bg-surface p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Paid off</span>
                <span className="font-mono text-xl tabular-nums text-ink">
                  {balloonInfo && balloonInfo.error === null
                    ? (balloonInfo.schedule!.payoffDate ?? "at term with balloon")
                    : (result.payoffDate ?? "beyond term")}
                </span>
                <span className="text-[12px] leading-4 text-ink-3">
                  {periodsToYearsLabel(
                    balloonInfo && balloonInfo.error === null ? balloonInfo.schedule!.rows.length : result.periodsUsed,
                    PPY[state.frequency],
                  )}
                </span>
              </div>
            </div>
          </div>
        )
      }
      explanation={
        result && !balloonInfo ? (
          <div className="nexus-panel-soft min-w-0 p-5 md:p-6">
            <ScheduleView result={result} calculatorId={entry.id} frequency={state.frequency} />
          </div>
        ) : null
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
