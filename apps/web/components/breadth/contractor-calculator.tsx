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
  ScenarioActions,
  ToggleField,
  UniversalDisclosure,
  WorkingPanel,
  formatMoney,
  type WorkingSource,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString, moneyToDecimalString } from "@paymentcalcs/calculation-core";
import { WEEKDAYS_PER_YEAR, contractorRates } from "@paymentcalcs/engine-business";
import { resolveRulePack, type ResolveOutcome } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, type GstRulePack } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";
import { AdvancedGroup, NumberField } from "./advanced-group";

const entry = getRegistryEntry("AU-BIZ-006")!;

/** Capacity and cost defaults. Every one of them is editable below. */
const DEFAULTS = {
  overheads: "15000",
  utilisationPct: "85",
  superPct: "12",
  annualLeaveDays: "20",
  personalLeaveDays: "10",
  publicHolidays: "11",
  nonBillableDays: "20",
  hoursPerDay: "7.6",
  marginPct: "10",
};

const wholeDays = (raw: string) => /^\d{1,3}$/.test(raw.trim());
const percentUpTo = (raw: string, max: number) =>
  /^\d+(\.\d+)?$/.test(raw.trim()) && Number.parseFloat(raw) <= max;

export function ContractorCalculator() {
  const [incomeRaw, setIncomeRaw] = useState("");
  const [overheadsRaw, setOverheadsRaw] = useState(DEFAULTS.overheads);
  const [utilisationPctRaw, setUtilisationPctRaw] = useState(DEFAULTS.utilisationPct);
  const [gstRegistered, setGstRegistered] = useState(true);
  const [gstResolution, setGstResolution] = useState<ResolveOutcome | "pending">("pending");

  // Advanced capacity and cost assumptions — the engine's full input surface.
  const [superPctRaw, setSuperPctRaw] = useState(DEFAULTS.superPct);
  const [annualLeaveRaw, setAnnualLeaveRaw] = useState(DEFAULTS.annualLeaveDays);
  const [personalLeaveRaw, setPersonalLeaveRaw] = useState(DEFAULTS.personalLeaveDays);
  const [publicHolidaysRaw, setPublicHolidaysRaw] = useState(DEFAULTS.publicHolidays);
  const [nonBillableRaw, setNonBillableRaw] = useState(DEFAULTS.nonBillableDays);
  const [hoursPerDayRaw, setHoursPerDayRaw] = useState(DEFAULTS.hoursPerDay);
  const [marginPctRaw, setMarginPctRaw] = useState(DEFAULTS.marginPct);

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
  const utilisationValid = percentUpTo(utilisationPctRaw, 100);
  const superValid = percentUpTo(superPctRaw, 100);
  const marginValid = percentUpTo(marginPctRaw, 200);
  const hoursValid =
    /^\d+(\.\d+)?$/.test(hoursPerDayRaw.trim()) &&
    Number.parseFloat(hoursPerDayRaw) > 0 &&
    Number.parseFloat(hoursPerDayRaw) <= 24;
  const daysValid =
    wholeDays(annualLeaveRaw) &&
    wholeDays(personalLeaveRaw) &&
    wholeDays(publicHolidaysRaw) &&
    wholeDays(nonBillableRaw);
  const advancedValid = superValid && marginValid && hoursValid && daysValid;

  const gstRate =
    gstRegistered && gstResolution !== "pending" && gstResolution.ok
      ? ((gstResolution.pack as GstRulePack).rules.standardRate ?? null)
      : null;

  const runAtUtilisation = useMemo(() => {
    if (!income.ok || !advancedValid) return null;
    const base = {
      targetIncome: moneyToDecimalString(income.money),
      superReplacementRate: (Number.parseFloat(superPctRaw) / 100).toString(),
      annualLeaveDays: Number.parseInt(annualLeaveRaw, 10),
      personalLeaveDays: Number.parseInt(personalLeaveRaw, 10),
      publicHolidays: Number.parseInt(publicHolidaysRaw, 10),
      nonBillableDays: Number.parseInt(nonBillableRaw, 10),
      hoursPerBillableDay: hoursPerDayRaw.trim(),
      overheadsAnnual: overheads.ok ? moneyToDecimalString(overheads.money) : "0",
      profitMargin: (Number.parseFloat(marginPctRaw) / 100).toString(),
      gstRate,
    };
    return (utilisationPct: number) =>
      contractorRates({ ...base, utilisation: (utilisationPct / 100).toString() });
  }, [
    income,
    advancedValid,
    superPctRaw,
    annualLeaveRaw,
    personalLeaveRaw,
    publicHolidaysRaw,
    nonBillableRaw,
    hoursPerDayRaw,
    overheads,
    marginPctRaw,
    gstRate,
  ]);

  const result = useMemo(() => {
    if (!runAtUtilisation || !utilisationValid) return null;
    return runAtUtilisation(Number.parseFloat(utilisationPctRaw));
  }, [runAtUtilisation, utilisationValid, utilisationPctRaw]);

  // Rate sensitivity: the same engine re-run at ±10 percentage points of
  // utilisation, clamped to the 1–100% domain. All figures exclude GST.
  const sensitivity = useMemo(() => {
    if (!runAtUtilisation || !utilisationValid) return null;
    const chosen = Number.parseFloat(utilisationPctRaw);
    const points = [chosen - 10, chosen, chosen + 10]
      .map((pct) => Math.min(100, Math.max(1, Math.round(pct * 100) / 100)))
      .filter((pct, index, all) => all.indexOf(pct) === index);
    return points.map((pct) => ({ pct, run: runAtUtilisation(pct), chosen: pct === chosen }));
  }, [runAtUtilisation, utilisationValid, utilisationPctRaw]);

  const draft = gstResolution !== "pending" && gstResolution.ok && gstResolution.draft && gstRegistered;

  const sources: WorkingSource[] =
    gstRate !== null && gstResolution !== "pending" && gstResolution.ok
      ? gstResolution.pack.sources.map((source) => ({
          title: `${source.authority} — ${source.title}`,
          url: source.url,
          detail: `retrieved ${source.retrievedAt.slice(0, 10)}`,
        }))
      : [];

  function onReset() {
    setIncomeRaw("");
    setOverheadsRaw(DEFAULTS.overheads);
    setUtilisationPctRaw(DEFAULTS.utilisationPct);
    setGstRegistered(true);
    setSuperPctRaw(DEFAULTS.superPct);
    setAnnualLeaveRaw(DEFAULTS.annualLeaveDays);
    setPersonalLeaveRaw(DEFAULTS.personalLeaveDays);
    setPublicHolidaysRaw(DEFAULTS.publicHolidays);
    setNonBillableRaw(DEFAULTS.nonBillableDays);
    setHoursPerDayRaw(DEFAULTS.hoursPerDay);
    setMarginPctRaw(DEFAULTS.marginPct);
  }

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
            methodologyHref={`/methodology/${entry.slug}`}
            actions={<ScenarioActions onReset={onReset} />}
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
            <AdvancedGroup
              legend="Capacity and cost assumptions"
              hint={`These open at the modelled defaults. The year starts from ${WEEKDAYS_PER_YEAR} weekdays, and everything you enter here is subtracted from it or priced into the rate.`}
            >
              <div className="grid items-start gap-4 @md:grid-cols-2">
                <NumberField
                  id="con-annual-leave"
                  label="Annual leave days"
                  value={annualLeaveRaw}
                  onChange={setAnnualLeaveRaw}
                  unit="days"
                  inputMode="numeric"
                  error={wholeDays(annualLeaveRaw) ? undefined : "Whole days only."}
                />
                <NumberField
                  id="con-personal-leave"
                  label="Personal leave days"
                  value={personalLeaveRaw}
                  onChange={setPersonalLeaveRaw}
                  unit="days"
                  inputMode="numeric"
                  error={wholeDays(personalLeaveRaw) ? undefined : "Whole days only."}
                />
                <NumberField
                  id="con-public-holidays"
                  label="Public holidays"
                  value={publicHolidaysRaw}
                  onChange={setPublicHolidaysRaw}
                  unit="days"
                  inputMode="numeric"
                  error={wholeDays(publicHolidaysRaw) ? undefined : "Whole days only."}
                />
                <NumberField
                  id="con-non-billable"
                  label="Non-billable days"
                  description="Admin, marketing, proposals and training days you do not invoice."
                  value={nonBillableRaw}
                  onChange={setNonBillableRaw}
                  unit="days"
                  inputMode="numeric"
                  error={wholeDays(nonBillableRaw) ? undefined : "Whole days only."}
                />
              </div>
              <div className="grid items-start gap-4 @md:grid-cols-2">
                <NumberField
                  id="con-hours"
                  label="Hours per billable day"
                  value={hoursPerDayRaw}
                  onChange={setHoursPerDayRaw}
                  unit="hrs"
                  error={hoursValid ? undefined : "Enter hours above 0 and up to 24."}
                />
                <NumberField
                  id="con-super"
                  label="Super replacement %"
                  description="Set aside on top of the income, in place of employer super."
                  value={superPctRaw}
                  onChange={setSuperPctRaw}
                  unit="%"
                  error={superValid ? undefined : "Enter a percentage up to 100."}
                />
              </div>
              <NumberField
                id="con-margin"
                label="Risk margin %"
                description="Added on top of break-even revenue to cover variability and profit."
                value={marginPctRaw}
                onChange={setMarginPctRaw}
                unit="%"
                error={marginValid ? undefined : "Enter a percentage up to 200."}
              />
            </AdvancedGroup>
          </div>
        }
        results={
          !result ? (
            <EmptyState>Enter a target income to see the day rate that actually covers it.</EmptyState>
          ) : (
            <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
              <PrimaryResult
                label="Target day rate (excluding GST)"
                amount={moneyFromDecimalString("AUD", result.targetDayRate.toFixed(2), 2)}
                qualifier={`${result.billableDays.toFixed(0)} billable days from ${result.capacityDays} available. Break-even is ${formatMajor(result.breakEvenDayRate.toFixed(2))} per day; the target adds the risk margin.`}
              />
              <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 @xl:grid-cols-3">
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
                  <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">GST</span>
                    <span className="text-[13px] leading-5 text-ink-2">Not registered; no GST added to the quote.</span>
                  </div>
                )}
              </div>
              {sensitivity && sensitivity.length > 1 ? (
                <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                    Rate sensitivity to utilisation (excluding GST)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="nexus-table w-full min-w-[360px] border-collapse text-left">
                      <caption className="sr-only">
                        Target day rate at utilisation ten points below, at, and ten points above the
                        chosen figure
                      </caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">Utilisation</th>
                          <th scope="col" className="py-2 pe-4 text-right font-normal">Billable days</th>
                          <th scope="col" className="py-2 text-right font-normal">Day rate ex GST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivity.map((row) => (
                          <tr key={row.pct} className="border-b border-hairline last:border-b-0">
                            <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink">
                              {row.pct}%
                              {row.chosen ? (
                                <span className="ms-2 border-b-2 border-accent pb-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                                  chosen
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                              {row.run.billableDays.toFixed(0)}
                            </td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                              {formatMoney(moneyFromDecimalString("AUD", row.run.targetDayRate.toFixed(2), 2))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[12px] leading-5 text-ink-3">
                    GST is quoted separately from every figure in this table; it is never treated as
                    revenue.
                  </p>
                </div>
              ) : null}
              {result.warnings.map((warning) => (
                <p key={warning} className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                  {warning}
                </p>
              ))}
            </div>
          )
        }
        explanation={
          <WorkingPanel
            summary={
              result
                ? `The year starts at ${WEEKDAYS_PER_YEAR} weekdays. Leave, public holidays and non-billable days come off it, utilisation is applied to what is left, and the revenue that covers your income, super replacement and overheads — plus the risk margin — is divided across those billable days.`
                : "Enter a target annual income to see the day rate and the working behind it."
            }
            steps={[
              `capacity days = ${WEEKDAYS_PER_YEAR} − public holidays − annual leave − personal leave − non-billable days`,
              "billable days = capacity days × utilisation",
              "super replacement = target income × super replacement rate",
              "break-even revenue = target income + super replacement + annual overheads",
              "target revenue = break-even revenue × (1 + risk margin)",
              "target day rate = target revenue ÷ billable days",
              "hourly equivalent = target day rate ÷ hours per billable day",
              "GST, when registered, is added to the day rate and shown separately",
            ]}
            assumptions={[
              "Every figure on this route is your own entry or an editable default. Nothing here is a published rate or an award condition.",
              "Utilisation applies to the days that remain after leave and non-billable days, so it is not double-counted.",
              "Super replacement is money set aside, not spendable income, and no contribution cap or tax treatment is applied.",
              "GST collected is held for the ATO and is never counted as revenue in any figure above.",
            ]}
            sources={sources}
            limitations={[
              "Income tax, PAYG instalments, deductions, entity structure and personal services income rules are out of scope.",
              "Insurance, workers compensation, licensing obligations and superannuation guarantee obligations to others are not assessed.",
              "Whether you are or must be registered for GST is your selection, not a determination made here.",
              "Result accuracy class B: a capacity model built entirely on the assumptions you set.",
            ]}
          />
        }
        disclosure={<UniversalDisclosure financialYear="current" />}
      />
    </>
  );
}
