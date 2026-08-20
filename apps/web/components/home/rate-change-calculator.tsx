"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  PrimaryResult,
  ResultMetric,
  SelectField,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import { formatMajor } from "../../lib/format-major";
import type { SLedgerResult } from "../../lib/ledger-serialize";
import { useLedgerJob } from "../../lib/use-ledger";
import { MortgageDisclosure } from "./mortgage-disclosure";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, parseLoanBasics, type LoanBasicsState } from "./loan-fields";

const entry = getRegistryEntry("AU-HOME-007")!;

export function RateChangeCalculator() {
  const [state, setState] = useState<LoanBasicsState>(LOAN_BASICS_DEFAULTS);
  const [newRatePctRaw, setNewRatePctRaw] = useState("");
  const [policy, setPolicy] = useState<"recalculate_to_term" | "keep_amount">("recalculate_to_term");

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const newRateValid = /^\d+(\.\d+)?$/.test(newRatePctRaw.trim()) && Number.parseFloat(newRatePctRaw) <= 30;

  const changedJob = useMemo(() => {
    if (!parsed.ok || !newRateValid) return null;
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
        repaymentResetPolicy: policy,
        events: [
          {
            type: "rate_change" as const,
            effectiveDate: "2027-01-01",
            annualRate: (Number.parseFloat(newRatePctRaw) / 100).toString(),
          },
        ],
      },
    };
  }, [parsed, newRatePctRaw, newRateValid, policy]);

  const baselineJob = useMemo(() => {
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
        repaymentResetPolicy: policy,
        events: [],
      },
    };
  }, [parsed, policy]);

  const changed = useLedgerJob<SLedgerResult>(changedJob);
  const baseline = useLedgerJob<SLedgerResult>(baselineJob);

  const newRepayment = useMemo(() => {
    if (!changed.result) return null;
    const row = changed.result.rows.find((r) => r.date >= "2027-01-01");
    return row?.payment ?? null;
  }, [changed.result]);

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
          <div className="grid gap-1.5">
            <label htmlFor="new-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
              New rate % p.a. (from 1 Jan 2027)
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
          <SelectField
            id="reset-policy"
            label="After the change, the lender"
            value={policy}
            onChange={setPolicy}
            options={[
              { value: "recalculate_to_term", label: "Recalculates the repayment to term" },
              { value: "keep_amount", label: "Keeps the repayment amount" },
            ]}
          />
        </div>
      }
      results={
        !changed.result || !baseline.result || newRepayment === null ? (
          <EmptyState>Enter your loan and the new rate to see the repayment change and lifetime effect.</EmptyState>
        ) : (
          <div className="nexus-result grid gap-6 p-6">
            <PrimaryResult
              label="Repayment after the change"
              amount={moneyFromDecimalString("AUD", newRepayment, 2)}
              qualifier={`Was ${formatMajor(changed.result.scheduledPaymentInitial)} before the change. Under the "${policy === "keep_amount" ? "keep the repayment" : "recalculate to term"}" policy.`}
            />
            <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
              <ResultMetric
                label="Lifetime interest at new rate"
                amount={moneyFromDecimalString("AUD", changed.result.totalInterest, 2)}
                detail={`vs ${formatMajor(baseline.result.totalInterest)} unchanged`}
              />
              <div className="grid gap-1 rounded-[var(--pc-radius-control)] border border-hairline bg-surface p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Paid off</span>
                <span className="font-mono text-xl tabular-nums text-ink">
                  {changed.result.payoffDate ?? "beyond term"}
                </span>
                {changed.result.unresolvedBalance ? (
                  <span className="text-[12px] leading-4 text-warn">
                    {formatMajor(changed.result.unresolvedBalance)} unpaid at term under this policy
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      }
      explanation={null}
      disclosure={<MortgageDisclosure />}
    />
  );
}
