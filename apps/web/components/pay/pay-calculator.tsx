"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalculationResultV1, Money } from "@paymentcalcs/calculation-core";
import {
  Dec,
  moneyFromDecimalString,
  moneyToDecimal,
  type DecimalValue,
} from "@paymentcalcs/calculation-core";
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
import { genderMix, incomePercentileFor } from "@paymentcalcs/engine-compensation";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import {
  allAuRulePacks,
  auIntegrityManifest,
  type IncomePercentilesRulePack,
  type IncomeTaxRules,
  type TaxBracket,
} from "@paymentcalcs/rules-au";
import { decodeUrlState, encodeUrlState } from "@paymentcalcs/scenario-schema";
import { allowDraftRules } from "../../lib/draft-rules";
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
  /** Annual gross to compare against, same settings. Empty = no comparison. */
  compareRaw: string;
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
  compareRaw: "",
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

/** Columns of the pay-cycle grid: display divisions of annualised figures.
 * Withholding is never shown this way — it stays schedule-true per cycle. */
const GRID_COLUMNS = [
  { label: "Weekly", divisor: 52 },
  { label: "Fortnightly", divisor: 26 },
  { label: "Monthly", divisor: 12 },
  { label: "Annually", divisor: 1 },
] as const;

/** Annual Money → the selected display period. Decimal only, never floats. */
function perPeriod(annual: Money, divisor: number): Money {
  if (divisor === 1) return annual;
  const value = (moneyToDecimal(annual) as DecimalValue).div(divisor);
  return moneyFromDecimalString(annual.currency, value.toFixed(2), 2);
}

/** Whole-dollar bracket bound from the rule pack, formatted for display. */
function formatBound(dollars: string): string {
  return formatMoney(moneyFromDecimalString("AUD", dollars, 0));
}

/**
 * The pack bracket the taxable income sits in. Fails closed: the band is only
 * described when its rate agrees with the rate the engine reported, so a
 * display-side lookup can never contradict the calculated result.
 */
function activeBracket(
  rules: IncomeTaxRules,
  residency: PayFormState["residency"],
  taxableIncome: DecimalValue,
  engineRate: string,
): TaxBracket | null {
  const brackets =
    residency === "resident"
      ? rules.resident
      : residency === "foreign_resident"
        ? rules.foreignResident
        : rules.workingHolidayMaker;
  if (!brackets) return null;
  let active: TaxBracket | null = null;
  for (const bracket of brackets) {
    if (taxableIncome.greaterThan(new Dec(bracket.over))) active = bracket;
  }
  return active && active.rate === engineRate ? active : null;
}

/** Non-money readout, structurally identical to ResultMetric so rows align. */
function StatCell({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="font-mono text-xl tabular-nums text-ink">{value}</span>
      {detail ? <span className="text-[12px] leading-4 text-ink-3">{detail}</span> : null}
    </div>
  );
}

/** Where the gross cash goes: proportional bar + text legend. The legend
 * carries the exact figures, so colour is never the only cue. */
