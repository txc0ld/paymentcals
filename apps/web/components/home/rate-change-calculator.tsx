"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  PrimaryResult,
  ResultMetric,
  ScenarioActions,
  SelectField,
  WorkingPanel,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import type { LedgerInput } from "@paymentcalcs/engine-mortgage-ledger";
import { formatMajor } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { useLedgerJob } from "../../lib/use-ledger";
import { DateField, formatIsoDateLabel, isDateWithin } from "./field-parts";
import { MortgageDisclosure } from "./mortgage-disclosure";
import {
  DeltaCell,
  MetricCell,
  PanelHeading,
  diffMajor,
  directionOf,
  formatSignedMajor,
  scaleMajor,
} from "./result-parts";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";
import { EVENT_DATE_MAX, EVENT_DATE_MIN, FIRST_REPAYMENT_DATE, workingContentFor } from "./working-notes";

const entry = getRegistryEntry("AU-HOME-007")!;

const CYCLE_NOUN = { weekly: "week", fortnightly: "fortnight", monthly: "month" } as const;
const DIRECTION_WORD = { up: "more", down: "less", flat: "no change" } as const;

type Policy = "recalculate_to_term" | "keep_amount";

const POLICY_LABEL: Record<Policy, string> = {
  recalculate_to_term: "Recalculates the repayment to term",
  keep_amount: "Keeps the repayment amount",
};

const POLICY_SHORT: Record<Policy, string> = {
  recalculate_to_term: "recalculate to term",
  keep_amount: "keep the repayment",
};

/** Default: the change lands on the first of the year after the loan starts. */
const DEFAULT_EFFECTIVE_DATE = "2027-01-01";

/** The first scheduled repayment falling on or after the change. */
function repaymentAfter(result: SLedgerResult | null, effectiveDate: string): string | null {
  return result?.rows.find((row) => row.date >= effectiveDate)?.payment ?? null;
}

