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
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString } from "@paymentcalcs/calculation-core";
import { formatMajor } from "../../lib/format-major";
import type { SRefinanceResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { MortgageDisclosure } from "./mortgage-disclosure";

const entry = getRegistryEntry("AU-HOME-012")!;

function ratePct(raw: string): string | null {
  return /^\d+(\.\d+)?$/.test(raw.trim()) && Number.parseFloat(raw) <= 30
    ? (Number.parseFloat(raw) / 100).toString()
    : null;
}

export function RefinanceCalculator() {
  const [balanceRaw, setBalanceRaw] = useState("");
  const [oldRateRaw, setOldRateRaw] = useState("");
  const [newRateRaw, setNewRateRaw] = useState("");
  const [remainingYearsRaw, setRemainingYearsRaw] = useState("25");
  const [newTermYearsRaw, setNewTermYearsRaw] = useState("25");
  const [upfrontRaw, setUpfrontRaw] = useState("");
  const [financedRaw, setFinancedRaw] = useState("");
  const [cashbackRaw, setCashbackRaw] = useState("");
  const [cashbackDate, setCashbackDate] = useState("");

  const balance = useMemo(() => parseMoneyInput(balanceRaw), [balanceRaw]);

  const job = useMemo(() => {
    const oldRate = ratePct(oldRateRaw);
    const newRate = ratePct(newRateRaw);
    const oldYears = /^\d+(\.\d+)?$/.test(remainingYearsRaw) ? Number.parseFloat(remainingYearsRaw) : null;
    const newYears = /^\d+(\.\d+)?$/.test(newTermYearsRaw) ? Number.parseFloat(newTermYearsRaw) : null;
    if (!balance.ok || !oldRate || !newRate || !oldYears || !newYears) return null;
    const clean = (raw: string, fallback: string) => (raw.trim() ? raw.trim().replace(/,/g, "") : fallback);
    const principal = clean(balanceRaw, "0");
    const shared = {
      repaymentFrequency: "monthly" as const,
      firstRepaymentDate: "2026-10-01",
      repaymentType: "principal_and_interest" as const,
      repaymentResetPolicy: "recalculate_to_term" as const,
    };
    return {
      kind: "refinance" as const,
      oldInput: { ...shared, openingPrincipal: principal, annualRate: oldRate, termPeriods: Math.round(oldYears * 12) },
      newInput: { ...shared, openingPrincipal: principal, annualRate: newRate, termPeriods: Math.round(newYears * 12) },
      costs: {
        upfrontCash: clean(upfrontRaw, "0"),
        financedCosts: clean(financedRaw, "0"),
        // A cashback only counts once its receipt date is entered (§12.7 AC).
        cashback: cashbackDate ? clean(cashbackRaw, "0") : "0",
        ...(cashbackDate ? { cashbackDate } : {}),
      },
    };
  }, [balance, balanceRaw, oldRateRaw, newRateRaw, remainingYearsRaw, newTermYearsRaw, upfrontRaw, financedRaw, cashbackRaw, cashbackDate]);

  const { result, error } = useLedgerJob<SRefinanceResult>(job);

  const rateInput = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
      />
    </div>
  );

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
          <MoneyField
            id="ref-balance"
            label="Current loan balance"
            value={balanceRaw}
            onChange={setBalanceRaw}
            error={!balance.ok && balance.error ? balance.error : undefined}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {rateInput("ref-old-rate", "Current rate % p.a.", oldRateRaw, setOldRateRaw)}
            {rateInput("ref-old-years", "Remaining term (years)", remainingYearsRaw, setRemainingYearsRaw)}
          </div>
          <FieldGroup legend="The refinance offer">
            <div className="grid gap-4 sm:grid-cols-2">
              {rateInput("ref-new-rate", "New rate % p.a.", newRateRaw, setNewRateRaw)}
              {rateInput("ref-new-years", "New term (years)", newTermYearsRaw, setNewTermYearsRaw)}
            </div>
            <MoneyField id="ref-upfront" label="Switching costs paid in cash" value={upfrontRaw} onChange={setUpfrontRaw} />
            <MoneyField
              id="ref-financed"
              label="Switching costs added to the loan"
              description="These accrue interest in the new-loan scenario."
              value={financedRaw}
              onChange={setFinancedRaw}
            />
            <MoneyField
              id="ref-cashback"
              label="Cashback"
              description="Counted only from its receipt date; review the lender's conditions yourself."
              value={cashbackRaw}
              onChange={setCashbackRaw}
            />
            {cashbackRaw.trim() ? (
              <div className="grid gap-1.5">
                <label htmlFor="ref-cashback-date" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                  Cashback received on
                </label>
                <input
                  id="ref-cashback-date"
                  type="date"
                  value={cashbackDate}
                  onChange={(e) => setCashbackDate(e.target.value)}
                  className="nexus-input min-h-11 bg-surface px-3 font-mono text-[14px] text-ink outline-none focus:border-focus"
                />
                {!cashbackDate ? (
                  <span className="text-[12px] text-warn">Enter the date or the cashback is not counted.</span>
                ) : null}
              </div>
            ) : null}
          </FieldGroup>
        </div>
      }
      results={
        error ? (
          <EmptyState>{error}</EmptyState>
        ) : !result ? (
          <EmptyState>
            Enter both loans to compare cumulative cash flows with residual balances included. This
            comparison never uses repayments alone.
          </EmptyState>
        ) : (
          <div className="nexus-result grid gap-6 p-6">
            <PrimaryResult
              label="Break-even"
              amount={moneyFromDecimalString("AUD", result.economicAdvantageAtHorizon, 2)}
              qualifier={
                result.breakEvenDate
                  ? `Ahead from ${result.breakEvenDate} after ${formatMajor(result.upfrontNetSwitchingCost)} net switching costs. The amount above is the economic advantage at the common horizon (${result.horizonDate}), including residual balances.`
                  : `No sustained break-even within the comparison horizon (${result.horizonDate ?? "term"}). The amount above is the position at the horizon, including residual balances.`
              }
            />
            <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
              <ResultMetric
                label="Repayment difference"
                amount={moneyFromDecimalString("AUD", result.repaymentDifference, 2)}
                detail="per month, old − new"
              />
              <ResultMetric
                label="New loan interest (life)"
                amount={moneyFromDecimalString("AUD", result.newLoan.totalInterest, 2)}
                detail={`vs ${formatMajor(result.oldLoan.totalInterest)} staying`}
              />
              <ResultMetric
                label="Net switching cost"
                amount={moneyFromDecimalString("AUD", result.upfrontNetSwitchingCost, 2)}
                detail="upfront + financed − cashback"
              />
            </div>
            {result.reversalsAfterBreakEven > 0 ? (
              <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                The cumulative advantage crosses zero more than once before settling; the reported
                break-even is the first sustained crossing.
              </p>
            ) : null}
            {Number.parseFloat(newTermYearsRaw) > Number.parseFloat(remainingYearsRaw) &&
            Number.parseFloat(result.newLoan.totalInterest) > Number.parseFloat(result.oldLoan.totalInterest) ? (
              <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                The longer new term lowers the repayment but increases the lifetime cost shown
                above.
              </p>
            ) : null}
          </div>
        )
      }
      explanation={null}
      disclosure={<MortgageDisclosure />}
    />
  );
}
