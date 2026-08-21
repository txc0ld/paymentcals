"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import type { LedgerEvent } from "@paymentcalcs/engine-mortgage-ledger";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SCompareResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { MortgageDisclosure } from "./mortgage-disclosure";
import { MetricCell } from "./result-parts";
import { ScheduleView } from "./schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";

export type SavingsVariant = "extra_repayments" | "offset";

/**
 * AU-HOME-004 (extra repayments) and AU-HOME-006 (offset): scenario vs
 * baseline on the scheduled ledger, preserving the legal distinction between
 * offset cash and principal reduction (§12.6).
 */
export function SavingsPresetCalculator({ variant }: { variant: SavingsVariant }) {
  const entry = getRegistryEntry(variant === "offset" ? "AU-HOME-006" : "AU-HOME-004")!;
  const [state, setState] = useState<LoanBasicsState>(LOAN_BASICS_DEFAULTS);
  const [recurringRaw, setRecurringRaw] = useState("");
  const [lumpRaw, setLumpRaw] = useState("");
  const [openingOffsetRaw, setOpeningOffsetRaw] = useState("");

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const recurring = useMemo(() => parseMoneyInput(recurringRaw), [recurringRaw]);
  const lump = useMemo(() => parseMoneyInput(lumpRaw), [lumpRaw]);
  const openingOffset = useMemo(() => parseMoneyInput(openingOffsetRaw), [openingOffsetRaw]);

  const job = useMemo(() => {
    if (!parsed.ok) return null;
    const events: LedgerEvent[] = [];
    const clean = (raw: string) => raw.trim().replace(/,/g, "");
    if (variant === "extra_repayments") {
      if (recurringRaw.trim() && recurring.ok) {
        events.push({ type: "extra_recurring", startDate: "2026-10-01", amount: clean(recurringRaw) });
      }
      if (lumpRaw.trim() && lump.ok) {
        events.push({ type: "extra_oneoff", effectiveDate: "2027-06-30", amount: clean(lumpRaw) });
      }
      if (events.length === 0) return null;
    } else {
      if (recurringRaw.trim() && recurring.ok) {
        events.push({ type: "offset_deposit_recurring", startDate: "2026-10-01", amount: clean(recurringRaw) });
      }
      if (!openingOffsetRaw.trim() && events.length === 0) return null;
    }
    return {
      kind: "compare" as const,
      input: {
        openingPrincipal: parsed.principal,
        annualRate: parsed.annualRate,
        termPeriods: parsed.termPeriods,
        repaymentFrequency: parsed.frequency,
        firstRepaymentDate: "2026-10-01",
        repaymentType: "principal_and_interest" as const,
        interestOnlyPeriods: parsed.ioPeriods,
        repaymentResetPolicy: "keep_amount" as const,
        offsetOpeningBalance:
          variant === "offset" && openingOffsetRaw.trim() && openingOffset.ok ? clean(openingOffsetRaw) : "0",
        events,
      },
    };
  }, [parsed, variant, recurringRaw, recurring, lumpRaw, lump, openingOffsetRaw, openingOffset]);

  const { result, error } = useLedgerJob<SCompareResult>(job);

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
          {variant === "offset" ? (
            <>
              <MoneyField
                id="offset-opening"
                label="Offset balance today"
                description="Cash sitting in the offset account. It stays yours and is never treated as a repayment."
                value={openingOffsetRaw}
                onChange={setOpeningOffsetRaw}
                error={!openingOffset.ok && openingOffset.error ? openingOffset.error : undefined}
              />
              <MoneyField
                id="offset-recurring"
                label="Regular deposit to offset (per repayment period)"
                value={recurringRaw}
                onChange={setRecurringRaw}
                error={!recurring.ok && recurring.error ? recurring.error : undefined}
              />
            </>
          ) : (
            <>
              <MoneyField
                id="extra-recurring"
                label="Extra repayment (per repayment period)"
                value={recurringRaw}
                onChange={setRecurringRaw}
                error={!recurring.ok && recurring.error ? recurring.error : undefined}
              />
              <MoneyField
                id="extra-lump"
                label="One-off lump sum (30 June 2027)"
                value={lumpRaw}
                onChange={setLumpRaw}
                error={!lump.ok && lump.error ? lump.error : undefined}
              />
            </>
          )}
        </div>
      }
      results={
        error ? (
          <EmptyState>{error}</EmptyState>
        ) : !result ? (
          <EmptyState>
            {variant === "offset"
              ? "Enter your loan and an offset balance or regular deposit to see the interest and time saved."
              : "Enter your loan and an extra repayment to see the interest and time saved."}
          </EmptyState>
        ) : (
          <div className="grid gap-6">
            <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
              <PrimaryResult
                label="Interest saved over the loan"
                amount={moneyFromDecimalString("AUD", result.interestSaved, 2)}
                qualifier={`Compared with the same loan and repayments but ${variant === "offset" ? "no offset balance" : "no extra repayments"}, on identical dates.`}
              />
              <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 @xl:grid-cols-3">
                <MetricCell
                  label="Time saved"
                  value={periodsToYearsLabel(result.periodsSaved, PPY[state.frequency])}
                  detail={`paid off ${result.scenario.payoffDate ?? "beyond term"} instead of ${result.baseline.payoffDate ?? "beyond term"}`}
                />
                <ResultMetric
                  label="Interest with this plan"
                  amount={moneyFromDecimalString("AUD", result.scenario.totalInterest, 2)}
                  detail={`vs ${formatMajor(result.baseline.totalInterest)} baseline`}
                />
                {variant === "offset" ? (
                  <ResultMetric
                    label="Cash still yours in offset"
                    amount={moneyFromDecimalString("AUD", result.scenario.finalOffsetBalance, 2)}
                    detail="available, not repaid"
                  />
                ) : (
                  <MetricCell
                    label="Paid off"
                    value={result.scenario.payoffDate ?? "beyond term"}
                    detail={`${result.scenario.rows.length} repayments, ${result.baseline.rows.length} without the extra`}
                  />
                )}
              </div>
              {variant === "offset" ? (
                <p className="text-[12px] leading-5 text-ink-3">
                  Offset cash reduces the interest-bearing balance but is not a principal repayment:
                  it stays available to withdraw, and withdrawing it increases interest from that
                  date.
                </p>
              ) : null}
            </div>
          </div>
        )
      }
      explanation={
        result ? (
          <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
            <ScheduleView result={result.scenario} calculatorId={entry.id} frequency={state.frequency} />
          </div>
        ) : null
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
