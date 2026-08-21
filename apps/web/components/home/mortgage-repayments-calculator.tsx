"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  FieldGroup,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  ScenarioActions,
  SegmentedControl,
  WorkingPanel,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import type { LedgerEvent } from "@paymentcalcs/engine-mortgage-ledger";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SLedgerResult, SLedgerRow } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { DisclosurePanel } from "./field-parts";
import { MortgageDisclosure } from "./mortgage-disclosure";
import { FrequencyComparison, RateSensitivityLadder } from "./mortgage-comparisons";
import { MetricCell, PanelHeading, diffMajor, sharePct, sumMajor } from "./result-parts";
import { ScheduleView } from "./schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";
import { FIRST_REPAYMENT_DATE, workingContentFor } from "./working-notes";

const entry = getRegistryEntry("AU-HOME-001")!;

const CYCLE_LABEL = { weekly: "per week", fortnightly: "per fortnight", monthly: "per month" } as const;

/** Interest / principal split of one already-computed ledger row. */
function describeRow(row: SLedgerRow) {
  const paid = sumMajor([row.payment, row.extraPayment]);
  return {
    period: row.period,
    date: row.date,
    interest: row.interest,
    principal: diffMajor(paid, row.interest),
    interestShare: sharePct(row.interest, paid),
  };
}

export function MortgageRepaymentsCalculator() {
  const [state, setState] = useState<LoanBasicsState>(LOAN_BASICS_DEFAULTS);
  const [uiMode, setUiMode] = useState<"simple" | "advanced">("simple");
  const [annualFeeRaw, setAnnualFeeRaw] = useState("");
  const [showFrequencies, setShowFrequencies] = useState(false);
  const [showLadder, setShowLadder] = useState(false);

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const annualFee = useMemo(() => parseMoneyInput(annualFeeRaw), [annualFeeRaw]);

  // One stable event array: the side comparisons take it as a dependency, and
  // a fresh array each render would restart every worker job on every keystroke.
  const events = useMemo<LedgerEvent[]>(
    () =>
      annualFeeRaw.trim() && annualFee.ok
        ? [
            {
              type: "fee_annual" as const,
              startDate: "2026-12-01",
              amount: annualFeeRaw.trim().replace(/,/g, ""),
              financed: false,
            },
          ]
        : [],
    [annualFeeRaw, annualFee],
  );

  const job = useMemo(() => {
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
  }, [parsed, events]);

  const { result, error } = useLedgerJob<SLedgerResult>(job);

  // Both rows come straight from the ledger the engine already returned.
  const splitRows = useMemo(() => {
    if (!result || result.rows.length === 0) return [];
    const laterIndex = Math.floor((result.rows.length - 1) / 2);
    const rows = laterIndex > 0 ? [result.rows[0]!, result.rows[laterIndex]!] : [result.rows[0]!];
    return rows.map(describeRow);
  }, [result]);

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
          // Print only (plus Reset): this route has no URL-state mechanism, and
          // C1 rules out inventing one here.
          actions={
            <ScenarioActions
              onReset={() => {
                setState(LOAN_BASICS_DEFAULTS);
                setAnnualFeeRaw("");
                setShowFrequencies(false);
                setShowLadder(false);
              }}
            />
          }
          modeControl={
            <SegmentedControl
              label="Detail level"
              value={uiMode}
              onChange={setUiMode}
              options={[
                { value: "simple", label: "Simple" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
          }
        />
      }
      inputs={
        <div className="grid gap-6">
          <LoanBasicsFields state={state} onChange={(patch) => setState((s) => ({ ...s, ...patch }))} errors={parsed.errors} />
          {uiMode === "advanced" ? (
            <FieldGroup legend="Fees">
              <MoneyField
                id="loan-annual-fee"
                label="Annual package fee"
                value={annualFeeRaw}
                onChange={setAnnualFeeRaw}
                error={!annualFee.ok && annualFee.error ? annualFee.error : undefined}
              />
            </FieldGroup>
          ) : null}
        </div>
      }
      results={
        error ? (
          <EmptyState>{error}</EmptyState>
        ) : !result ? (
          <EmptyState>
            Enter the loan amount, rate and term to see the repayment, total interest and the full
            schedule.
          </EmptyState>
        ) : (
          <div className="grid gap-6">
            <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
              <PrimaryResult
                label={`Repayment ${CYCLE_LABEL[state.frequency]}`}
                amount={moneyFromDecimalString("AUD", result.scheduledPaymentInitial, 2)}
                qualifier={`Scheduled-ledger estimate over ${state.termYearsRaw} years. Lender daily accrual, fee timing and rounding can differ; compare with your contract.`}
              />
              <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 @xl:grid-cols-3">
                <ResultMetric
                  label="Total interest"
                  amount={moneyFromDecimalString("AUD", result.totalInterest, 2)}
                  detail={`${sharePct(result.totalInterest, result.totalPaid)} of everything paid`}
                />
                <ResultMetric label="Total paid" amount={moneyFromDecimalString("AUD", result.totalPaid, 2)} detail={result.totalFees !== "0.00" ? `includes ${formatMajor(result.totalFees)} fees` : undefined} />
                <MetricCell
                  label="Paid off"
                  value={result.payoffDate ?? "beyond term"}
                  detail={`${periodsToYearsLabel(result.periodsUsed, PPY[state.frequency])} · ${result.rows.length} repayments`}
                />
              </div>
              {splitRows.length > 0 ? (
                <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                  <PanelHeading>Where a repayment goes</PanelHeading>
                  <div className="overflow-x-auto">
                    <table className="nexus-table w-full min-w-[320px] border-collapse text-left">
                      <caption className="sr-only">
                        Interest and principal split of a repayment early in the loan and midway
                        through it, taken from the schedule
                      </caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">Repayment</th>
                          <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
                          <th scope="col" className="py-2 pe-4 text-right font-normal">Principal</th>
                          <th scope="col" className="py-2 text-right font-normal">Interest share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {splitRows.map((row) => (
                          <tr key={row.period} className="border-b border-hairline">
                            <th scope="row" className="py-2 pe-4 font-mono text-[13px] font-normal tabular-nums text-ink-2">
                              #{row.period} · {row.date}
                            </th>
                            <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                              {formatMajor(row.interest)}
                            </td>
                            <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                              {formatMajor(row.principal)}
                            </td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                              {row.interestShare}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {result.negativeAmortisation ? (
                <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                  These settings do not amortise the loan: payments fall short of interest in at
                  least one period.
                </p>
              ) : null}
            </div>
          </div>
        )
      }
      explanation={
        result ? (
          <div className="grid min-w-0 gap-8">
            <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
              <ScheduleView result={result} calculatorId="AU-HOME-001" frequency={state.frequency} />
            </div>
            <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
              <DisclosurePanel
                id="frequency-comparison"
                open={showFrequencies}
                onToggle={setShowFrequencies}
                heading="Compare repayment frequencies"
                summary="The same loan run weekly, fortnightly and monthly, each on its own schedule."
              >
                <FrequencyComparison state={state} events={events} />
              </DisclosurePanel>
            </div>
            <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
              <DisclosurePanel
                id="rate-sensitivity"
                open={showLadder}
                onToggle={setShowLadder}
                heading="Rate sensitivity"
                summary="The same loan re-run a quarter, a half and a full percentage point either side of the entered rate."
              >
                <RateSensitivityLadder state={state} events={events} anchor={result} />
              </DisclosurePanel>
            </div>
          </div>
        ) : (
          <WorkingPanel {...workingContentFor(entry.id)} />
        )
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
