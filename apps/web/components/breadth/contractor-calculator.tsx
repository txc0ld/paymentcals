"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  ToggleField,
  UniversalDisclosure,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString, moneyToDecimalString } from "@paymentcalcs/calculation-core";
import { contractorRates } from "@paymentcalcs/engine-business";
import { resolveRulePack, type ResolveOutcome } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, type GstRulePack } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const entry = getRegistryEntry("AU-BIZ-006")!;

export function ContractorCalculator() {
  const [incomeRaw, setIncomeRaw] = useState("");
  const [overheadsRaw, setOverheadsRaw] = useState("15000");
  const [utilisationPctRaw, setUtilisationPctRaw] = useState("85");
  const [gstRegistered, setGstRegistered] = useState(true);
  const [gstResolution, setGstResolution] = useState<ResolveOutcome | "pending">("pending");

  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "gst",
      jurisdiction: "AU",
      valuationDate: "2026-10-01",
      allowDraftRules,
    }).then((outcome) => {
      if (!cancelled) setGstResolution(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const income = useMemo(() => parseMoneyInput(incomeRaw), [incomeRaw]);
  const overheads = useMemo(() => parseMoneyInput(overheadsRaw), [overheadsRaw]);
  const utilisationValid = /^\d+(\.\d+)?$/.test(utilisationPctRaw.trim());

  const gstRate =
    gstRegistered && gstResolution !== "pending" && gstResolution.ok
      ? ((gstResolution.pack as GstRulePack).rules.standardRate ?? null)
      : null;

  const result = useMemo(() => {
    if (!income.ok || !utilisationValid) return null;
    return contractorRates({
      targetIncome: moneyToDecimalString(income.money),
      superReplacementRate: "0.12",
      annualLeaveDays: 20,
      personalLeaveDays: 10,
      publicHolidays: 11,
      nonBillableDays: 20,
      utilisation: (Number.parseFloat(utilisationPctRaw) / 100).toString(),
      hoursPerBillableDay: "7.6",
      overheadsAnnual: overheads.ok ? moneyToDecimalString(overheads.money) : "0",
      profitMargin: "0.1",
      gstRate,
    });
  }, [income, utilisationValid, utilisationPctRaw, overheads, gstRate]);

  const draft = gstResolution !== "pending" && gstResolution.ok && gstResolution.draft && gstRegistered;

  return (
    <>
      {draft ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: "Australia",
              periodLabel: "Capacity model",
              calculationClass: entry.calculationClass,
              ruleStatus:
                gstRegistered && gstResolution !== "pending" && !gstResolution.ok
                  ? { label: "GST rules unavailable", tone: "warn" }
                  : draft
                    ? { label: "Draft rules — not verified", tone: "draft" }
                    : { label: "Editable defaults", tone: "neutral" },
            }}
          />
        }
        inputs={
          <div className="grid gap-6">
            <MoneyField
              id="con-income"
              label="Target annual income (like a salary)"
              value={incomeRaw}
              onChange={setIncomeRaw}
              error={!income.ok && income.error ? income.error : undefined}
            />
            <MoneyField
              id="con-overheads"
              label="Annual overheads"
              description="Insurance, equipment, software, accounting, training and similar costs."
              value={overheadsRaw}
              onChange={setOverheadsRaw}
              error={!overheads.ok && overheads.error ? overheads.error : undefined}
            />
            <div className="grid gap-1.5">
              <label htmlFor="con-utilisation" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Billable utilisation %
              </label>
              <input
                id="con-utilisation"
                inputMode="decimal"
                value={utilisationPctRaw}
                onChange={(e) => setUtilisationPctRaw(e.target.value)}
                className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
              />
            </div>
            <ToggleField
              id="con-gst"
              label="Registered for GST"
              description="Adds GST on top of the quote. GST is never treated as your revenue."
              checked={gstRegistered}
              onChange={setGstRegistered}
            />
            <p className="text-[13px] leading-5 text-ink-3">
              Editable defaults: 12% super replacement, 20 days annual leave, 10 days personal
              leave, 11 public holidays, 20 non-billable days, 7.6-hour days, 10% risk margin.
            </p>
          </div>
        }
        results={
          !result ? (
            <EmptyState>Enter a target income to see the day rate that actually covers it.</EmptyState>
          ) : (
            <div className="nexus-result grid gap-6 p-6">
              <PrimaryResult
                label="Target day rate (excluding GST)"
                amount={moneyFromDecimalString("AUD", result.targetDayRate.toFixed(2), 2)}
                qualifier={`${result.billableDays.toFixed(0)} billable days from ${result.capacityDays} available. Break-even is ${formatMajor(result.breakEvenDayRate.toFixed(2))} per day; the target adds the risk margin.`}
              />
              <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
                <ResultMetric label="Hourly equivalent" amount={moneyFromDecimalString("AUD", result.targetHourlyRate.toFixed(2), 2)} />
                <ResultMetric
                  label="Super replacement"
                  amount={moneyFromDecimalString("AUD", result.superReplacement.toFixed(2), 2)}
                  detail="separate from spendable income"
                />
                {result.dayRateIncludingGst ? (
                  <ResultMetric
                    label="Invoice amount per day"
                    amount={moneyFromDecimalString("AUD", result.dayRateIncludingGst.toFixed(2), 2)}
                    detail="including GST, which is not revenue"
                  />
                ) : (
                  <div className="grid gap-1 rounded-[var(--pc-radius-control)] border border-hairline bg-surface p-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">GST</span>
                    <span className="text-[13px] leading-5 text-ink-2">Not registered; no GST added to the quote.</span>
                  </div>
                )}
              </div>
              {result.warnings.map((warning) => (
                <p key={warning} className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                  {warning}
                </p>
              ))}
            </div>
          )
        }
        explanation={null}
        disclosure={<UniversalDisclosure financialYear="current" />}
      />
    </>
  );
}