function NetSplitBar({ output }: { output: AuPayOutput }) {
  const net = moneyToDecimal(output.netAnnualCash) as DecimalValue;
  const incomeTax = (moneyToDecimal(output.liability.grossIncomeTax) as DecimalValue).minus(
    moneyToDecimal(output.liability.litoOffset) as DecimalValue,
  );
  const medicare = (moneyToDecimal(output.liability.medicareLevy) as DecimalValue).plus(
    moneyToDecimal(output.liability.medicareLevySurcharge) as DecimalValue,
  );
  const study = moneyToDecimal(output.liability.studyLoanRepayment) as DecimalValue;
  const segments = [
    { label: "Net cash", value: net, className: "bg-accent" },
    { label: "Income tax", value: incomeTax, className: "bg-ink/70" },
    { label: "Medicare", value: medicare, className: "bg-ink/40" },
    { label: "Study loan", value: study, className: "bg-ink/20" },
  ].filter((segment) => segment.value.greaterThan(0));
  const total = segments.reduce((sum, segment) => sum.plus(segment.value), new Dec(0));
  if (total.lessThanOrEqualTo(0)) return null;
  return (
    <div className="grid gap-3 border-t border-hairline pt-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
        Where the gross cash goes
      </span>
      <div aria-hidden="true" className="flex h-3 w-full overflow-hidden border border-hairline">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.className}
            style={{ width: `${segment.value.div(total).times(100).toFixed(2)}%` }}
          />
        ))}
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-baseline gap-2">
            <span aria-hidden="true" className={`h-2 w-2 self-center ${segment.className}`} />
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{segment.label}</dt>
            <dd className="font-mono text-[12px] tabular-nums text-ink-2">
              {segment.value.div(total).times(100).toFixed(1)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const ordinal = (n: number) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] && n % 10 <= 3 ? ["th", "st", "nd", "rd"][n % 10] : "th"}`;

/** Where the taxable income sits among Australian taxpayers, straight from
 * the resolved ATO percentile pack. Distribution bars show the gender mix of
 * each percentile; the exact figures live in the table beneath. */
function IncomeRangeSection({
  pack,
  taxableIncome,
}: {
  pack: IncomePercentilesRulePack;
  taxableIncome: Money;
}) {
  const income = (moneyToDecimal(taxableIncome) as DecimalValue).toFixed(2);
  const row = incomePercentileFor(pack.rules, income);
  const mix = genderMix(row);
  const width = 600;
  const height = 130;
  const barW = width / 100;
  return (
    <section aria-label="Income range" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
          Income range
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          ATO percentile distribution, {pack.rules.incomeYear}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Gender mix across the 100 taxable-income percentiles; your income sits in the ${ordinal(row.percentile)} percentile`}
        className="h-auto w-full"
      >
        {pack.rules.percentiles.map((p) => {
          const males = Number(p.males);
          const females = Number(p.females);
          const total = males + females || 1;
          const maleH = (males / total) * (height - 8);
          const femaleH = (females / total) * (height - 8);
          const x = (p.percentile - 1) * barW;
          return (
            <g key={p.percentile}>
              <rect x={x + 0.6} y={height - femaleH} width={barW - 1.2} height={femaleH} fill="var(--pc-accent)" opacity={0.7} />
              <rect x={x + 0.6} y={height - femaleH - maleH} width={barW - 1.2} height={maleH} fill="currentColor" className="text-ink/35" />
            </g>
          );
        })}
        <line
          x1={(row.percentile - 0.5) * barW}
          x2={(row.percentile - 0.5) * barW}
          y1={0}
          y2={height}
          stroke="var(--pc-text)"
          strokeWidth={2}
        />
      </svg>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <span className="flex items-baseline gap-2">
          <span aria-hidden="true" className="h-2 w-2 self-center bg-accent opacity-70" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Female share</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span aria-hidden="true" className="h-2 w-2 self-center bg-ink/35" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Male share</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          | Marker: your percentile
        </span>
      </div>
      <div className="grid gap-px border border-hairline bg-hairline @md:grid-cols-2 @3xl:grid-cols-4">
        {(
          [
            ["Percentile", `${ordinal(row.percentile)} percentile`, null],
            ["Income range", row.rangeLabel, null],
            ["Gender mix", `${mix.malePercent}% male · ${mix.femalePercent}% female`, null],
            [
              "Tax burden",
              formatMoney(moneyFromDecimalString("AUD", row.averageNetTax, 2)),
              `average net tax · ${new Dec(row.shareOfNetTax).times(100).toFixed(1)}% of total net tax`,
            ],
          ] as const
        ).map(([label, value, detail]) => (
          <div key={label} className="grid content-start gap-1 bg-surface-2 p-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
            <span className="font-mono text-[15px] tabular-nums text-[var(--pc-accent-text)]">{value}</span>
            {detail ? <span className="text-[12px] leading-4 text-ink-3">{detail}</span> : null}
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-5 text-ink-3">
        Positions compare your taxable income with all taxable individuals in the ATO&rsquo;s{" "}
        {pack.rules.incomeYear} statistics ({Number(pack.rules.totalIndividuals).toLocaleString("en-AU")} people) —
        a historical distribution, not a ranking of current incomes.
      </p>
    </section>
  );
}

export function PayCalculator({ variant }: { variant: PayVariant }) {
  const entry = getRegistryEntry(variant.calculatorId)!;
  const [state, setState] = useState<PayFormState>({ ...DEFAULT_STATE, ...variant.defaults });
  const [uiMode, setUiMode] = useState<"simple" | "advanced">("simple");
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");
  const [result, setResult] = useState<CalculationResultV1<AuPayOutput> | null>(null);
  const [compareResult, setCompareResult] = useState<CalculationResultV1<AuPayOutput> | null>(null);
  /** Index into GRID_COLUMNS for the small-screen single-cycle view. */
  const [mobileCycle, setMobileCycle] = useState(3);
  /** ATO percentile-distribution pack (descriptive comparison only). */
  const [percentiles, setPercentiles] = useState<IncomePercentilesRulePack | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "income-percentiles",
      jurisdiction: "AU",
      valuationDate: new Date().toISOString().slice(0, 10),
      allowDraftRules,
    }).then((outcome) => {
      // Supplementary display: on any failure it simply does not render.
      if (!cancelled && outcome.ok) setPercentiles(outcome.pack as IncomePercentilesRulePack);
    });
    return () => {
      cancelled = true;
    };
  }, []);
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
  const compareInput = useMemo(() => {
    if (!state.compareRaw.trim()) return null;
    return buildInput({ ...state, amountRaw: state.compareRaw, frequency: "annually" }).input;
  }, [state]);

  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !input) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const started = performance.now();
    const request = (calcInput: AuPayInput) => ({
      requestId: "web-live",
      calculatorId: entry.id,
      calculatorSchemaVersion: entry.inputSchemaVersion,
      jurisdiction: { country: "AU" as const },
      locale: "en-AU",
      currency: "AUD",
      valuationDate: `${state.financialYear.slice(0, 4)}-10-01`,
      input: calcInput,
      options: { traceLevel: "full" as const },
    });
    if (compareInput) {
      calculateAuPay(request(compareInput), resolution.resolution, { now: new Date().toISOString() }).then(
        (calculated) => {
          if (!cancelled) setCompareResult(calculated);
        },
      );
    } else {
      setCompareResult(null);
    }
    calculateAuPay(request(input), resolution.resolution, { now: new Date().toISOString() }).then((calculated) => {
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
  }, [resolution, input, compareInput, uiMode, entry.id, entry.inputSchemaVersion, state.financialYear]);

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
  const compareOutput =
    compareResult && (compareResult.status === "success" || compareResult.status === "success_with_warnings")
      ? compareResult.output
      : undefined;
  const showHours = state.frequency === "hourly" || variant.simpleShowsHours === true;
  const bracket =
    output && resolution !== "pending" && resolution.ok
      ? activeBracket(
          resolution.resolution.incomeTax.pack.rules,
          state.residency,
          moneyToDecimal(output.liability.taxableIncome) as DecimalValue,
          output.liability.marginalBracketRate,
        )
      : null;
  /* Full ladder from the pack; a row is marked active only when it both
   * contains the taxable income AND its rate matches the engine's marginal
   * rate — a display-side lookup can never contradict the calculation. */
  const bracketLadder = (() => {
    if (!output || resolution === "pending" || !resolution.ok) return null;
    const rules = resolution.resolution.incomeTax.pack.rules;
    const brackets =
      state.residency === "resident"
        ? rules.resident
        : state.residency === "foreign_resident"
          ? rules.foreignResident
          : rules.workingHolidayMaker;
    if (!brackets || brackets.length === 0) return null;
    const taxable = moneyToDecimal(output.liability.taxableIncome) as DecimalValue;
    return brackets.map((row) => ({
      over: row.over,
      upTo: row.upTo,
      rate: row.rate,
      active:
        row.rate === output.liability.marginalBracketRate &&
        taxable.greaterThanOrEqualTo(new Dec(row.over)) &&
        (row.upTo === null || taxable.lessThanOrEqualTo(new Dec(row.upTo))),
    }));
  })();

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
                    className="nexus-quiet-button min-h-11 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
              {/* Detail level lives above the financial inputs it controls. */}
              <div className="no-print flex justify-start border-b border-hairline pb-5">
                <SegmentedControl
                  label="Detail level"
                  value={uiMode}
                  onChange={setUiMode}
                  options={[
                    { value: "simple", label: "Simple" },
                    { value: "advanced", label: "Advanced" },
                  ]}
                />
              </div>
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
              <div className="grid items-start gap-4 @md:grid-cols-2">
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
                <div className="grid items-start gap-4 @md:grid-cols-2">
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
            <div className="grid min-w-0 gap-6">
              <div className="nexus-result grid min-w-0 gap-6 p-6 md:p-8">
                <PrimaryResult
                  label={
                    variant.primaryMetric === "netPerCycle"
                      ? `${variant.primaryLabel} ${CYCLE_LABEL[state.payCycle]}`
                      : variant.primaryLabel
                  }
                  amount={primaryAmount(variant, output, state)}
                  qualifier={`Annual estimate under FY ${state.financialYear} rules. Marginal bracket ${formatRatePercent(output.liability.marginalBracketRate)}; the next $1,000 of gross is worth ${formatMoney(output.netValueOfNextThousand)} after obligations.`}
                />
                <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 @xl:grid-cols-3">
                  <ResultMetric label="Net per year" amount={output.netAnnualCash} />
                  <ResultMetric label="Base salary" amount={output.annualised.baseSalary} />
                  <ResultMetric
                    label="Employer super"
                    amount={output.annualised.employerSuper}
                    detail="Paid to your fund, not cash"
                  />
                </div>

                {/* Where each gross dollar goes: visual + text legend (non-colour cues). */}
                <NetSplitBar output={output} />
                <div className="grid auto-rows-fr gap-4 @md:grid-cols-2">
                  <StatCell
                    label="Effective rate on taxable income"
                    value={formatRatePercent(output.liability.effectiveRateOnTaxable)}
                    detail="Total annual liability ÷ taxable income"
                  />
                  <StatCell
                    label="Marginal bracket"
                    value={formatRatePercent(output.liability.marginalBracketRate)}
                    detail={
                      bracket === null
                        ? "Statutory bracket rate at your taxable income"
                        : bracket.upTo === null
                          ? `On each dollar above ${formatBound(bracket.over)}`
                          : `On each dollar from ${formatBound(bracket.over)} to ${formatBound(bracket.upTo)}`
                    }
                  />
                </div>
              </div>

              <section aria-label="Annual tax position" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                    Annual tax position (estimate)
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                    All pay cycles
                  </span>
                </div>
                {(() => {
                  const rows = [
                    ["Gross package", output.annualised.grossPackage, false],
                    ["Employer super", output.annualised.employerSuper, false],
                    ["Gross cash income", output.annualised.grossCashIncome, false],
                    ["Taxable income", output.liability.taxableIncome, false],
                    ["Income tax", output.liability.grossIncomeTax, false],
                    ["Low income tax offset", output.liability.litoOffset, false],
                    ["Medicare levy", output.liability.medicareLevy, false],
                    ["Medicare levy surcharge", output.liability.medicareLevySurcharge, false],
                    ["Study loan repayment", output.liability.studyLoanRepayment, false],
                    ["Total annual liability", output.liability.totalAnnualLiability, true],
                    ["Net cash", output.netAnnualCash, true],
                  ] as const;
                  const mobile = GRID_COLUMNS[mobileCycle] ?? GRID_COLUMNS[3];
                  return (
                    <>
                      {/* Small screens: one cycle at a time, no horizontal scroll. */}
                      <div className="grid gap-4 @2xl:hidden">
                        <SegmentedControl
                          label="Pay cycle shown"
                          size="sm"
                          value={String(mobileCycle)}
                          onChange={(value) => setMobileCycle(Number(value))}
                          options={GRID_COLUMNS.map((column, index) => ({
                            value: String(index),
                            label: column.label,
                          }))}
                        />
                        <table className="w-full border-collapse text-left">
                          <caption className="sr-only">
                            Gross package through to net cash, {mobile.label.toLowerCase()}
                          </caption>
                          <tbody>
                            {rows.map(([label, amount, emphasis]) => (
                              <tr
                                key={label}
                                className={emphasis ? "border-b-2 border-hairline-strong" : "border-b border-hairline"}
                              >
                                <th scope="row" className="py-2 pe-3 text-[13px] font-normal text-ink-2">
                                  {label}
                                </th>
                                <td
                                  className={`py-2 text-right font-mono text-[13px] tabular-nums ${
                                    emphasis ? "text-ink" : "text-ink-2"
                                  }`}
                                >
                                  {formatMoney(perPeriod(amount, mobile.divisor))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* md+: all cycles side by side. */}
                      <div className="hidden min-w-0 overflow-x-auto @2xl:block">
                        <table className="w-full border-collapse text-left">
                          <caption className="sr-only">
                            Gross package through to net cash at each pay cycle, under the resolved rule packs
                          </caption>
                          <thead>
                            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                              <th scope="col" className="py-2 pe-4 font-normal">Line</th>
                              {GRID_COLUMNS.map((column) => (
                                <th key={column.label} scope="col" className="py-2 ps-4 text-right font-normal">
                                  {column.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(([label, amount, emphasis]) => (
                              <tr
                                key={label}
                                className={emphasis ? "border-b-2 border-hairline-strong" : "border-b border-hairline"}
                              >
                                <th scope="row" className="py-2 pe-4 text-[13px] font-normal text-ink-2">
                                  {label}
                                </th>
                                {GRID_COLUMNS.map((column) => (
                                  <td
                                    key={column.label}
                                    className={`py-2 ps-4 text-right font-mono text-[13px] tabular-nums ${
                                      emphasis ? "text-ink" : "text-ink-2"
                                    } ${column.divisor === 1 && emphasis ? "text-[var(--pc-accent-text)]" : ""}`}
                                  >
                                    {formatMoney(perPeriod(amount, column.divisor))}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
                <p className="text-[12px] leading-5 text-ink-3">
                  Weekly, fortnightly and monthly columns are display divisions of the annual
                  position. The headline figure and the withholding below come straight from the
                  engine&rsquo;s pay-cycle outputs and are never derived this way.
                </p>
              </section>

              {bracketLadder ? (
                <section aria-label="Tax brackets" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                      FY {state.financialYear} bracket ladder
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      From the resolved rule pack
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <caption className="sr-only">
                        Statutory income tax brackets for the selected residency; your bracket is marked
                      </caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">Taxable income</th>
                          <th scope="col" className="py-2 ps-4 text-right font-normal">Marginal rate</th>
                          <th scope="col" className="hidden py-2 ps-4 text-right font-normal @xl:table-cell">Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bracketLadder.map((row) => (
                          <tr
                            key={row.over}
                            aria-current={row.active ? "true" : undefined}
                            className={row.active ? "border-b-2 border-[var(--pc-accent)]" : "border-b border-hairline"}
                          >
                            <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink-2">
                              {row.upTo === null
                                ? `Above ${formatBound(row.over)}`
                                : `${formatBound(row.over)} – ${formatBound(row.upTo)}`}
                            </td>
                            <td className="py-2 ps-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                              {formatRatePercent(row.rate)}
                              {/* Small screens: the marker folds into this cell. */}
                              {row.active ? (
                                <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pc-accent-text)] @xl:hidden">
                                  · Yours
                                </span>
                              ) : null}
                            </td>
                            <td className="hidden py-2 ps-4 text-right font-mono text-[10px] uppercase tracking-[0.14em] @xl:table-cell">
                              {row.active ? (
                                <span className="text-[var(--pc-accent-text)]">Your bracket</span>
                              ) : (
                                <span className="text-ink-3">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <section aria-label="Compare another salary" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                  Compare another salary
                </h2>
                <div className="grid items-start gap-4 @md:grid-cols-2">
                  <MoneyField
                    id="pay-compare"
                    label="Annual gross to compare"
                    description="Same settings, different salary — a pay-rise check."
                    value={state.compareRaw}
                    onChange={(compareRaw) => patch({ compareRaw })}
                  />
                  {compareOutput ? (
                    <dl className="grid content-start gap-2 border-l border-hairline ps-4">
                      {(
                        [
                          ["Net per year", output.netAnnualCash, compareOutput.netAnnualCash],
                          [
                            "Total tax per year",
                            output.liability.totalAnnualLiability,
                            compareOutput.liability.totalAnnualLiability,
                          ],
                        ] as const
                      ).map(([label, current, compared]) => {
                        const delta = (moneyToDecimal(compared) as DecimalValue).minus(
                          moneyToDecimal(current) as DecimalValue,
                        );
                        const word = delta.isZero() ? "no change" : delta.greaterThan(0) ? "more" : "less";
                        return (
                          <div key={label} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4">
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</dt>
                            <dd className="font-mono text-[13px] tabular-nums text-ink">
                              {formatMoney(compared)}{" "}
                              <span className="text-ink-3">
                                ({delta.isZero() ? "" : delta.greaterThan(0) ? "▲" : "▼"}
                                {formatMoney(
                                  moneyFromDecimalString(current.currency, delta.abs().toFixed(2), 2),
                                )}{" "}
                                {word})
                              </span>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : state.compareRaw.trim() ? (
                    <p className="self-center text-[13px] leading-5 text-ink-3">
                      Enter a valid annual amount to compare.
                    </p>
                  ) : null}
                </div>
              </section>

              {percentiles ? (
                <IncomeRangeSection pack={percentiles} taxableIncome={output.liability.taxableIncome} />
              ) : null}

              <section aria-label="Estimated employer withholding" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                  Estimated employer withholding ({CYCLE_LABEL[state.payCycle]})
                </h2>
                {output.withholding ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left">
                        <caption className="sr-only">
                          Withholding components for one pay period
                        </caption>
                        <thead>
                          <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                            <th scope="col" className="py-2 pe-4 font-normal">Line</th>
                            <th scope="col" className="py-2 text-right font-normal">
                              Amount {CYCLE_LABEL[state.payCycle]}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            [
                              ["PAYG withholding", output.withholding.perCycleOrdinary, false],
                              ["Study loan component", output.withholding.perCycleStudyLoan, false],
                              ["Additional withholding", output.withholding.perCycleAdditional, false],
                              ["Total withheld per pay", output.withholding.perCycleTotal, true],
                            ] as const
                          ).map(([label, amount, emphasis]) => (
                            <tr
                              key={label}
                              className={
                                emphasis
                                  ? "border-b-2 border-hairline-strong"
                                  : "border-b border-hairline"
                              }
                            >
                              <th scope="row" className="py-2 pe-4 text-[13px] font-normal text-ink-2">
                                {label}
                              </th>
                              <td
                                className={`py-2 text-right font-mono text-[14px] tabular-nums ${
                                  emphasis ? "text-ink" : "text-ink-2"
                                }`}
                              >
                                {formatMoney(amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                <div className="grid gap-4">
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
                  <table className="nexus-table w-full border-collapse text-left">
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
