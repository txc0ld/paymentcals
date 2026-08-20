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
  SegmentedControl,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { MortgageDisclosure } from "./mortgage-disclosure";
import { ScheduleView } from "./schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "./loan-fields";

const entry = getRegistryEntry("AU-HOME-001")!;

const CYCLE_LABEL = { weekly: "per week", fortnightly: "per fortnight", monthly: "per month" } as const;

export function MortgageRepaymentsCalculator() {
  const [state, setState] = useState<LoanBasicsState>(LOAN_BASICS_DEFAULTS);
  const [uiMode, setUiMode] = useState<"simple" | "advanced">("simple");
  const [annualFeeRaw, setAnnualFeeRaw] = useState("");

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const annualFee = useMemo(() => parseMoneyInput(annualFeeRaw), [annualFeeRaw]);

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
        interestOnlyPeriods: parsed.ioPeriods,
        repaymentResetPolicy: "recalculate_to_term" as const,
        events:
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
      },
    };
  }, [parsed, annualFeeRaw, annualFee]);

  const { result, error } = useLedgerJob<SLedgerResult>(job);

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
          <div className="grid gap-5">
            <div className="nexus-result grid gap-6 p-6">
              <PrimaryResult
                label={`Repayment ${CYCLE_LABEL[state.frequency]}`}
                amount={moneyFromDecimalString("AUD", result.scheduledPaymentInitial, 2)}
                qualifier={`Scheduled-ledger estimate over ${state.termYearsRaw} years. Lender daily accrual, fee timing and rounding can differ; compare with your contract.`}
              />
              <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
                <ResultMetric label="Total interest" amount={moneyFromDecimalString("AUD", result.totalInterest, 2)} />
                <ResultMetric label="Total paid" amount={moneyFromDecimalString("AUD", result.totalPaid, 2)} detail={result.totalFees !== "0.00" ? `includes ${formatMajor(result.totalFees)} fees` : undefined} />
                <div className="grid gap-1 rounded-[var(--pc-radius-control)] border border-hairline bg-surface p-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Paid off</span>
                  <span className="font-mono text-xl tabular-nums text-ink">{result.payoffDate ?? "beyond term"}</span>
                  <span className="text-[12px] leading-4 text-ink-3">
                    {periodsToYearsLabel(result.periodsUsed, PPY[state.frequency])}
                  </span>
                </div>
              </div>
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
          <div className="nexus-panel-soft min-w-0 p-5 md:p-6">
            <ScheduleView result={result} calculatorId="AU-HOME-001" frequency={state.frequency} />
          </div>
        ) : null
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
