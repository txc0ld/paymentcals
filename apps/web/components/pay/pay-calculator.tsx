"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalculationResultV1, Money } from "@paymentcalcs/calculation-core";
import { Dec, moneyToDecimal, type DecimalValue } from "@paymentcalcs/calculation-core";
import {
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  EngineFailureState,
  ExplainabilityTabs,
  FieldGroup,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  RuleUnavailableState,
  SegmentedControl,
  SelectField,
  ToggleField,
  UniversalDisclosure,
  formatMoney,
  formatRatePercent,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import {
  calculateAuPay,
  zAuPayInput,
  type AuPayInput,
  type AuPayOutput,
} from "@paymentcalcs/engine-au-tax";
import { decodeUrlState, encodeUrlState } from "@paymentcalcs/scenario-schema";
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { FINANCIAL_YEARS, resolvePayPacks, type FinancialYear, type PayResolutionOutcome } from "../../lib/pay-packs";
import { saveScenario } from "../../lib/scenario-store";

export interface PayVariant {
  calculatorId: string;
  primaryMetric: "netPerCycle" | "netAnnual" | "annualBase" | "impliedHourly";
  primaryLabel: string;
  defaults?: Partial<PayFormState>;
  simpleShowsHours?: boolean;
  intro?: string;
}

export interface PayFormState {
  financialYear: FinancialYear;
  amountRaw: string;
  frequency: "annually" | "monthly" | "fortnightly" | "weekly" | "hourly";
  includesSuper: boolean;
  residency: "resident" | "foreign_resident" | "working_holiday_maker";
  helpDebt: boolean;
  claimsTFT: boolean;
  superRateRaw: string;
  hoursPerWeekRaw: string;
  weeksPaidRaw: string;
  salarySacrificeRaw: string;
  otherPreTaxRaw: string;
  postTaxRaw: string;
  bonusRaw: string;
  otherIncomeRaw: string;
  deductionsRaw: string;
  rfbRaw: string;
  medicareStatus: "standard" | "half_exemption" | "full_exemption";
  privateCover: boolean;
  familyStatus: "single" | "family";
  dependantsRaw: string;
  spouseIncomeRaw: string;
  payCycle: "weekly" | "fortnightly" | "monthly" | "quarterly";
  additionalWithholdingRaw: string;
}

const DEFAULT_STATE: PayFormState = {
  financialYear: "2026-27",
  amountRaw: "",
  frequency: "annually",
  includesSuper: false,
  residency: "resident",
  helpDebt: false,
  claimsTFT: true,
  superRateRaw: "",
  hoursPerWeekRaw: "38",
  weeksPaidRaw: "52",
  salarySacrificeRaw: "",
  otherPreTaxRaw: "",
  postTaxRaw: "",
  bonusRaw: "",
  otherIncomeRaw: "",
  deductionsRaw: "",
  rfbRaw: "",
  medicareStatus: "standard",
  privateCover: false,
  familyStatus: "single",
  dependantsRaw: "0",
  spouseIncomeRaw: "",
  payCycle: "fortnightly",
  additionalWithholdingRaw: "",
};

const LIMITATIONS = [
  "This is an annual estimate under the selected financial year's rules, not a tax return or payroll system. Actual withholding, offsets, deductions and assessments may differ.",
  "Only the offsets and levies listed in the breakdown are modelled. Other offsets, HECS-adjacent loan types with special rules, and partial-year employment are not yet supported.",
  "The family Medicare levy reduction is an estimate: apportionment between spouses is not modelled.",
  "Employer super is shown separately and never counted as take-home cash.",
  "Result accuracy class B: rule-based estimate on your inputs under the resolved rule packs.",
];

function parseOptionalMoney(raw: string, errors: Record<string, string>, key: string): Money | undefined {
  if (raw.trim() === "") return undefined;
  const parsed = parseMoneyInput(raw);
  if (!parsed.ok) {
    if (parsed.error) errors[key] = parsed.error;
    return undefined;
  }
  return parsed.money;
}

function buildInput(state: PayFormState): { input: AuPayInput | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const amount = parseMoneyInput(state.amountRaw);
  if (!amount.ok) {
    if (amount.error) errors.amount = amount.error;
    return { input: null, errors };
  }
  if (state.frequency === "hourly" && !/^\d+(\.\d+)?$/.test(state.hoursPerWeekRaw.trim())) {
    errors.hours = "Enter your ordinary hours per week.";
  }
  if (!/^\d+(\.\d+)?$/.test(state.weeksPaidRaw.trim())) {
    errors.weeks = "Weeks paid per year must be a number.";
  }
  if (state.superRateRaw.trim() !== "" && !/^\d+(\.\d+)?$/.test(state.superRateRaw.trim())) {
    errors.superRate = "Enter the employer super rate as a percentage, like 12.";
  }
  if (!/^\d{1,2}$/.test(state.dependantsRaw.trim())) {
    errors.dependants = "Dependants must be a whole number.";
  }
  const candidate = {
    financialYear: state.financialYear,
    income: {
      amount: amount.money,
      frequency: state.frequency,
      ...(state.frequency === "hourly" ? { ordinaryHoursPerWeek: state.hoursPerWeekRaw.trim() } : {}),
      weeksPaidPerYear: state.weeksPaidRaw.trim() || "52",
    },
    package: {
      treatment: state.includesSuper ? "total_package_including_super" : "base_plus_super",
      employerSuperRate:
        state.superRateRaw.trim() === ""
          ? null
          : new Dec(state.superRateRaw.trim()).div(100).toString(),
      applyMaximumContributionBase: true,
    },
    taxpayer: {
      residency: state.residency,
      claimsTaxFreeThreshold: state.claimsTFT,
      medicare: {
        status: state.medicareStatus,
        hasPrivateHospitalCover: state.privateCover,
        familyStatus: state.familyStatus,
        dependants: Number(state.dependantsRaw.trim() || "0"),
        ...(state.spouseIncomeRaw.trim()
          ? { spouseIncome: parseOptionalMoney(state.spouseIncomeRaw, errors, "spouseIncome") }
          : {}),
      },
    },
    adjustments: {
      ...(state.bonusRaw.trim() ? { bonus: parseOptionalMoney(state.bonusRaw, errors, "bonus") } : {}),
      ...(state.otherIncomeRaw.trim()
        ? { otherAssessableIncome: parseOptionalMoney(state.otherIncomeRaw, errors, "otherIncome") }
        : {}),
      ...(state.salarySacrificeRaw.trim()
        ? { salarySacrificeSuper: parseOptionalMoney(state.salarySacrificeRaw, errors, "salarySacrifice") }
        : {}),
      ...(state.otherPreTaxRaw.trim()
        ? { otherPreTaxDeductions: parseOptionalMoney(state.otherPreTaxRaw, errors, "otherPreTax") }
        : {}),
      ...(state.postTaxRaw.trim()
        ? { postTaxDeductions: parseOptionalMoney(state.postTaxRaw, errors, "postTax") }
        : {}),
      ...(state.deductionsRaw.trim()
        ? { workRelatedDeductions: parseOptionalMoney(state.deductionsRaw, errors, "deductions") }
        : {}),
      ...(state.rfbRaw.trim() ? { reportableFringeBenefits: parseOptionalMoney(state.rfbRaw, errors, "rfb") } : {}),
    },
    studyLoans: { enabled: state.helpDebt },
    withholding: {
      payFrequency: state.payCycle,
      ...(state.additionalWithholdingRaw.trim()
        ? { additionalPerPeriod: parseOptionalMoney(state.additionalWithholdingRaw, errors, "additional") }
        : {}),
    },
  };
  if (Object.keys(errors).length > 0) return { input: null, errors };
  const parsed = zAuPayInput.safeParse(candidate);
  if (!parsed.success) {
    errors.form = parsed.error.issues[0]?.message ?? "Check the highlighted fields.";
    return { input: null, errors };
  }
  return { input: parsed.data, errors };
}

function primaryAmount(variant: PayVariant, output: AuPayOutput, state: PayFormState): Money {
  switch (variant.primaryMetric) {
    case "netAnnual":
      return output.netAnnualCash;
    case "annualBase":
      return output.annualised.baseSalary;
    case "impliedHourly": {
      const hours = new Dec(state.hoursPerWeekRaw.trim() || "38");
      const weeks = new Dec(state.weeksPaidRaw.trim() || "52");
      const annual = moneyToDecimal(output.annualised.baseSalary) as DecimalValue;
      const divisor = hours.times(weeks);
      const hourly = divisor.isZero() ? new Dec(0) : annual.div(divisor);
      return {
        ...output.annualised.baseSalary,
        minorUnits: hourly.times(100).toDecimalPlaces(0, Dec.ROUND_HALF_UP).toFixed(0),
      };
    }
    default:
      return output.netPerCycle;
  }
}

const CYCLE_LABEL: Record<PayFormState["payCycle"], string> = {
  weekly: "per week",
  fortnightly: "per fortnight",
  monthly: "per month",
  quarterly: "per quarter",
};

export function PayCalculator({ variant }: { variant: PayVariant }) {
  const entry = getRegistryEntry(variant.calculatorId)!;
  const [state, setState] = useState<PayFormState>({ ...DEFAULT_STATE, ...variant.defaults });
  const [uiMode, setUiMode] = useState<"simple" | "advanced">("simple");
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");
  const [result, setResult] = useState<CalculationResultV1<AuPayOutput> | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedOnce = useRef(false);

  const patch = (partial: Partial<PayFormState>) => setState((s) => ({ ...s, ...partial }));

  useEffect(() => {
    let cancelled = false;
    setResolution("pending");
    resolvePayPacks(state.financialYear).then((outcome) => {
      if (cancelled) return;
      setResolution(outcome);
      if (!outcome.ok) {
        analytics.track("rule_unavailable_shown", { calculator_id: entry.id, rule_status: "unavailable" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.financialYear, entry.id]);

  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    const param = new URLSearchParams(window.location.search).get("s");
    if (param) {
      const decoded = decodeUrlState(param);
      if (
        decoded.ok &&
        decoded.state.calculatorId === entry.id &&
        typeof decoded.state.input === "object" &&
        decoded.state.input !== null
      ) {
        const saved = decoded.state.input as Partial<PayFormState> & { uiMode?: "simple" | "advanced" };
        const stringKeys = Object.fromEntries(
          Object.entries(saved).filter(([k, v]) => k in DEFAULT_STATE && (typeof v === "string" || typeof v === "boolean")),
        );
        setState((s) => ({ ...s, ...stringKeys }));
        if (saved.uiMode === "advanced") setUiMode("advanced");
      }
    }
    setHydrated(true);
  }, [entry.id]);

  const { input, errors } = useMemo(() => buildInput(state), [state]);

  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !input) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const started = performance.now();
    calculateAuPay(
      {
        requestId: "web-live",
        calculatorId: entry.id,
        calculatorSchemaVersion: entry.inputSchemaVersion,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        valuationDate: `${state.financialYear.slice(0, 4)}-10-01`,
        input,
        options: { traceLevel: "full" },
      },
      resolution.resolution,
      { now: new Date().toISOString() },
    ).then((calculated) => {
      if (cancelled) return;
      setResult(calculated);
      const succeeded = calculated.status === "success" || calculated.status === "success_with_warnings";
      analytics.track(succeeded ? "calculation_completed" : "calculation_failed", {
        calculator_id: entry.id,
        mode: uiMode,
        financial_year: state.financialYear,
        has_warnings: calculated.warnings.length > 0,
        duration_bucket: performance.now() - started < 100 ? "under_100ms" : "under_750ms",
        ...(succeeded ? {} : { error_code: calculated.errors[0]?.code ?? "PC-CALC-0000" }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [resolution, input, uiMode, entry.id, entry.inputSchemaVersion, state.financialYear]);

  useEffect(() => {
    if (!hydrated) return;
    const encoded = encodeUrlState({ calculatorId: entry.id, input: { ...state, uiMode } });
    const url = new URL(window.location.href);
    url.searchParams.set("s", encoded);
    window.history.replaceState(null, "", url);
  }, [hydrated, state, uiMode, entry.id]);

  async function onSave() {
    const now = new Date().toISOString();
    try {
      await saveScenario({
        scenarioId: `sc_${crypto.randomUUID().slice(0, 8)}`,
        schemaVersion: "1",
        calculatorId: entry.id,
        createdAt: now,
        updatedAt: now,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        input: { ...state, uiMode },
        selectedRulePacks:
          resolution !== "pending" && resolution.ok
            ? [resolution.resolution.incomeTax.pack.rulePackId]
            : [],
        consent: { storage: "local" },
      });
      setSavedFlash("Saved on this device");
      analytics.track("scenario_action", { calculator_id: entry.id, action: "save" });
    } catch {
      setSavedFlash("Saving is unavailable in this browser");
    }
    setTimeout(() => setSavedFlash(null), 2500);
  }

  async function onShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSavedFlash("Link copied");
      analytics.track("scenario_action", { calculator_id: entry.id, action: "share" });
    } catch {
      setSavedFlash("Copy the address bar URL to share");
    }
    setTimeout(() => setSavedFlash(null), 2500);
  }

  const draft = resolution !== "pending" && resolution.ok && resolution.draft;
  const output = result?.output;
  const showHours = state.frequency === "hourly" || variant.simpleShowsHours === true;

  return (
    <>
      {draft ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: "Australia",
              periodLabel: `FY ${state.financialYear}`,
              calculationClass: entry.calculationClass,
              ruleStatus:
                resolution === "pending"
                  ? { label: "Resolving rules", tone: "neutral" }
                  : resolution.ok
                    ? resolution.draft
                      ? { label: "Draft rules — not verified", tone: "draft" }
                      : { label: "Current", tone: "neutral" }
                    : { label: "Rules unavailable", tone: "warn" },
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
            actions={
              <span className="no-print flex items-center gap-2">
                {savedFlash ? (
                  <span role="status" className="font-mono text-[10px] uppercase tracking-[0.14em] text-positive">
                    {savedFlash}
                  </span>
                ) : null}
                {(
                  [
                    ["Save", onSave],
                    ["Share", onShare],
                    ["Print", () => window.print()],
                    ["Reset", () => setState({ ...DEFAULT_STATE, ...variant.defaults })],
                  ] as const
                ).map(([label, handler]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={handler}
                    className="nexus-quiet-button min-h-9 px-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {label}
                  </button>
                ))}
              </span>
            }
          />
        }
        inputs={
          resolution !== "pending" && !resolution.ok ? (
            <RuleUnavailableState jurisdictionLabel={`Australia FY ${state.financialYear}`} detail={resolution.reason} />
          ) : (
            <div className="grid gap-6">
              {variant.intro ? <p className="text-[13px] leading-5 text-ink-3">{variant.intro}</p> : null}
              <SelectField
                id="pay-fy"
                label="Financial year"
                value={state.financialYear}
                onChange={(financialYear) => patch({ financialYear })}
                options={FINANCIAL_YEARS.map((fy) => ({ value: fy, label: `FY ${fy}` }))}
              />
              <MoneyField
                id="pay-amount"
                label={state.includesSuper ? "Package amount (including super)" : "Income amount"}
                value={state.amountRaw}
                onChange={(amountRaw) => patch({ amountRaw })}
                error={errors.amount}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  id="pay-frequency"
                  label="Amount is per"
                  value={state.frequency}
                  onChange={(frequency) => patch({ frequency })}
                  options={[
                    { value: "annually", label: "Year" },
                    { value: "monthly", label: "Month" },
                    { value: "fortnightly", label: "Fortnight" },
                    { value: "weekly", label: "Week" },
                    { value: "hourly", label: "Hour" },
                  ]}
                />
                <SelectField
                  id="pay-residency"
                  label="Residency for tax"
                  value={state.residency}
                  onChange={(residency) => patch({ residency })}
                  options={[
                    { value: "resident", label: "Australian resident" },
                    { value: "foreign_resident", label: "Foreign resident" },
                    { value: "working_holiday_maker", label: "Working holiday maker" },
                  ]}
                />
              </div>
              {showHours ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label htmlFor="pay-hours" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                      Ordinary hours per week
                    </label>
                    <input
                      id="pay-hours"
                      inputMode="decimal"
                      value={state.hoursPerWeekRaw}
                      onChange={(e) => patch({ hoursPerWeekRaw: e.target.value })}
                      aria-invalid={errors.hours ? true : undefined}
                      className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
                    />
                    {errors.hours ? (
                      <span role="alert" className="text-[12px] text-error">
                        {errors.hours}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="pay-weeks" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                      Weeks paid per year
                    </label>
                    <input
                      id="pay-weeks"
                      inputMode="decimal"
                      value={state.weeksPaidRaw}
                      onChange={(e) => patch({ weeksPaidRaw: e.target.value })}
                      aria-invalid={errors.weeks ? true : undefined}
                      className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
                    />
                  </div>
                </div>
              ) : null}
              <ToggleField
                id="pay-includes-super"
                label="Amount includes employer super"
                description="On for a total remuneration package; the base salary is derived."
                checked={state.includesSuper}
                onChange={(includesSuper) => patch({ includesSuper })}
              />
              <ToggleField
                id="pay-help"
                label="HELP or other study loan"
                description="Adds the compulsory study-loan repayment and its withholding component."
                checked={state.helpDebt}
                onChange={(helpDebt) => patch({ helpDebt })}
              />

              {uiMode === "advanced" ? (
                <>
                  <FieldGroup legend="Withholding settings">
                    <SelectField
                      id="pay-cycle"
                      label="Pay cycle"
                      value={state.payCycle}
                      onChange={(payCycle) => patch({ payCycle })}
                      options={[
                        { value: "weekly", label: "Weekly" },
                        { value: "fortnightly", label: "Fortnightly" },
                        { value: "monthly", label: "Monthly" },
                        { value: "quarterly", label: "Quarterly" },
                      ]}
                    />
                    <ToggleField
                      id="pay-tft"
                      label="Claims the tax-free threshold"
                      description="Affects employer withholding only, not the annual liability."
                      checked={state.claimsTFT}
                      onChange={(claimsTFT) => patch({ claimsTFT })}
                    />
                    <MoneyField
                      id="pay-additional"
                      label="Additional withholding per pay"
                      value={state.additionalWithholdingRaw}
                      onChange={(additionalWithholdingRaw) => patch({ additionalWithholdingRaw })}
                      error={errors.additional}
                    />
                  </FieldGroup>
                  <FieldGroup legend="Super and packaging">
                    <div className="grid gap-1.5">
                      <label htmlFor="pay-super-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                        Employer super rate % (blank = official rate)
                      </label>
                      <input
                        id="pay-super-rate"
                        inputMode="decimal"
                        placeholder="12"
                        value={state.superRateRaw}
                        onChange={(e) => patch({ superRateRaw: e.target.value })}
                        aria-invalid={errors.superRate ? true : undefined}
                        className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
                      />
                      {errors.superRate ? (
                        <span role="alert" className="text-[12px] text-error">
                          {errors.superRate}
                        </span>
                      ) : null}
                    </div>
                    <MoneyField
                      id="pay-sacrifice"
                      label="Salary sacrifice to super (annual)"
                      value={state.salarySacrificeRaw}
                      onChange={(salarySacrificeRaw) => patch({ salarySacrificeRaw })}
                      error={errors.salarySacrifice}
                    />
                  </FieldGroup>
                  <FieldGroup legend="Income adjustments (annual)">
                    <MoneyField id="pay-bonus" label="Bonus and commission" value={state.bonusRaw} onChange={(bonusRaw) => patch({ bonusRaw })} error={errors.bonus} />
                    <MoneyField id="pay-other-income" label="Other assessable income" value={state.otherIncomeRaw} onChange={(otherIncomeRaw) => patch({ otherIncomeRaw })} error={errors.otherIncome} />
                    <MoneyField id="pay-deductions" label="Work-related deductions" value={state.deductionsRaw} onChange={(deductionsRaw) => patch({ deductionsRaw })} error={errors.deductions} />
                    <MoneyField id="pay-pretax" label="Other pre-tax deductions" value={state.otherPreTaxRaw} onChange={(otherPreTaxRaw) => patch({ otherPreTaxRaw })} error={errors.otherPreTax} />
                    <MoneyField id="pay-posttax" label="Post-tax deductions" value={state.postTaxRaw} onChange={(postTaxRaw) => patch({ postTaxRaw })} error={errors.postTax} />
                    <MoneyField id="pay-rfb" label="Reportable fringe benefits" value={state.rfbRaw} onChange={(rfbRaw) => patch({ rfbRaw })} error={errors.rfb} />
                  </FieldGroup>
                  <FieldGroup legend="Medicare and family">
                    <SelectField
                      id="pay-medicare"
                      label="Medicare levy status"
                      value={state.medicareStatus}
                      onChange={(medicareStatus) => patch({ medicareStatus })}
                      options={[
                        { value: "standard", label: "Standard" },
                        { value: "half_exemption", label: "Half exemption" },
                        { value: "full_exemption", label: "Full exemption" },
                      ]}
                    />
                    <ToggleField
                      id="pay-cover"
                      label="Private hospital cover held all year"
                      description="Without cover the Medicare levy surcharge can apply above the income thresholds."
                      checked={state.privateCover}
                      onChange={(privateCover) => patch({ privateCover })}
                    />
                    <SelectField
                      id="pay-family"
                      label="Family status for Medicare"
                      value={state.familyStatus}
                      onChange={(familyStatus) => patch({ familyStatus })}
                      options={[
                        { value: "single", label: "Single" },
                        { value: "family", label: "Family / couple" },
                      ]}
                    />
                    {state.familyStatus === "family" ? (
                      <>
                        <MoneyField
                          id="pay-spouse"
                          label="Spouse taxable income (annual)"
                          value={state.spouseIncomeRaw}
                          onChange={(spouseIncomeRaw) => patch({ spouseIncomeRaw })}
                          error={errors.spouseIncome}
                        />
                        <div className="grid gap-1.5">
                          <label htmlFor="pay-dependants" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                            Dependent children
                          </label>
                          <input
                            id="pay-dependants"
                            inputMode="numeric"
                            value={state.dependantsRaw}
                            onChange={(e) => patch({ dependantsRaw: e.target.value })}
                            aria-invalid={errors.dependants ? true : undefined}
                            className="nexus-input min-h-11 w-24 bg-surface px-3 text-center font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
                          />
                        </div>
                      </>
                    ) : null}
                  </FieldGroup>
                </>
              ) : null}
            </div>
          )
        }
        results={
          resolution !== "pending" && !resolution.ok ? (
            <EmptyState>No result can be shown while the required rule packs are unavailable.</EmptyState>
          ) : result && !output && result.errors.length > 0 ? (
            result.status === "invalid" ? (
              <EmptyState>{result.errors[0]?.message ?? "Check the highlighted fields."}</EmptyState>
            ) : (
              <EngineFailureState referenceId={result.calculationId} />
            )
          ) : !output ? (
            <EmptyState>
              Enter your income to see take-home pay, the full annual tax position and the estimated
              employer withholding, each shown separately.
            </EmptyState>
          ) : (
            <div className="grid gap-5">
              <div className="nexus-result grid gap-6 p-6">
                <PrimaryResult
                  label={
                    variant.primaryMetric === "netPerCycle"
                      ? `${variant.primaryLabel} ${CYCLE_LABEL[state.payCycle]}`
                      : variant.primaryLabel
                  }
                  amount={primaryAmount(variant, output, state)}
                  qualifier={`Annual estimate under FY ${state.financialYear} rules. Marginal bracket ${formatRatePercent(output.liability.marginalBracketRate)}; the next $1,000 of gross is worth ${formatMoney(output.netValueOfNextThousand)} after obligations.`}
                />
                <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-3">
                  <ResultMetric label="Net per year" amount={output.netAnnualCash} />
                  <ResultMetric label="Base salary" amount={output.annualised.baseSalary} />
                  <ResultMetric label="Employer super" amount={output.annualised.employerSuper} detail="Paid to your fund, not cash" />
                </div>
              </div>

              <section aria-label="Annual tax position" className="nexus-panel-soft grid gap-3 p-5">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-ink-2">Annual tax position (estimate)</h2>
                <dl className="grid gap-2">
                  {(
                    [
                      ["Taxable income", output.liability.taxableIncome],
                      ["Income tax", output.liability.grossIncomeTax],
                      ["Low income tax offset", output.liability.litoOffset],
                      ["Medicare levy", output.liability.medicareLevy],
                      ["Medicare levy surcharge", output.liability.medicareLevySurcharge],
                      ["Study loan repayment", output.liability.studyLoanRepayment],
                      ["Total annual liability", output.liability.totalAnnualLiability],
                    ] as const
                  ).map(([label, amount]) => (
                    <div key={label} className="flex items-baseline justify-between gap-6 border-b border-hairline pb-1.5 last:border-b-2 last:border-hairline-strong">
                      <dt className="text-[13px] text-ink-2">{label}</dt>
                      <dd className="font-mono text-[14px] tabular-nums text-ink">{formatMoney(amount)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-label="Estimated employer withholding" className="nexus-panel-soft grid gap-3 p-5">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-ink-2">
                  Estimated employer withholding ({CYCLE_LABEL[state.payCycle]})
                </h2>
                {output.withholding ? (
                  <>
                    <dl className="grid gap-2">
                      {(
                        [
                          ["PAYG withholding", output.withholding.perCycleOrdinary],
                          ["Study loan component", output.withholding.perCycleStudyLoan],
                          ["Additional withholding", output.withholding.perCycleAdditional],
                          ["Total withheld per pay", output.withholding.perCycleTotal],
                        ] as const
                      ).map(([label, amount]) => (
                        <div key={label} className="flex items-baseline justify-between gap-6 border-b border-hairline pb-1.5">
                          <dt className="text-[13px] text-ink-2">{label}</dt>
                          <dd className="font-mono text-[14px] tabular-nums text-ink">{formatMoney(amount)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-[12px] leading-5 text-ink-3">
                      Annualised withholding {formatMoney(output.withholding.annualised)} differs from the
                      annual liability by {formatMoney(output.withholding.varianceFromAnnualLiability)}.
                      Withholding follows the ATO schedule for your pay cycle; the annual position settles
                      at tax time. These figures are deliberately not interchangeable.
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] leading-5 text-ink-2">{output.withholdingUnavailableReason}</p>
                )}
              </section>

              {result && result.warnings.length > 0 ? (
                <ul className="grid gap-2">
                  {result.warnings.map((warning) => (
                    <li key={warning.code} className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                      {warning.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        }
        explanation={
          result && output ? (
            <ExplainabilityTabs
              result={result}
              summary={
                <div className="grid gap-3">
                  <p className="max-w-2xl text-[14px] leading-6 text-ink">
                    {`On ${formatMoney(output.annualised.grossCashIncome)} of gross cash income in FY ${state.financialYear}, the estimated annual liability is ${formatMoney(output.liability.totalAnnualLiability)}, leaving ${formatMoney(output.netAnnualCash)} net per year (${formatMoney(output.netPerCycle)} ${CYCLE_LABEL[state.payCycle]}). Employer super of ${formatMoney(output.annualised.employerSuper)} is paid separately to your fund.`}
                  </p>
                  <p className="text-[13px] leading-5 text-ink-3">
                    The annual tax position and the pay-cycle withholding are different measures and are
                    shown separately above.
                  </p>
                </div>
              }
              breakdown={
                <div className="overflow-x-auto">
                  <table className="nexus-table w-full min-w-[420px] border-collapse text-left">
                    <caption className="sr-only">Net pay at each frequency</caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">Frequency</th>
                        <th scope="col" className="py-2 text-right font-normal">Net amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["Weekly", 52],
                          ["Fortnightly", 26],
                          ["Monthly (annual ÷ 12)", 12],
                          ["Quarterly", 4],
                          ["Annually", 1],
                        ] as const
                      ).map(([label, divisor]) => {
                        const net = moneyToDecimal(output.netAnnualCash) as DecimalValue;
                        const amount = {
                          ...output.netAnnualCash,
                          minorUnits: net.div(divisor).times(100).toDecimalPlaces(0, Dec.ROUND_HALF_UP).toFixed(0),
                        };
                        return (
                          <tr key={label} className="border-b border-hairline">
                            <td className="py-2 pe-4 text-[13px] text-ink">{label}</td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                              {formatMoney(amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              }
              limitations={LIMITATIONS}
            />
          ) : null
        }
        disclosure={<UniversalDisclosure financialYear={state.financialYear} />}
      />
    </>
  );
}
