"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  ScenarioActions,
  WorkingPanel,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import type { LedgerEvent } from "@paymentcalcs/engine-mortgage-ledger";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SCompareResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { DateField, formatIsoDateLabel, isDateWithin } from "./field-parts";
import { MortgageDisclosure } from "./mortgage-disclosure";
import { ExtraRepaymentPlateau } from "./mortgage-comparisons";
import { MetricCell, PanelHeading } from "./result-parts";
import { ScheduleView } from "./schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";
import {
  EVENT_DATE_MAX,
  EVENT_DATE_MIN,
  FIRST_REPAYMENT_DATE,
  OFFSET_STEP,
  workingContentFor,
} from "./working-notes";

export type SavingsVariant = "extra_repayments" | "offset";

/**
 * AU-HOME-004 (extra repayments) and AU-HOME-006 (offset): scenario vs
 * baseline on the scheduled ledger, preserving the legal distinction between
 * offset cash and principal reduction (§12.6).
 *
 * The offset route additionally runs the head-to-head: the same money put into
 * the offset account versus paid straight off the loan, on identical dates.
 */
export function SavingsPresetCalculator({ variant }: { variant: SavingsVariant }) {
  const entry = getRegistryEntry(variant === "offset" ? "AU-HOME-006" : "AU-HOME-004")!;
  const [state, setState] = useState<LoanBasicsState>(LOAN_BASICS_DEFAULTS);
  const [recurringRaw, setRecurringRaw] = useState("");
  const [lumpRaw, setLumpRaw] = useState("");
  const [openingOffsetRaw, setOpeningOffsetRaw] = useState("");
  // Neutral defaults: the recurring amount starts on the first repayment and
  // there is no withdrawal, which is exactly what the route did before.
  const [startDate, setStartDate] = useState(FIRST_REPAYMENT_DATE);
  const [withdrawalRaw, setWithdrawalRaw] = useState("");
  const [withdrawalDate, setWithdrawalDate] = useState("");

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const recurring = useMemo(() => parseMoneyInput(recurringRaw), [recurringRaw]);
  const lump = useMemo(() => parseMoneyInput(lumpRaw), [lumpRaw]);
  const openingOffset = useMemo(() => parseMoneyInput(openingOffsetRaw), [openingOffsetRaw]);
  const withdrawal = useMemo(() => parseMoneyInput(withdrawalRaw), [withdrawalRaw]);

  const startDateValid = isDateWithin(startDate, EVENT_DATE_MIN, EVENT_DATE_MAX);
  const withdrawalDateValid = !withdrawalRaw.trim() || isDateWithin(withdrawalDate, EVENT_DATE_MIN, EVENT_DATE_MAX);

  const clean = (raw: string) => raw.trim().replace(/,/g, "");
  const offsetOpening =
    variant === "offset" && openingOffsetRaw.trim() && openingOffset.ok ? clean(openingOffsetRaw) : "0";

  /** The dated offset withdrawal, shared by both arms of the head-to-head. */
  const withdrawalEvents = useMemo<LedgerEvent[]>(() => {
    if (variant !== "offset" || !withdrawalRaw.trim() || !withdrawal.ok || !isDateWithin(withdrawalDate, EVENT_DATE_MIN, EVENT_DATE_MAX)) {
      return [];
    }
    return [{ type: "offset_withdrawal", effectiveDate: withdrawalDate, amount: clean(withdrawalRaw) }];
  }, [variant, withdrawalRaw, withdrawal, withdrawalDate]);

  const job = useMemo(() => {
    if (!parsed.ok || !startDateValid) return null;
    const events: LedgerEvent[] = [];
    if (variant === "extra_repayments") {
      if (recurringRaw.trim() && recurring.ok) {
        events.push({ type: "extra_recurring", startDate, amount: clean(recurringRaw) });
      }
      if (lumpRaw.trim() && lump.ok) {
        events.push({ type: "extra_oneoff", effectiveDate: "2027-06-30", amount: clean(lumpRaw) });
      }
      if (events.length === 0) return null;
    } else {
      if (recurringRaw.trim() && recurring.ok) {
        events.push({ type: "offset_deposit_recurring", startDate, amount: clean(recurringRaw) });
      }
      events.push(...withdrawalEvents);
      if (!openingOffsetRaw.trim() && events.length === 0) return null;
    }
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
  }, [
    parsed,
    variant,
    recurringRaw,
    recurring,
    lumpRaw,
    lump,
    openingOffsetRaw,
    offsetOpening,
    startDate,
    startDateValid,
    withdrawalEvents,
  ]);

  /**
   * The rival arm: identical loan, identical dates, identical opening offset —
   * the recurring amount is paid off the loan instead of deposited to offset.
   */
  const rivalJob = useMemo(() => {
    if (variant !== "offset" || !parsed.ok || !startDateValid) return null;
    if (!recurringRaw.trim() || !recurring.ok) return null;
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
        events: [
          { type: "extra_recurring" as const, startDate, amount: clean(recurringRaw) },
          ...withdrawalEvents,
        ],
      },
    };
  }, [variant, parsed, recurringRaw, recurring, offsetOpening, startDate, startDateValid, withdrawalEvents]);

  const { result, error } = useLedgerJob<SCompareResult>(job);
  const rival = useLedgerJob<SCompareResult>(rivalJob);

  const working = workingContentFor(entry.id, variant === "offset" ? [OFFSET_STEP] : []);
  const cycleNoun = { weekly: "week", fortnightly: "fortnight", monthly: "month" }[state.frequency];

  function reset() {
    setState(LOAN_BASICS_DEFAULTS);
    setRecurringRaw("");
    setLumpRaw("");
    setOpeningOffsetRaw("");
    setStartDate(FIRST_REPAYMENT_DATE);
    setWithdrawalRaw("");
    setWithdrawalDate("");
  }

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
          methodologyHref={`/methodology/${entry.slug}`}
          // Print and Reset only: no URL-state mechanism exists on this route
          // and C1 rules out inventing a serialization for it.
          actions={<ScenarioActions onReset={reset} />}
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
              <MoneyField
                id="offset-withdrawal"
                label="One-off withdrawal from offset"
                description="Cash taken back out. Interest rises from that date, because the balance stops being offset."
                value={withdrawalRaw}
                onChange={setWithdrawalRaw}
                error={!withdrawal.ok && withdrawal.error ? withdrawal.error : undefined}
              />
              {withdrawalRaw.trim() ? (
                <DateField
                  id="offset-withdrawal-date"
                  label="Withdrawal made on"
                  value={withdrawalDate}
                  min={EVENT_DATE_MIN}
                  max={EVENT_DATE_MAX}
                  onChange={setWithdrawalDate}
                  error={
                    withdrawalDateValid
                      ? undefined
                      : "Enter a date inside the loan term or the withdrawal is not counted."
                  }
                />
              ) : null}
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
          <DateField
            id="savings-start-date"
            label={variant === "offset" ? "Regular deposits start on" : "Extra repayments start on"}
            description={`Defaults to the first repayment, ${formatIsoDateLabel(FIRST_REPAYMENT_DATE)}.`}
            value={startDate}
            min={EVENT_DATE_MIN}
            max={EVENT_DATE_MAX}
            onChange={setStartDate}
            error={
              startDateValid
                ? undefined
                : `Choose a date between ${formatIsoDateLabel(EVENT_DATE_MIN)} and ${formatIsoDateLabel(EVENT_DATE_MAX)}.`
            }
          />
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
            {variant === "offset" && rivalJob ? (
              <div className="nexus-panel-soft @container grid min-w-0 gap-5 p-6 md:p-8">
                <PanelHeading>Same money, two places</PanelHeading>
                <p className="max-w-[62ch] text-[13px] leading-5 text-ink-2">
                  {formatMajor(clean(recurringRaw))} every {cycleNoun} deposited to the offset
                  account, against the identical amount paid straight off the loan. Same loan, same
                  dates, same opening offset balance.
                </p>
                <div className="grid gap-4 @lg:grid-cols-2">
                  <div className="grid gap-4 border-t border-hairline-strong pt-4">
                    <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
                      Into the offset account
                    </h4>
                    <MetricCell label="Interest saved" value={formatMajor(result.interestSaved)} />
                    <MetricCell
                      label="Loan closes sooner by"
                      value={periodsToYearsLabel(result.periodsSaved, PPY[state.frequency])}
                      detail={result.scenario.payoffDate ?? "beyond term"}
                    />
                    <MetricCell
                      label="Cash accessible in offset"
                      value={formatMajor(result.scenario.finalOffsetBalance)}
                      detail="yours to withdraw at any time"
                    />
                  </div>
                  <div className="grid gap-4 border-t border-hairline-strong pt-4">
                    <h4 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">
                      Off the loan as an extra repayment
                    </h4>
                    <MetricCell
                      label="Interest saved"
                      value={rival.result ? formatMajor(rival.result.interestSaved) : "—"}
                    />
                    <MetricCell
                      label="Loan closes sooner by"
                      value={
                        rival.result
                          ? periodsToYearsLabel(rival.result.periodsSaved, PPY[state.frequency])
                          : "—"
                      }
                      detail={rival.result ? (rival.result.scenario.payoffDate ?? "beyond term") : undefined}
                    />
                    <MetricCell
                      label="Cash accessible in offset"
                      value={rival.result ? formatMajor(rival.result.scenario.finalOffsetBalance) : "—"}
                      detail="the deposits are gone into the loan; redraw depends on your contract"
                    />
                  </div>
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  The two arms differ only in where the money goes. Extra repayments cut the debt and
                  can only come back through redraw if your contract offers it; offset cash stays
                  yours. A dash means that run has not finished yet.
                </p>
              </div>
            ) : null}
          </div>
        )
      }
      explanation={
        <div className="grid min-w-0 gap-8">
          {result ? (
            <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
              <ScheduleView result={result.scenario} calculatorId={entry.id} frequency={state.frequency} />
            </div>
          ) : null}
          {variant === "extra_repayments" && parsed.ok && startDateValid ? (
            <div className="nexus-panel-soft grid min-w-0 gap-6 p-6 md:p-8">
              <PanelHeading>What each extra amount buys</PanelHeading>
              <ExtraRepaymentPlateau state={state} startDate={startDate} entered={recurringRaw} />
            </div>
          ) : null}
          {result ? null : (
            <WorkingPanel
              summary={working.summary}
              steps={working.steps}
              assumptions={working.assumptions}
              limitations={working.limitations}
            />
          )}
        </div>
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
