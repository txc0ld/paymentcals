"use client";

import { useEffect, useMemo, useState } from "react";
import { Dec } from "@paymentcalcs/calculation-core";
import {
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  MoneyField,
  RuleUnavailableState,
  ScenarioActions,
  UniversalDisclosure,
  downloadCsv,
  toCsv,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { CpiRangeError, computeRealIncome, type RealIncomeResult } from "@paymentcalcs/engine-compensation";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import {
  allAuRulePacks,
  auIntegrityManifest,
  type CpiRulePack,
  type WpiRulePack,
} from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";
import { useScenarioActions } from "./use-scenario-actions";

const entry = getRegistryEntry("AU-PAY-015")!;

type PackResolution<Pack> =
  | "pending"
  | { ok: true; pack: Pack; draft: boolean }
  | { ok: false; reason: string };

type CpiResolution = PackResolution<CpiRulePack>;
/** The WPI series is optional: without it the wages comparison simply hides. */
type WpiResolution = PackResolution<WpiRulePack>;

function monthToDate(month: string, end: boolean): string {
  // <input type="month"> → mid-month date; the engine snaps to the CPI quarter.
  return `${month}-${end ? "28" : "15"}`;
}

/** Dual-line SVG: the salary needed to keep pace (accent, rising) vs the
 * salary's effective value in start-date dollars (dashed, falling). */
function ErosionChart({ result, salary }: { result: RealIncomeResult; salary: string }) {
  const width = 600;
  const height = 180;
  const pad = 6;
  const steps = result.steps;
  if (steps.length < 2) return null;
  const values = steps.flatMap((s) => [Number(s.neededSalary), Number(s.effectiveValue)]);
  const max = Math.max(...values) * 1.03;
  const min = Math.min(...values) * 0.97;
  const x = (i: number) => pad + (i / (steps.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / (max - min)) * (height - pad * 2);
  const line = (pick: (s: (typeof steps)[number]) => string) =>
    steps.map((s, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(Number(pick(s))).toFixed(1)}`).join(" ");
  const needed = line((s) => s.neededSalary);
  const effective = line((s) => s.effectiveValue);
  const base = y(Number(salary));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Quarter by quarter from ${result.fromQuarter.date} to ${result.toQuarter.date}: the salary needed to keep pace with CPI rises to ${formatMajor(result.neededSalary)}, while the unchanged salary's value in starting dollars falls to ${formatMajor(result.effectiveValue)}`}
      className="h-auto w-full"
    >
      <line x1={pad} x2={width - pad} y1={base} y2={base} stroke="var(--pc-hairline-strong)" strokeWidth="1" />
      <path d={`${needed} L ${width - pad} ${base} L ${pad} ${base} Z`} fill="var(--pc-accent)" opacity="0.08" />
      <path d={needed} fill="none" stroke="var(--pc-accent)" strokeWidth="2" />
      <path d={effective} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" className="text-ink-3" />
    </svg>
  );
}

export function InflationCalculator() {
  const [salaryRaw, setSalaryRaw] = useState("100000");
  const [fromMonth, setFromMonth] = useState("2021-01");
  const [toMonth, setToMonth] = useState("");
  /** Optional "what I earn now" — blank leaves every existing figure untouched. */
  const [currentSalaryRaw, setCurrentSalaryRaw] = useState("");
  const [resolution, setResolution] = useState<CpiResolution>("pending");
  const [wpiResolution, setWpiResolution] = useState<WpiResolution>("pending");

  const scenario = useScenarioActions({
    calculatorId: entry.id,
    state: { salaryRaw, fromMonth, toMonth, currentSalaryRaw },
    onHydrate: (saved) => {
      if (typeof saved.salaryRaw === "string") setSalaryRaw(saved.salaryRaw);
      if (typeof saved.fromMonth === "string") setFromMonth(saved.fromMonth);
      if (typeof saved.toMonth === "string") setToMonth(saved.toMonth);
      if (typeof saved.currentSalaryRaw === "string") setCurrentSalaryRaw(saved.currentSalaryRaw);
    },
  });

  useEffect(() => {
    let cancelled = false;
    const query = {
      jurisdiction: "AU",
      valuationDate: new Date().toISOString().slice(0, 10),
      allowDraftRules,
    };
    Promise.all([
      resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "cpi" }),
      resolveRulePack(allAuRulePacks, auIntegrityManifest, { ...query, domain: "wpi" }),
    ]).then(([cpi, wpi]) => {
      if (cancelled) return;
      setResolution(
        cpi.ok
          ? { ok: true, pack: cpi.pack as CpiRulePack, draft: cpi.draft }
          : { ok: false, reason: cpi.reason },
      );
      setWpiResolution(
        wpi.ok
          ? { ok: true, pack: wpi.pack as WpiRulePack, draft: wpi.draft }
          : { ok: false, reason: wpi.reason },
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const salary = useMemo(() => parseMoneyInput(salaryRaw), [salaryRaw]);

  const computation = useMemo(() => {
    if (resolution === "pending" || !resolution.ok || !salary.ok) return null;
    const rules = resolution.pack.rules;
    const lastDate = rules.quarters[rules.quarters.length - 1]?.date ?? "";
    const to = toMonth ? monthToDate(toMonth, true) : lastDate;
    try {
      const salaryMajor = new Dec(salary.money.minorUnits).div(100).toFixed(2);
      return { ok: true as const, result: computeRealIncome(rules, salaryMajor, monthToDate(fromMonth, false), to) };
    } catch (error) {
      if (error instanceof CpiRangeError) return { ok: false as const, reason: error.message };
      throw error;
    }
  }, [resolution, salary, fromMonth, toMonth]);

  const rules = resolution !== "pending" && resolution.ok ? resolution.pack.rules : null;
  const wpiRules = wpiResolution !== "pending" && wpiResolution.ok ? wpiResolution.pack.rules : null;
  /* Month bounds are the intersection of both published series, so any window
   * the user can select is one both CPI and WPI actually cover. */
  const cpiFirst = rules ? rules.quarters[0]!.date.slice(0, 7) : undefined;
  const cpiLast = rules ? rules.quarters[rules.quarters.length - 1]!.date.slice(0, 7) : undefined;
  const wpiFirst = wpiRules ? wpiRules.quarters[0]!.date.slice(0, 7) : undefined;
  const wpiLast = wpiRules ? wpiRules.quarters[wpiRules.quarters.length - 1]!.date.slice(0, 7) : undefined;
  const minMonth = cpiFirst && wpiFirst ? (wpiFirst > cpiFirst ? wpiFirst : cpiFirst) : cpiFirst;
  const maxMonth = cpiLast && wpiLast ? (wpiLast < cpiLast ? wpiLast : cpiLast) : cpiLast;
  const result = computation && computation.ok ? computation.result : null;
  const pctRise = result ? new Dec(result.cumulativeInflation).times(100).toFixed(2) : null;

  /* Wages over the identical window: the WPI series is read at the very
   * quarters the CPI result landed on, so the two percentages always describe
   * the same period. Published quarters only — never a projection. */
  const wages = useMemo(() => {
    if (!wpiRules || !result || !salary.ok) return null;
    try {
      const salaryMajor = new Dec(salary.money.minorUnits).div(100).toFixed(2);
      const wpi = computeRealIncome(wpiRules, salaryMajor, result.fromQuarter.date, result.toQuarter.date);
      const wagePct = new Dec(wpi.cumulativeInflation).times(100);
      const gap = wagePct.minus(new Dec(result.cumulativeInflation).times(100));
      return {
        wpi,
        wagePct: wagePct.toFixed(2),
        gapAbs: gap.abs().toFixed(2),
        wagesAhead: gap.greaterThanOrEqualTo(0),
      };
    } catch (error) {
      // Outside the WPI range the comparison is withheld, never extrapolated.
      if (error instanceof CpiRangeError) return null;
      throw error;
    }
  }, [wpiRules, result, salary]);

  const currentSalary = useMemo(
    () => (currentSalaryRaw.trim() ? parseMoneyInput(currentSalaryRaw) : null),
    [currentSalaryRaw],
  );
  /* Did the raise keep up: today's salary against the salary that would have
   * held the original purchasing power, and against the rise that would. */
  const raiseCheck =
    result && currentSalary && currentSalary.ok && salary.ok
      ? (() => {
          const now = new Dec(currentSalary.money.minorUnits).div(100);
          const started = new Dec(salary.money.minorUnits).div(100);
          const gap = now.minus(new Dec(result.neededSalary));
          return {
            now: now.toFixed(2),
            actualRise: now.minus(started).toFixed(2),
            inflationRise: result.shortfall,
            gapAbs: gap.abs().toFixed(2),
            keptPace: gap.greaterThanOrEqualTo(0),
          };
        })()
      : null;

  function onDownloadSteps() {
    if (!result) return;
    downloadCsv(
      `cpi-${result.fromQuarter.date}-to-${result.toQuarter.date}.csv`,
      toCsv(
        ["Quarter", "CPI index", "Salary needed", "Effective value"],
        result.steps.map((step) => [step.quarterDate, step.index, step.neededSalary, step.effectiveValue]),
      ),
    );
  }

  const monthField = (id: string, label: string, value: string, onChange: (v: string) => void, placeholderLatest?: boolean) => (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="month"
        min={minMonth}
        max={maxMonth}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="nexus-input min-h-11 bg-surface px-3 font-mono text-[14px] text-ink outline-none focus:border-focus"
      />
      {placeholderLatest && !value ? (
        <span className="text-[12px] leading-4 text-ink-3">Blank compares to the latest published quarter.</span>
      ) : null}
    </div>
  );

  /** Either series running on draft rules must carry the banner. */
  const draftRules =
    (resolution !== "pending" && resolution.ok && resolution.draft) ||
    (wpiResolution !== "pending" && wpiResolution.ok && wpiResolution.draft);

  return (
    <>
      {draftRules ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: "Australia",
              periodLabel: rules ? `CPI to ${rules.quarters[rules.quarters.length - 1]!.date}` : "Quarterly CPI",
              calculationClass: entry.calculationClass,
              ruleStatus:
                resolution === "pending"
                  ? { label: "Resolving rules", tone: "neutral" }
                  : resolution.ok
                    ? draftRules
                      ? { label: "Draft rules — not verified", tone: "draft" }
                      : { label: "Current", tone: "neutral" }
                    : { label: "Rules unavailable", tone: "warn" },
            }}
            methodologyHref={`/methodology/${entry.slug}`}
            actions={
              <ScenarioActions
                onSave={scenario.onSave}
                onShare={scenario.onShare}
                onReset={() => {
                  setSalaryRaw("100000");
                  setFromMonth("2021-01");
                  setToMonth("");
                  setCurrentSalaryRaw("");
                }}
              />
            }
          />
        }
        inputs={
          resolution !== "pending" && !resolution.ok ? (
            <RuleUnavailableState jurisdictionLabel="Australia (ABS CPI)" detail={resolution.reason} />
          ) : (
            <div className="grid gap-6">
              <MoneyField
                id="inf-salary"
                label="Annual salary"
                description="The salary as it was at your last pay rise."
                value={salaryRaw}
                onChange={setSalaryRaw}
                error={!salary.ok && salary.error ? salary.error : undefined}
              />
              {/* Container query, not a viewport one: the inputs column is
               * ~296–376px wide from lg up, where a month picker pair would
               * be crushed. It only pairs when the column is genuinely wide. */}
              <div className="grid items-start gap-4 @sm:grid-cols-2">
                {monthField("inf-from", "Date of last pay rise", fromMonth, setFromMonth)}
                {monthField("inf-to", "Comparison date", toMonth, setToMonth, true)}
              </div>
              <MoneyField
                id="inf-current-salary"
                label="Salary now (optional)"
                description="Fill this in to compare what you earn today with the inflation-matching figure. Blank leaves the result unchanged."
                value={currentSalaryRaw}
                onChange={setCurrentSalaryRaw}
                error={currentSalary && !currentSalary.ok && currentSalary.error ? currentSalary.error : undefined}
              />
            </div>
          )
        }
        results={
          resolution !== "pending" && !resolution.ok ? (
            <EmptyState>No result can be shown while the CPI rule pack is unavailable.</EmptyState>
          ) : computation && !computation.ok ? (
            <EmptyState>{computation.reason}</EmptyState>
          ) : !result || !salary.ok ? (
            <EmptyState>Enter a salary and the date of your last pay rise.</EmptyState>
          ) : (
            <div className="grid min-w-0 gap-6">
              <div className="nexus-result @container grid gap-6 p-6 md:p-8">
                <div className="grid gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                    Salary needed on {result.toQuarter.date} to keep its {result.fromQuarter.date} purchasing power
                  </span>
                  <span data-money className="break-words font-mono text-[length:var(--pc-text-result-xl)] font-medium leading-none tracking-tight tabular-nums text-[var(--pc-accent-text)]">
                    {formatMajor(result.neededSalary)}
                  </span>
                  <span role="status" aria-live="polite" className="sr-only">
                    Salary needed: {formatMajor(result.neededSalary)}
                  </span>
                  <p className="max-w-2xl text-[13px] leading-5 text-ink-2">
                    Between {result.fromQuarter.date} and {result.toQuarter.date} the CPI rose{" "}
                    {pctRise}%. An unchanged {formatMajor(new Dec(salary.money.minorUnits).div(100).toFixed(2))} now buys what{" "}
                    {formatMajor(result.effectiveValue)} bought then — {formatMajor(result.erosion)} of purchasing
                    power. Matching inflation takes a rise of {formatMajor(result.shortfall)} ({pctRise}%).
                  </p>
                </div>
                <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 @xl:grid-cols-3">
                  <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Effective value now</span>
                    <span className="font-mono text-xl tabular-nums text-ink">{formatMajor(result.effectiveValue)}</span>
                    <span className="text-[12px] leading-4 text-ink-3">In {result.fromQuarter.date.slice(0, 4)} dollars</span>
                  </div>
                  <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Purchasing power lost</span>
                    <span className="font-mono text-xl tabular-nums text-warn">{formatMajor(result.erosion)}</span>
                    <span className="text-[12px] leading-4 text-ink-3">If the salary has not moved</span>
                  </div>
                  <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Cumulative CPI</span>
                    <span className="font-mono text-xl tabular-nums text-ink">{pctRise}%</span>
                    <span className="text-[12px] leading-4 text-ink-3">
                      Index {result.fromQuarter.index} → {result.toQuarter.index}
                    </span>
                  </div>
                </div>
              </div>

              {raiseCheck ? (
                <section
                  aria-label="Did the raise keep up"
                  className="nexus-panel-soft @container grid gap-4 p-6 md:p-8"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                      Did the raise keep up
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      Salary now against the inflation-matching figure
                    </span>
                  </div>
                  <div className="grid gap-px border border-hairline bg-hairline @md:grid-cols-3">
                    {(
                      [
                        ["Salary now", formatMajor(raiseCheck.now), "As entered"],
                        [
                          "Raise received",
                          formatMajor(raiseCheck.actualRise),
                          `Inflation-matching raise: ${formatMajor(raiseCheck.inflationRise)}`,
                        ],
                        [
                          raiseCheck.keptPace ? "Ahead of CPI by" : "Behind CPI by",
                          formatMajor(raiseCheck.gapAbs),
                          `Against ${formatMajor(result.neededSalary)} needed on ${result.toQuarter.date}`,
                        ],
                      ] as const
                    ).map(([label, value, detail]) => (
                      <div key={label} className="grid content-start gap-1 bg-surface-2 p-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
                        <span className="font-mono text-[15px] tabular-nums text-[var(--pc-accent-text)]">{value}</span>
                        <span className="text-[12px] leading-4 text-ink-3">{detail}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[12px] leading-5 text-ink-3">
                    This compares two figures only: what you earn now and what the same purchasing power
                    costs on {result.toQuarter.date}. It says nothing about the value of the work.
                  </p>
                </section>
              ) : null}

              {wages ? (
                <section
                  aria-label="Wages comparison"
                  className="nexus-panel-soft @container grid gap-4 p-6 md:p-8"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                      Wages comparison (WPI)
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      Same window, wage price index
                    </span>
                  </div>
                  <div className="grid gap-px border border-hairline bg-hairline @md:grid-cols-3">
                    {(
                      [
                        [
                          "Tracking wage growth",
                          formatMajor(wages.wpi.neededSalary),
                          `If the salary had moved with the WPI from ${result.fromQuarter.date}`,
                        ],
                        [
                          "Cumulative WPI",
                          `${wages.wagePct}%`,
                          `Index ${wages.wpi.fromQuarter.index} → ${wages.wpi.toQuarter.index}`,
                        ],
                        [
                          wages.wagesAhead ? "Wages ahead of prices by" : "Wages behind prices by",
                          `${wages.gapAbs} pp`,
                          `Against cumulative CPI of ${pctRise}%`,
                        ],
                      ] as const
                    ).map(([label, value, detail]) => (
                      <div key={label} className="grid content-start gap-1 bg-surface-2 p-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</span>
                        <span className="break-words font-mono text-[15px] tabular-nums text-[var(--pc-accent-text)]">
                          {value}
                        </span>
                        <span className="text-[12px] leading-4 text-ink-3">{detail}</span>
                      </div>
                    ))}
                  </div>
                  <p className="max-w-2xl text-[13px] leading-5 text-ink-2">
                    Prices rose {pctRise}% over this period; wages rose {wages.wagePct}%. Wages therefore
                    grew {wages.wagesAhead ? "faster" : "slower"} than prices between{" "}
                    {result.fromQuarter.date} and {result.toQuarter.date}, a difference of {wages.gapAbs}{" "}
                    percentage points. The WPI is an economy-wide measure of wage rates for the same job,
                    not a record of any individual&rsquo;s pay.
                  </p>
                  <p className="text-[12px] leading-5 text-ink-3">
                    ABS Wage Price Index (6345.0), total hourly rates of pay excluding bonuses, private and
                    public, original series.
                  </p>
                </section>
              ) : null}

              <section aria-label="Salary versus inflation" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                    Salary versus inflation, quarter by quarter
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    ABS All groups CPI via RBA table G1
                  </span>
                </div>
                <ErosionChart result={result} salary={new Dec(salary.money.minorUnits).div(100).toFixed(2)} />
                <dl className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden="true" className="h-0.5 w-5 self-center bg-accent" />
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Keeps pace with CPI</dt>
                    <dd className="font-mono text-[12px] tabular-nums text-ink-2">{formatMajor(result.neededSalary)}</dd>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span aria-hidden="true" className="h-0.5 w-5 self-center border-t-2 border-dashed border-ink-3" />
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Effective value</dt>
                    <dd className="font-mono text-[12px] tabular-nums text-ink-2">{formatMajor(result.effectiveValue)}</dd>
                  </div>
                </dl>
                <div className="no-print flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
                  <button
                    type="button"
                    onClick={onDownloadSteps}
                    aria-label={`Download the ${result.steps.length} quarterly CPI steps as CSV`}
                    className="nexus-quiet-button min-h-11 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Download CSV
                  </button>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    {result.steps.length} quarters · index, salary needed, effective value
                  </span>
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  Published quarters only — this calculator never extrapolates or forecasts. CPI is an
                  economy-wide basket; your own costs can move differently.
                </p>
              </section>
            </div>
          )
        }
        explanation={null}
        disclosure={<UniversalDisclosure financialYear="2026-27" />}
      />
    </>
  );
}