export function RateChangeCalculator() {
  const [state, setState] = useState<LoanBasicsState>(LOAN_BASICS_DEFAULTS);
  const [newRatePctRaw, setNewRatePctRaw] = useState("");
  const [policy, setPolicy] = useState<Policy>("recalculate_to_term");
  const [effectiveDate, setEffectiveDate] = useState(DEFAULT_EFFECTIVE_DATE);

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const newRateValid = /^\d+(\.\d+)?$/.test(newRatePctRaw.trim()) && Number.parseFloat(newRatePctRaw) <= 30;
  const dateValid = isDateWithin(effectiveDate, EVENT_DATE_MIN, EVENT_DATE_MAX);

  /** The changed loan under one policy. Same facts, one field apart. */
  const changedInput = useMemo((): Omit<LedgerInput, "repaymentResetPolicy"> | null => {
    if (!parsed.ok || !newRateValid || !dateValid) return null;
    return {
      openingPrincipal: parsed.principal,
      annualRate: parsed.annualRate,
      termPeriods: parsed.termPeriods,
      repaymentFrequency: parsed.frequency,
      firstRepaymentDate: FIRST_REPAYMENT_DATE,
      repaymentType: "principal_and_interest" as const,
      interestOnlyPeriods: parsed.ioPeriods,
      events: [
        {
          type: "rate_change" as const,
          effectiveDate,
          annualRate: (Number.parseFloat(newRatePctRaw) / 100).toString(),
        },
      ],
    };
  }, [parsed, newRatePctRaw, newRateValid, effectiveDate, dateValid]);

  const recalcJob = useMemo(
    () => (changedInput ? { kind: "run" as const, input: { ...changedInput, repaymentResetPolicy: "recalculate_to_term" as const } } : null),
    [changedInput],
  );
  const keepJob = useMemo(
    () => (changedInput ? { kind: "run" as const, input: { ...changedInput, repaymentResetPolicy: "keep_amount" as const } } : null),
    [changedInput],
  );

  // With no rate-change event the two reset policies are identical, so one
  // baseline run serves both sides of the comparison.
  const baselineJob = useMemo(() => {
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
        events: [],
      },
    };
  }, [parsed]);

  const recalc = useLedgerJob<SLedgerResult>(recalcJob);
  const keep = useLedgerJob<SLedgerResult>(keepJob);
  const baseline = useLedgerJob<SLedgerResult>(baselineJob);

  const selected = policy === "keep_amount" ? keep : recalc;
  const newRepayment = useMemo(
    () => repaymentAfter(selected.result, effectiveDate),
    [selected.result, effectiveDate],
  );

  /** Signed deltas over amounts the ledger already produced — no new maths on the loan. */
  const delta = useMemo(() => {
    if (!selected.result || !baseline.result || newRepayment === null) return null;
    const before = selected.result.scheduledPaymentInitial;
    const perRepayment = diffMajor(newRepayment, before);
    return {
      before,
      after: newRepayment,
      perRepayment,
      perRepaymentDirection: directionOf(perRepayment),
      perMonth: scaleMajor(perRepayment, PPY[state.frequency], 12),
      lifetimeInterest: diffMajor(selected.result.totalInterest, baseline.result.totalInterest),
    };
  }, [selected.result, baseline.result, newRepayment, state.frequency]);

  /**
   * Both policies from the same facts. A cell renders "—" whenever its job is
   * still running: a stale number under a changed input is worse than a gap.
   */
  const policyRows = useMemo(() => {
    return ([
      ["recalculate_to_term", recalc.result],
      ["keep_amount", keep.result],
    ] as ReadonlyArray<[Policy, SLedgerResult | null]>).map(([key, ledger]) => {
      const repayment = repaymentAfter(ledger, effectiveDate);
      return {
        key,
        label: POLICY_LABEL[key],
        repayment: repayment ? formatMajor(repayment) : "—",
        interest: ledger ? formatMajor(ledger.totalInterest) : "—",
        interestDelta:
          ledger && baseline.result ? formatSignedMajor(diffMajor(ledger.totalInterest, baseline.result.totalInterest)) : "—",
        payoff: ledger ? (ledger.payoffDate ?? "beyond term") : "—",
        unresolved: ledger?.unresolvedBalance ?? null,
      };
    });
  }, [recalc.result, keep.result, baseline.result, effectiveDate]);

  const working = workingContentFor(entry.id);
  const dateLabel = dateValid ? formatIsoDateLabel(effectiveDate) : "the effective date";

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
          actions={
            <ScenarioActions
              onReset={() => {
                setState(LOAN_BASICS_DEFAULTS);
                setNewRatePctRaw("");
                setPolicy("recalculate_to_term");
                setEffectiveDate(DEFAULT_EFFECTIVE_DATE);
              }}
            />
          }
        />
      }
      inputs={
        <div className="grid gap-6">
          <LoanBasicsFields state={state} onChange={(patch) => setState((s) => ({ ...s, ...patch }))} errors={parsed.errors} />
          <div className="grid gap-1.5">
            <label htmlFor="new-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
              New rate % p.a. (from {dateLabel})
            </label>
            <input
              id="new-rate"
              inputMode="decimal"
              placeholder="6.49"
              value={newRatePctRaw}
              onChange={(e) => setNewRatePctRaw(e.target.value)}
              className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
            />
          </div>
          <DateField
            id="rate-effective-date"
            label="Rate change takes effect on"
            description="The change applies from the first scheduled repayment on or after this date."
            value={effectiveDate}
            min={EVENT_DATE_MIN}
            max={EVENT_DATE_MAX}
            onChange={setEffectiveDate}
            error={
              dateValid
                ? undefined
                : `Choose a date between ${formatIsoDateLabel(EVENT_DATE_MIN)} and ${formatIsoDateLabel(EVENT_DATE_MAX)}.`
            }
          />
          <SelectField
            id="reset-policy"
            label="After the change, the lender"
            value={policy}
            onChange={setPolicy}
            options={[
              { value: "recalculate_to_term", label: POLICY_LABEL.recalculate_to_term },
              { value: "keep_amount", label: POLICY_LABEL.keep_amount },
            ]}
          />
        </div>
      }
      results={
        !selected.result || !baseline.result || newRepayment === null || delta === null ? (
          <EmptyState>Enter your loan and the new rate to see the repayment change and lifetime effect.</EmptyState>
        ) : (
          <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
            <PrimaryResult
              label="Repayment after the change"
              amount={moneyFromDecimalString("AUD", newRepayment, 2)}
              qualifier={`Was ${formatMajor(selected.result.scheduledPaymentInitial)} before the change. Under the "${POLICY_SHORT[policy]}" policy.`}
            />
            <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
              <PanelHeading>What changes</PanelHeading>
              <div className="grid gap-4 @sm:grid-cols-2 @3xl:grid-cols-4">
                <MetricCell
                  label="Before the change"
                  value={formatMajor(delta.before)}
                  detail={`per ${CYCLE_NOUN[state.frequency]}, from the first repayment`}
                />
                <MetricCell
                  label="After the change"
                  value={formatMajor(delta.after)}
                  detail={`per ${CYCLE_NOUN[state.frequency]}, from ${dateLabel}`}
                />
                <DeltaCell
                  label="Repayment difference"
                  signedValue={delta.perRepayment}
                  detail={`${DIRECTION_WORD[delta.perRepaymentDirection]} per ${CYCLE_NOUN[state.frequency]}${
                    state.frequency === "monthly"
                      ? ""
                      : ` · ${formatSignedMajor(delta.perMonth)} per month equivalent`
                  }`}
                />
                <DeltaCell
                  label="Interest difference"
                  signedValue={delta.lifetimeInterest}
                  detail={`${DIRECTION_WORD[directionOf(delta.lifetimeInterest)]} in interest over the whole schedule, against the unchanged rate`}
                />
              </div>
            </div>
            <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2">
              <ResultMetric
                label="Lifetime interest at new rate"
                amount={moneyFromDecimalString("AUD", selected.result.totalInterest, 2)}
                detail={`vs ${formatMajor(baseline.result.totalInterest)} unchanged`}
              />
              <MetricCell
                label="Paid off"
                value={selected.result.payoffDate ?? "beyond term"}
                detail={
                  selected.result.unresolvedBalance ? (
                    <span className="text-warn">
                      {formatMajor(selected.result.unresolvedBalance)} unpaid at term under this
                      policy
                    </span>
                  ) : (
                    `${selected.result.rows.length} repayments in total`
                  )
                }
              />
            </div>
          </div>
        )
      }
      explanation={
        <div className="grid min-w-0 gap-8">
          {changedInput ? (
            <div className="nexus-panel-soft grid min-w-0 gap-6 p-6 md:p-8">
              <PanelHeading>Both reset policies, same facts</PanelHeading>
              <div className="overflow-x-auto">
                <table className="nexus-table w-full min-w-[600px] border-collapse text-left">
                  <caption className="sr-only">
                    Repayment after the change, lifetime interest, the difference against an
                    unchanged rate, and the payoff date, under each of the two reset policies
                  </caption>
                  <thead>
                    <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      <th scope="col" className="py-2 pe-4 font-normal">After the change, the lender</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">Repayment</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">Lifetime interest</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">vs unchanged rate</th>
                      <th scope="col" className="py-2 text-right font-normal">Paid off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyRows.map((row) => (
                      <tr key={row.key} className="border-b border-hairline">
                        <th scope="row" className="py-2 pe-4 text-[13px] font-normal text-ink-2">
                          {row.label}
                          {row.key === policy ? (
                            <span className="ps-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                              selected
                            </span>
                          ) : null}
                        </th>
                        <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">{row.repayment}</td>
                        <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">{row.interest}</td>
                        <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">{row.interestDelta}</td>
                        <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                          {row.payoff}
                          {row.unresolved ? (
                            <span className="ps-2 text-[11px] text-warn">{formatMajor(row.unresolved)} unpaid</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[12px] leading-5 text-ink-3">
                Both rows run the identical loan, rate change and effective date; only the lender's
                reset policy differs. Keeping the repayment amount leaves the term to absorb the
                change, which can leave a balance unpaid at term after a rise. A dash means that run
                has not finished yet. Which policy applies to you is in your loan contract.
              </p>
            </div>
          ) : null}
          <WorkingPanel
            summary={working.summary}
            steps={working.steps}
            assumptions={working.assumptions}
            limitations={working.limitations}
          />
        </div>
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
