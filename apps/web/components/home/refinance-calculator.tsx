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
import { PanelHeading, diffMajor, formatSignedMajor, sumMajor } from "./result-parts";

const entry = getRegistryEntry("AU-HOME-012")!;

/** The refinance comparison always runs monthly, so a year is 12 ledger rows. */
const HORIZONS: ReadonlyArray<{ label: string; months: number }> = [
  { label: "After 2 years", months: 24 },
  { label: "After 5 years", months: 60 },
];

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

  /**
   * Positions at fixed horizons, read out of the cumulative-delta series and
   * the two ledgers the engine already returned. The economic position uses the
   * same construction as §13.10: cumulative cash plus the residual-balance
   * difference at that same row.
   */
  const horizons = useMemo(() => {
    if (!result || result.cumulativeDelta.length === 0) return [];
    const last = result.cumulativeDelta.length - 1;
    const indexes: Array<{ label: string; index: number }> = [];
    for (const horizon of HORIZONS) {
      const index = horizon.months - 1;
      if (index < last) indexes.push({ label: horizon.label, index });
    }
    indexes.push({ label: "At the common horizon", index: last });
    return indexes.map(({ label, index }) => {
      const point = result.cumulativeDelta[index]!;
      const residual = diffMajor(
        result.oldLoan.rows[index]!.closingBalance,
        result.newLoan.rows[index]!.closingBalance,
      );
      return {
        label,
        date: point.date,
        cash: point.delta,
        residual,
        economic: sumMajor([point.delta, residual]),
      };
    });
  }, [result]);

  const rateInput =(id: string, label: string, value: string, onChange: (v: string) => void) => (
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
          <div className="grid items-start gap-4 sm:grid-cols-2">
            {rateInput("ref-old-rate", "Current rate % p.a.", oldRateRaw, setOldRateRaw)}
            {rateInput("ref-old-years", "Remaining term (years)", remainingYearsRaw, setRemainingYearsRaw)}
          </div>
          <FieldGroup legend="The refinance offer">
            <div className="grid items-start gap-4 sm:grid-cols-2">
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
          <div className="nexus-result grid gap-6 p-6 md:p-8">
            <PrimaryResult
              label="Break-even"
              amount={moneyFromDecimalString("AUD", result.economicAdvantageAtHorizon, 2)}
              qualifier={
                result.breakEvenDate
                  ? `Ahead from ${result.breakEvenDate} after ${formatMajor(result.upfrontNetSwitchingCost)} net switching costs. The amount above is the economic advantage at the common horizon (${result.horizonDate}), including residual balances.`
                  : `No sustained break-even within the comparison horizon (${result.horizonDate ?? "term"}). The amount above is the position at the horizon, including residual balances.`
              }
            />
            <div className="grid gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
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
      explanation={
        horizons.length > 0 ? (
          <div className="nexus-panel-soft grid min-w-0 gap-6 p-6 md:p-8">
            <PanelHeading>Position at each horizon</PanelHeading>
            <div className="overflow-x-auto">
              <table className="nexus-table w-full min-w-[560px] border-collapse text-left">
                <caption className="sr-only">
                  Cumulative cash position, residual balance difference and combined economic
                  position of switching, at two years, five years and the common horizon
                </caption>
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    <th scope="col" className="py-2 pe-4 font-normal">Horizon</th>
                    <th scope="col" className="py-2 pe-4 font-normal">Date</th>
                    <th scope="col" className="py-2 pe-4 text-right font-normal">Cash position</th>
                    <th scope="col" className="py-2 pe-4 text-right font-normal">Balance difference</th>
                    <th scope="col" className="py-2 text-right font-normal">Economic position</th>
                  </tr>
                </thead>
                <tbody>
                  {horizons.map((horizon) => (
                    <tr key={horizon.label} className="border-b border-hairline">
                      <th scope="row" className="py-2 pe-4 font-mono text-[13px] font-normal text-ink-2">
                        {horizon.label}
                      </th>
                      <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink-2">
                        {horizon.date}
                      </td>
                      <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatSignedMajor(horizon.cash)}
                      </td>
                      <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatSignedMajor(horizon.residual)}
                      </td>
                      <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatSignedMajor(horizon.economic)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] leading-5 text-ink-3">
              A positive amount is the refinanced loan ahead; a negative amount is the current loan
              ahead. Cash position is cumulative payments and fees, net of switching costs and any
              counted cashback. Balance difference is what is still owed on the current loan minus
              what is still owed on the refinanced loan at that same date. Horizons past the shorter
              of the two schedules are not shown.
            </p>
          </div>
        ) : null
      }
      disclosure={<MortgageDisclosure />}
    />
  );
}
