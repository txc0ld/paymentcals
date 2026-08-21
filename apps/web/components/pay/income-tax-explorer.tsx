"use client";

import { useEffect, useMemo, useState } from "react";
import type { CalculationResultV1 } from "@paymentcalcs/calculation-core";
import { Dec, moneyToDecimal, type DecimalValue } from "@paymentcalcs/calculation-core";
import {
  CalculatorHeader,
  CalculatorShell,
  DraftRulesBanner,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  RuleUnavailableState,
  SelectField,
  UniversalDisclosure,
  formatMoney,
  formatRatePercent,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { calculateAuPay, type AuPayOutput } from "@paymentcalcs/engine-au-tax";
import type { TaxBracket } from "@paymentcalcs/rules-au";
import { parseMoneyInput } from "../../lib/money-input";
import { FINANCIAL_YEARS, resolvePayPacks, type FinancialYear, type PayResolutionOutcome } from "../../lib/pay-packs";

const entry = getRegistryEntry("AU-PAY-014")!;

type Residency = "resident" | "foreign_resident" | "working_holiday_maker";

const RESIDENCY_OPTIONS = [
  { value: "resident", label: "Australian resident" },
  { value: "foreign_resident", label: "Foreign resident" },
  { value: "working_holiday_maker", label: "Working holiday maker" },
] as const;

const SLIDER_MAX = 250_000;

/** Cumulative tax at each bracket's lower bound, straight from the pack.
 * Row text follows the ATO's own phrasing ("$4,020 plus 30c for every $1
 * over $45,000"). */
function liabilityRows(brackets: readonly TaxBracket[]) {
  let base = new Dec(0);
  let previous: TaxBracket | null = null;
  return brackets.map((bracket) => {
    if (previous) {
      const width = new Dec(bracket.over).minus(new Dec(previous.over));
      base = base.plus(width.times(new Dec(previous.rate)));
    }
    previous = bracket;
    const cents = new Dec(bracket.rate).times(100);
    const centsLabel = cents.isInteger() ? cents.toFixed(0) : cents.toFixed(1);
    const dollars = (v: string) => `$${Number(v).toLocaleString("en-AU")}`;
    return {
      key: bracket.over,
      range:
        bracket.upTo === null
          ? `Over ${dollars(bracket.over)}`
          : `${dollars(bracket.over)} – ${dollars(bracket.upTo)}`,
      liability: new Dec(bracket.rate).isZero()
        ? "Nil"
        : base.isZero()
          ? `${centsLabel}c for every $1 over ${dollars(bracket.over)}`
          : `$${Number(base.toFixed(0)).toLocaleString("en-AU")} plus ${centsLabel}c for every $1 over ${dollars(bracket.over)}`,
      rate: bracket.rate,
      over: bracket.over,
      upTo: bracket.upTo,
    };
  });
}

/** SVG step curve of marginal rates with the salary position marked. */
function RateCurve({
  brackets,
  salary,
}: {
  brackets: readonly TaxBracket[];
  salary: DecimalValue;
}) {
  const width = 600;
  const height = 150;
  const pad = 4;
  const lastOver = new Dec(brackets[brackets.length - 1]?.over ?? "0");
  const xMax = Dec.max(new Dec(SLIDER_MAX), salary.times(1.1), lastOver.times(1.35));
  const maxRate = brackets.reduce((m, b) => Dec.max(m, new Dec(b.rate)), new Dec(0.01));
  const x = (income: DecimalValue) =>
    pad + Number(income.div(xMax).times(width - pad * 2).toFixed(2));
  const y = (rate: string) =>
    height - pad - Number(new Dec(rate).div(maxRate).times(height - pad * 2).toFixed(2));

  let path = `M ${pad} ${height - pad}`;
  brackets.forEach((bracket, index) => {
    const x0 = x(new Dec(bracket.over));
    const x1 = bracket.upTo === null ? width - pad : x(new Dec(bracket.upTo));
    const yr = y(bracket.rate);
    if (index === 0) path += ` L ${x0} ${yr}`;
    else path += ` L ${x0} ${yr}`;
    path += ` L ${x1} ${yr}`;
  });
  const area = `${path} L ${width - pad} ${height - pad} Z`;
  const marker = x(salary);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Step curve of marginal tax rates by income; the exact brackets are listed in the table above and your salary position is marked"
      className="h-auto w-full"
    >
      <path d={area} fill="currentColor" className="text-ink/10" stroke="none" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-ink" />
      <line
        x1={marker}
        x2={marker}
        y1={pad}
        y2={height - pad}
        stroke="var(--pc-accent)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function IncomeTaxExplorer() {
  const [financialYear, setFinancialYear] = useState<FinancialYear>("2026-27");
  const [residency, setResidency] = useState<Residency>("resident");
  const [salaryRaw, setSalaryRaw] = useState("90000");
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");
  const [result, setResult] = useState<CalculationResultV1<AuPayOutput> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolution("pending");
    resolvePayPacks(financialYear).then((outcome) => {
      if (!cancelled) setResolution(outcome);
    });
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  const salary = useMemo(() => parseMoneyInput(salaryRaw), [salaryRaw]);

  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !salary.ok) {
      setResult(null);
      return;
    }
    let cancelled = false;
    calculateAuPay(
      {
        requestId: "web-live",
        calculatorId: entry.id,
        calculatorSchemaVersion: entry.inputSchemaVersion,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        valuationDate: `${financialYear.slice(0, 4)}-10-01`,
        input: {
          financialYear,
          income: { amount: salary.money, frequency: "annually", weeksPaidPerYear: "52" },
          package: { treatment: "base_plus_super", employerSuperRate: null, applyMaximumContributionBase: true },
          taxpayer: {
            residency,
            claimsTaxFreeThreshold: true,
            medicare: { status: "standard", hasPrivateHospitalCover: false, familyStatus: "single", dependants: 0 },
          },
          adjustments: {},
          studyLoans: { enabled: false },
          withholding: { payFrequency: "fortnightly" },
        },
        options: { traceLevel: "full" },
      },
      resolution.resolution,
      { now: new Date().toISOString() },
    ).then((calculated) => {
      if (!cancelled) setResult(calculated);
    });
    return () => {
      cancelled = true;
    };
  }, [resolution, salary, residency, financialYear]);

  const brackets =
    resolution !== "pending" && resolution.ok
      ? residency === "resident"
        ? resolution.resolution.incomeTax.pack.rules.resident
        : residency === "foreign_resident"
          ? resolution.resolution.incomeTax.pack.rules.foreignResident
          : resolution.resolution.incomeTax.pack.rules.workingHolidayMaker
      : null;
  const rows = brackets ? liabilityRows(brackets) : null;
  const output =
    result && (result.status === "success" || result.status === "success_with_warnings")
      ? result.output
      : undefined;
  const salaryDec = salary.ok ? (moneyToDecimal(salary.money) as DecimalValue) : new Dec(0);
  const taxAfterOffsets = output
    ? (moneyToDecimal(output.liability.grossIncomeTax) as DecimalValue).minus(
        moneyToDecimal(output.liability.litoOffset) as DecimalValue,
      )
    : null;
  const sliderValue = Math.min(
    SLIDER_MAX,
    Math.max(0, Math.round(Number(salaryDec.toFixed(0)) || 0)),
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
              periodLabel: `FY ${financialYear}`,
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
            <RuleUnavailableState jurisdictionLabel={`Australia FY ${financialYear}`} detail={resolution.reason} />
          ) : (
            <div className="grid gap-6">
              <SelectField
                id="itx-fy"
                label="Tax year"
                value={financialYear}
                onChange={(value) => setFinancialYear(value as FinancialYear)}
                options={FINANCIAL_YEARS.map((fy) => ({ value: fy, label: `FY ${fy}` }))}
              />
              <SelectField
                id="itx-residency"
                label="Tax category"
                value={residency}
                onChange={(value) => setResidency(value as Residency)}
                options={RESIDENCY_OPTIONS.map((option) => ({ ...option }))}
              />
              <MoneyField
                id="itx-salary"
                label="Annual taxable income"
                value={salaryRaw}
                onChange={setSalaryRaw}
                error={!salary.ok && salary.error ? salary.error : undefined}
              />
              <div className="grid gap-1.5">
                <label htmlFor="itx-slider" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                  Slide the income
                </label>
                <input
                  id="itx-slider"
                  type="range"
                  min={0}
                  max={SLIDER_MAX}
                  step={1000}
                  value={sliderValue}
                  onChange={(event) => setSalaryRaw(event.target.value)}
                  style={{ accentColor: "var(--pc-accent)" }}
                  className="min-h-11 w-full cursor-pointer"
                />
                <span className="font-mono text-[11px] tabular-nums text-ink-3">
                  $0 – ${SLIDER_MAX.toLocaleString("en-AU")} in $1,000 steps; type any amount above.
                </span>
              </div>
            </div>
          )
        }
        results={
          resolution !== "pending" && !resolution.ok ? (
            <EmptyState>No result can be shown while the required rule packs are unavailable.</EmptyState>
          ) : rows === null || !brackets ? (
            <EmptyState>
              The ATO has not yet published the statutory brackets for this residency and year
              (forward-year tables for non-residents typically arrive later), so nothing is shown
              rather than a guess. The latest published year for this residency is available in the
              year selector.
            </EmptyState>
          ) : (
            <div className="grid gap-6">
              {output && taxAfterOffsets ? (
                <div className="nexus-result grid gap-6 p-6 md:p-8">
                  <PrimaryResult
                    label="Income tax per year"
                    amount={output.liability.grossIncomeTax}
                    qualifier={`Bracket tax only, before offsets and levies. After the low income tax offset it is $${Number(taxAfterOffsets.toFixed(2)).toLocaleString("en-AU", { minimumFractionDigits: 2 })}. Medicare, surcharge and study loans live in the Pay Calculator.`}
                  />
                  <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 sm:grid-cols-3">
                    <ResultMetric label="Low income tax offset" amount={output.liability.litoOffset} />
                    <ResultMetric label="Taxable income" amount={output.liability.taxableIncome} />
                    <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                        Marginal rate
                      </span>
                      <span className="font-mono text-xl tabular-nums text-ink">
                        {formatRatePercent(output.liability.marginalBracketRate)}
                      </span>
                      <span className="text-[12px] leading-4 text-ink-3">On your next dollar of income</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <section aria-label="Tax brackets" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                    FY {financialYear} rates — {RESIDENCY_OPTIONS.find((o) => o.value === residency)?.label}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    From the resolved rule pack
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <caption className="sr-only">
                      Statutory tax brackets with the tax payable at each band, in the official wording
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">Income</th>
                        <th scope="col" className="hidden py-2 pe-4 font-normal sm:table-cell">Tax liability</th>
                        <th scope="col" className="py-2 text-right font-normal">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const active =
                          output !== undefined &&
                          row.rate === output.liability.marginalBracketRate &&
                          salaryDec.greaterThanOrEqualTo(new Dec(row.over)) &&
                          (row.upTo === null || salaryDec.lessThanOrEqualTo(new Dec(row.upTo)));
                        return (
                          <tr
                            key={row.key}
                            aria-current={active ? "true" : undefined}
                            className={active ? "border-b-2 border-[var(--pc-accent)]" : "border-b border-hairline"}
                          >
                            <td className="py-2 pe-4 font-mono text-[13px] tabular-nums text-ink-2">{row.range}</td>
                            <td className="hidden py-2 pe-4 text-[13px] text-ink-2 sm:table-cell">{row.liability}</td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                              {formatRatePercent(row.rate)}
                              {active ? (
                                <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pc-accent-text)]">
                                  · Yours
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-label="Marginal rate curve" className="nexus-panel-soft grid gap-4 p-6 md:p-8">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                  Marginal rate curve
                </h2>
                <RateCurve brackets={brackets} salary={salaryDec} />
                <p className="text-[12px] leading-5 text-ink-3">
                  Each step is a statutory bracket; the marker is your income. Rates apply only to
                  the dollars inside each band, which is why the average rate you actually pay is
                  below the marginal rate{output ? ` (${formatRatePercent(output.liability.effectiveRateOnTaxable)} effective at ${formatMoney(output.liability.taxableIncome)})` : ""}.
                </p>
              </section>
            </div>
          )
        }
        explanation={null}
        disclosure={<UniversalDisclosure financialYear={financialYear} />}
      />
    </>
  );
}
