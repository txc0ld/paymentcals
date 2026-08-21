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
  UniversalDisclosure,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { CpiRangeError, computeRealIncome, type RealIncomeResult } from "@paymentcalcs/engine-compensation";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, type CpiRulePack } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const entry = getRegistryEntry("AU-PAY-015")!;

type CpiResolution =
  | "pending"
  | { ok: true; pack: CpiRulePack; draft: boolean }
  | { ok: false; reason: string };

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
  const [resolution, setResolution] = useState<CpiResolution>("pending");

  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "cpi",
      jurisdiction: "AU",
      valuationDate: new Date().toISOString().slice(0, 10),
      allowDraftRules,
    }).then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) {
        setResolution({ ok: true, pack: outcome.pack as CpiRulePack, draft: outcome.draft });
      } else {
        setResolution({ ok: false, reason: outcome.reason });
      }
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
  const minMonth = rules ? rules.quarters[0]!.date.slice(0, 7) : undefined;
  const maxMonth = rules ? rules.quarters[rules.quarters.length - 1]!.date.slice(0, 7) : undefined;
  const result = computation && computation.ok ? computation.result : null;
  const pctRise = result ? new Dec(result.cumulativeInflation).times(100).toFixed(2) : null;

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

  return (
    <>
      {resolution !== "pending" && resolution.ok && resolution.draft ? <DraftRulesBanner /> : null}
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
                    ? resolution.draft
                      ? { label: "Draft rules — not verified", tone: "draft" }
                      : { label: "Current", tone: "neutral" }
                    : { label: "Rules unavailable", tone: "warn" },
            }}
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
              <div className="grid items-start gap-4 sm:grid-cols-2">
                {monthField("inf-from", "Date of last pay rise", fromMonth, setFromMonth)}
                {monthField("inf-to", "Comparison date", toMonth, setToMonth, true)}
              </div>
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
            <div className="grid gap-6">
              <div className="nexus-result grid gap-6 p-6 md:p-8">
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
                <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
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
