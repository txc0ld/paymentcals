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
  RuleUnavailableState,
  ScenarioActions,
  SelectField,
  ToggleField,
  UniversalDisclosure,
  formatMoney,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import {
  computeWithholding,
  selectScale,
  type WithholdingComputation,
  type WithholdingCycle,
} from "@paymentcalcs/engine-au-withholding";
import { calculateAuPay } from "@paymentcalcs/engine-au-tax";
import {
  Dec,
  moneyFromDecimalString,
  moneyToDecimal,
  type DecimalValue,
  type Money,
} from "@paymentcalcs/calculation-core";
import type { CoefficientRow } from "@paymentcalcs/rules-au";
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { resolvePayPacks, type PayResolutionOutcome } from "../../lib/pay-packs";
import { useScenarioActions } from "./use-scenario-actions";

const entry = getRegistryEntry("AU-PAY-011")!;

type MedicareStatus = "standard" | "half_exemption" | "full_exemption";

/** The four supported pay cycles and their periods per year. */
const CYCLES = [
  { cycle: "weekly", label: "Weekly", periods: 52 },
  { cycle: "fortnightly", label: "Fortnightly", periods: 26 },
  { cycle: "monthly", label: "Monthly", periods: 12 },
  { cycle: "quarterly", label: "Quarterly", periods: 4 },
] as const satisfies ReadonlyArray<{ cycle: WithholdingCycle; label: string; periods: number }>;

function periodsPerYear(cycle: WithholdingCycle): number {
  return CYCLES.find((candidate) => candidate.cycle === cycle)!.periods;
}

/** Medicare levy exemption declarations, mapped to schedule scales 5 and 6. */
const MEDICARE_OPTIONS = [
  { value: "standard", label: "Standard — no exemption claimed" },
  { value: "half_exemption", label: "Half Medicare levy exemption (scale 6)" },
  { value: "full_exemption", label: "Full Medicare levy exemption (scale 5)" },
] as const satisfies ReadonlyArray<{ value: MedicareStatus; label: string }>;

const SCALE_LABEL: Record<string, string> = {
  scale1_no_tft: "Scale 1 — tax-free threshold not claimed",
  scale2_tft: "Scale 2 — tax-free threshold claimed",
  scale3_foreign: "Scale 3 — foreign resident",
  scale5_full_medicare_exempt: "Scale 5 — full Medicare levy exemption",
  scale6_half_medicare_exempt: "Scale 6 — half Medicare levy exemption",
};

/** Bounding row for the weekly-equivalent earnings, per the pack's row bounds. */
function rowFor(rows: CoefficientRow[], weeklyX: DecimalValue): CoefficientRow | null {
  for (const row of rows) {
    if (row.lessThan !== undefined && weeklyX.lessThan(new Dec(row.lessThan))) return row;
  }
  return rows.find((row) => row.andOver !== undefined) ?? rows[rows.length - 1] ?? null;
}

/**
 * Fail closed: the coefficients are only surfaced when substituting them back
 * reproduces the weekly figure the engine returned, so the displayed working
 * can never disagree with the displayed answer.
 */
function verifiedRow(
  rows: CoefficientRow[] | null,
  weeklyX: DecimalValue,
  engineWeekly: DecimalValue,
): CoefficientRow | null {
  if (!rows) return null;
  const row = rowFor(rows, weeklyX);
  if (!row) return null;
  const raw = new Dec(row.a).times(weeklyX).minus(new Dec(row.b));
  const weekly = (raw.lessThan(0) ? new Dec(0) : raw).toDecimalPlaces(0, Dec.ROUND_HALF_UP);
  return weekly.equals(engineWeekly) ? row : null;
}

function boundsLabel(row: CoefficientRow): string {
  if (row.andOver !== undefined) return `$${Number(row.andOver).toLocaleString("en-AU")} and over`;
  return `Under $${Number(row.lessThan ?? "0").toLocaleString("en-AU")}`;
}

/** One coefficient table for a schedule scale, active row marked. */
function CoefficientTable({
  caption,
  rows,
  active,
}: {
  caption: string;
  rows: CoefficientRow[];
  active: CoefficientRow | null;
}) {
  return (
    <div className="grid gap-4">
      <h3 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">{caption}</h3>
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
              <th scope="col" className="py-2 pe-4 font-normal">Weekly earnings</th>
              <th scope="col" className="py-2 pe-4 text-right font-normal">a</th>
              <th scope="col" className="py-2 text-right font-normal">b</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isActive = active !== null && row === active;
              return (
                <tr
                  key={`${row.lessThan ?? ""}-${row.andOver ?? ""}`}
                  aria-current={isActive ? "true" : undefined}
                  className={
                    isActive
                      ? "border-b-2 border-hairline-strong bg-surface-2"
                      : "border-b border-hairline"
                  }
                >
                  <th
                    scope="row"
                    className={`py-2 pe-4 text-[13px] font-normal ${isActive ? "text-ink" : "text-ink-2"}`}
                  >
                    {boundsLabel(row)}
                    {isActive ? (
                      <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                        Applied
                      </span>
                    ) : null}
                  </th>
                  <td
                    className={`py-2 pe-4 text-right font-mono text-[13px] tabular-nums ${isActive ? "text-ink" : "text-ink-3"}`}
                  >
                    {row.a}
                  </td>
                  <td
                    className={`py-2 text-right font-mono text-[13px] tabular-nums ${isActive ? "text-ink" : "text-ink-3"}`}
                  >
                    {row.b}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function WithholdingCalculator() {
  const [earningsRaw, setEarningsRaw] = useState("");
  const [cycle, setCycle] = useState<WithholdingCycle>("fortnightly");
  const [claimsTFT, setClaimsTFT] = useState(true);
  const [foreignResident, setForeignResident] = useState(false);
  const [stsl, setStsl] = useState(false);
  const [medicareStatus, setMedicareStatus] = useState<MedicareStatus>("standard");
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");
  const [computation, setComputation] = useState<WithholdingComputation | null>(null);
  /** Annual reconciliation from E02 — never derived from the schedule figures. */
  const [reconciliation, setReconciliation] = useState<{
    annualisedWithholding: Money;
    annualLiability: Money;
    variance: Money;
  } | null>(null);

  const scenario = useScenarioActions({
    calculatorId: entry.id,
    state: { earningsRaw, cycle, claimsTFT, foreignResident, stsl, medicareStatus },
    onHydrate: (saved) => {
      if (typeof saved.earningsRaw === "string") setEarningsRaw(saved.earningsRaw);
      if (CYCLES.some((candidate) => candidate.cycle === saved.cycle)) setCycle(saved.cycle!);
      if (typeof saved.claimsTFT === "boolean") setClaimsTFT(saved.claimsTFT);
      if (typeof saved.foreignResident === "boolean") setForeignResident(saved.foreignResident);
      if (typeof saved.stsl === "boolean") setStsl(saved.stsl);
      if (MEDICARE_OPTIONS.some((option) => option.value === saved.medicareStatus)) {
        setMedicareStatus(saved.medicareStatus!);
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    resolvePayPacks("2026-27").then((outcome) => {
      if (cancelled) return;
      setResolution(outcome);
      if (!outcome.ok || !outcome.resolution.payg) {
        analytics.track("rule_unavailable_shown", { calculator_id: entry.id, rule_status: "unavailable" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const earnings = useMemo(() => parseMoneyInput(earningsRaw), [earningsRaw]);

  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !resolution.resolution.payg || !earnings.ok) {
      setComputation(null);
      return;
    }
    const scale = selectScale({
      residency: foreignResident ? "foreign_resident" : "resident",
      claimsTaxFreeThreshold: claimsTFT,
      medicareStatus,
    });
    if (typeof scale !== "string") {
      setComputation(null);
      return;
    }
    const result = computeWithholding(resolution.resolution.payg.pack.rules, {
      periodEarnings: moneyToDecimal(earnings.money) as DecimalValue,
      cycle,
      scale,
      stslEnabled: stsl,
    });
    setComputation(result);
    analytics.track("calculation_completed", {
      calculator_id: entry.id,
      mode: "simple",
      financial_year: "2026-27",
      has_warnings: false,
      duration_bucket: "under_100ms",
    });
  }, [resolution, earnings, cycle, claimsTFT, foreignResident, stsl, medicareStatus]);

  /** The entered pay annualised, then split across every cycle. Each column is
   * a fresh schedule run on that cycle's earnings — never a division of one. */
  const annualEarnings = useMemo(
    () =>
      earnings.ok
        ? ((moneyToDecimal(earnings.money) as DecimalValue).times(periodsPerYear(cycle)) as DecimalValue)
        : null,
    [earnings, cycle],
  );

  const allCycles = useMemo(() => {
    if (resolution === "pending" || !resolution.ok || !resolution.resolution.payg || !annualEarnings) {
      return null;
    }
    const scale = selectScale({
      residency: foreignResident ? "foreign_resident" : "resident",
      claimsTaxFreeThreshold: claimsTFT,
      medicareStatus,
    });
    if (typeof scale !== "string") return null;
    const rules = resolution.resolution.payg.pack.rules;
    try {
      return CYCLES.map((column) => {
        const periodEarnings = annualEarnings.div(column.periods) as DecimalValue;
        const run = computeWithholding(rules, {
          periodEarnings,
          cycle: column.cycle,
          scale,
          stslEnabled: stsl,
        });
        return {
          ...column,
          periodEarnings,
          periodTotal: run.periodTotal,
          annualised: run.periodTotal.times(column.periods) as DecimalValue,
        };
      });
    } catch {
      // Missing coefficients for a scale fail closed: the table is dropped
      // rather than shown with a gap that could read as "nothing withheld".
      return null;
    }
  }, [resolution, annualEarnings, claimsTFT, foreignResident, stsl, medicareStatus]);

  /* E02 annual liability against E03 annualised withholding. Deliberately a
   * separate engine call: this is the reconciliation, not a rescaling. */
  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !annualEarnings) {
      setReconciliation(null);
      return;
    }
    let cancelled = false;
    calculateAuPay(
      {
        requestId: "web-reconcile",
        calculatorId: entry.id,
        calculatorSchemaVersion: entry.inputSchemaVersion,
        jurisdiction: { country: "AU" },
        locale: "en-AU",
        currency: "AUD",
        valuationDate: "2026-10-01",
        input: {
          financialYear: "2026-27",
          income: {
            amount: moneyFromDecimalString("AUD", annualEarnings.toFixed(2), 2),
            frequency: "annually",
            weeksPaidPerYear: "52",
          },
          package: { treatment: "base_plus_super", employerSuperRate: null, applyMaximumContributionBase: true },
          taxpayer: {
            residency: foreignResident ? "foreign_resident" : "resident",
            claimsTaxFreeThreshold: claimsTFT,
            medicare: {
              status: medicareStatus,
              hasPrivateHospitalCover: false,
              familyStatus: "single",
              dependants: 0,
            },
          },
          adjustments: {},
          studyLoans: { enabled: stsl },
          withholding: { payFrequency: cycle },
        },
        options: { traceLevel: "none" },
      },
      resolution.resolution,
      { now: new Date().toISOString() },
    ).then((calculated) => {
      if (cancelled) return;
      const out = calculated.output;
      setReconciliation(
        out && out.withholding
          ? {
              annualisedWithholding: out.withholding.annualised,
              annualLiability: out.liability.totalAnnualLiability,
              variance: out.withholding.varianceFromAnnualLiability,
            }
          : null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [resolution, annualEarnings, cycle, claimsTFT, foreignResident, stsl, medicareStatus]);

  const paygUnavailable =
    resolution !== "pending" && resolution.ok && resolution.resolution.payg === null;
  const draft = resolution !== "pending" && resolution.ok && resolution.draft;
  const toMoney = (value: DecimalValue) =>
    moneyFromDecimalString("AUD", value.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2), 2);

  const paygRules =
    resolution !== "pending" && resolution.ok && resolution.resolution.payg
      ? resolution.resolution.payg.pack.rules
      : null;
  const weeklyX = computation ? new Dec(computation.weeklyX) : null;
  const ordinaryRows =
    paygRules && computation
      ? {
          scale1_no_tft: paygRules.scales.scale1NoTaxFreeThreshold,
          scale2_tft: paygRules.scales.scale2TaxFreeThreshold,
          scale3_foreign: paygRules.scales.scale3ForeignResident,
          scale5_full_medicare_exempt: paygRules.scales.scale5FullMedicareExemption,
          scale6_half_medicare_exempt: paygRules.scales.scale6HalfMedicareExemption,
        }[computation.scale]
      : null;
  const stslRows =
    paygRules && computation
      ? computation.scale === "scale1_no_tft"
        ? paygRules.stslComponents.noTaxFreeThreshold
        : paygRules.stslComponents.taxFreeThresholdOrForeign
      : null;
  const activeOrdinary =
    computation && weeklyX ? verifiedRow(ordinaryRows, weeklyX, computation.weeklyOrdinary) : null;
  const activeStsl =
    stsl && computation && weeklyX ? verifiedRow(stslRows, weeklyX, computation.weeklyStsl) : null;

  return (
    <>
      {draft ? <DraftRulesBanner /> : null}
      <CalculatorShell
        header={
          <CalculatorHeader
            meta={{
              title: entry.displayName,
              jurisdictionLabel: "Australia",
              periodLabel: "Payments from 1 July 2026",
              calculationClass: entry.calculationClass,
              ruleStatus:
                resolution === "pending"
                  ? { label: "Resolving rules", tone: "neutral" }
                  : resolution.ok && resolution.resolution.payg
                    ? resolution.draft
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
                  setEarningsRaw("");
                  setCycle("fortnightly");
                  setClaimsTFT(true);
                  setForeignResident(false);
                  setStsl(false);
                  setMedicareStatus("standard");
                }}
              />
            }
          />
        }
        inputs={
          resolution !== "pending" && (!resolution.ok || paygUnavailable) ? (
            <RuleUnavailableState
              jurisdictionLabel="Australia (PAYG schedules)"
              detail={resolution.ok ? "The PAYG withholding schedule pack could not be resolved." : resolution.reason}
            />
          ) : (
            <div className="grid gap-6">
              <MoneyField
                id="wh-earnings"
                label="Gross earnings per pay"
                description="Salary or wages plus taxable allowances for one pay period."
                value={earningsRaw}
                onChange={setEarningsRaw}
                error={!earnings.ok && earnings.error ? earnings.error : undefined}
              />
              <SelectField
                id="wh-cycle"
                label="Pay cycle"
                value={cycle}
                onChange={setCycle}
                options={[
                  { value: "weekly", label: "Weekly" },
                  { value: "fortnightly", label: "Fortnightly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "quarterly", label: "Quarterly" },
                ]}
              />
              <ToggleField
                id="wh-tft"
                label="Tax-free threshold claimed"
                checked={claimsTFT}
                onChange={setClaimsTFT}
              />
              <ToggleField
                id="wh-foreign"
                label="Foreign resident"
                checked={foreignResident}
                onChange={setForeignResident}
              />
              <SelectField
                id="wh-medicare"
                label="Medicare levy exemption"
                description="An exemption declaration routes withholding to schedule scale 5 or 6."
                value={medicareStatus}
                onChange={setMedicareStatus}
                options={MEDICARE_OPTIONS.map((option) => ({ ...option }))}
              />
              <ToggleField
                id="wh-stsl"
                label="Study or training support loan"
                checked={stsl}
                onChange={setStsl}
              />
            </div>
          )
        }
        results={
          resolution !== "pending" && (!resolution.ok || paygUnavailable) ? (
            <EmptyState>No result can be shown while the withholding schedule is unavailable.</EmptyState>
          ) : !computation ? (
            <EmptyState>
              Enter the gross pay for one period to calculate withholding from the official
              statement-of-formulas coefficients.
            </EmptyState>
          ) : (
            <div className="grid min-w-0 gap-6">
            <div className="nexus-result @container grid gap-6 p-6 md:p-8">
              <PrimaryResult
                label={`Total withheld per ${cycle.replace("ly", "")}`}
                amount={toMoney(computation.periodTotal)}
                qualifier={`Calculated as y = a·x − b on weekly-equivalent earnings of $${computation.weeklyX} using ${computation.scale.replaceAll("_", " ")}, rounded to the dollar per the schedule.`}
              />
              <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 @sm:grid-cols-2">
                <ResultMetric label="PAYG component" amount={toMoney(computation.periodOrdinary)} />
                <ResultMetric label="Study loan component" amount={toMoney(computation.periodStsl)} />
              </div>
              <p className="text-[12px] leading-5 text-ink-3">
                This follows the ATO schedule for the pay period. It is not annual tax divided by pay
                periods, and it can differ from the annual liability that settles at tax time. Withheld
                per year at this rate: {formatMoney(toMoney(computation.periodTotal.times(periodsPerYear(cycle)) as DecimalValue))}.
              </p>
            </div>

            {allCycles && annualEarnings ? (
              <section
                /* Not "pay cycle": that phrase is the select's label, and a
                 * region sharing it would make getByLabel ambiguous. */
                aria-label="Withholding at every cycle"
                className="nexus-panel-soft @container grid min-w-0 gap-4 p-6 md:p-8"
              >
                <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                    Every pay cycle on the same annual earnings
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    {formatMoney(toMoney(annualEarnings))} per year
                  </span>
                </div>
                <div className="min-w-0 overflow-x-auto">
                  <table className="w-full min-w-[380px] border-collapse text-left">
                    <caption className="sr-only">
                      Gross per period, withheld per period and withheld per year, for each pay cycle
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">Cycle</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">Gross per period</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">Withheld per period</th>
                        <th scope="col" className="py-2 text-right font-normal">Withheld per year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCycles.map((row) => {
                        const isCurrent = row.cycle === cycle;
                        return (
                          <tr
                            key={row.cycle}
                            aria-current={isCurrent ? "true" : undefined}
                            className={
                              isCurrent
                                ? "border-b-2 border-hairline-strong bg-surface-2"
                                : "border-b border-hairline"
                            }
                          >
                            <th
                              scope="row"
                              className={`py-2 pe-4 text-[13px] font-normal ${isCurrent ? "text-ink" : "text-ink-2"}`}
                            >
                              {row.label}
                              {isCurrent ? (
                                <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                                  Selected
                                </span>
                              ) : null}
                            </th>
                            <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-3">
                              {formatMoney(toMoney(row.periodEarnings))}
                            </td>
                            <td
                              className={`py-2 pe-4 text-right font-mono text-[13px] tabular-nums ${isCurrent ? "text-ink" : "text-ink-2"}`}
                            >
                              {formatMoney(toMoney(row.periodTotal))}
                            </td>
                            <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink-2">
                              {formatMoney(toMoney(row.annualised))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  Every row is its own run of the schedule on that cycle&rsquo;s earnings. The yearly totals
                  differ between cycles because the schedule rounds within each period.
                </p>
                {reconciliation ? (
                  <div className="grid gap-1.5 border-t border-hairline pt-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                      Annual reconciliation
                    </span>
                    <span className="font-mono text-[13px] leading-6 tabular-nums text-ink">
                      {formatMoney(reconciliation.annualisedWithholding)} withheld over the year against an
                      annual liability of {formatMoney(reconciliation.annualLiability)} — variance{" "}
                      {formatMoney(reconciliation.variance)}.
                    </span>
                    <span className="text-[12px] leading-5 text-ink-3">
                      The liability comes from the separate annual engine on these earnings and
                      declarations alone; the variance settles at tax time.
                    </span>
                  </div>
                ) : null}
              </section>
            ) : null}
            </div>
          )
        }
        explanation={
          computation && weeklyX && ordinaryRows ? (
            <section
              aria-label="How this was calculated"
              className="nexus-panel @container grid min-w-0 gap-6 p-6 md:p-8"
            >
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">Working</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                  {SCALE_LABEL[computation.scale] ?? computation.scale}
                </span>
              </div>

              <dl className="grid auto-rows-fr gap-4 @xl:grid-cols-3">
                {(
                  [
                    ["Weekly-equivalent earnings", `$${computation.weeklyX}`],
                    ["Withheld per week", `$${computation.weeklyOrdinary.toFixed(0)}`],
                    ["Withheld per period", `$${computation.periodOrdinary.toFixed(0)}`],
                  ] as const
                ).map(([term, value]) => (
                  <div key={term} className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                      {term}
                    </dt>
                    <dd className="font-mono text-xl tabular-nums text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="nexus-panel-soft grid min-w-0 gap-1.5 p-5">
                <span className="text-[13px] text-ink-2">
                  Coefficients applied to the weekly-equivalent earnings
                </span>
                {activeOrdinary ? (
                  <code className="font-mono text-[13px] tabular-nums text-ink">
                    {`${activeOrdinary.a} × ${computation.weeklyX} − ${activeOrdinary.b} → $${computation.weeklyOrdinary.toFixed(0)} per week`}
                  </code>
                ) : (
                  <span className="text-[13px] leading-5 text-ink-3">
                    The coefficient row for these earnings could not be confirmed against the
                    calculated amount, so it is not shown.
                  </span>
                )}
                <span className="text-[12px] leading-5 text-ink-3">
                  The weekly amount is rounded to the nearest dollar before the pay-period
                  conversion, exactly as the pack defines it.
                </span>
              </div>

              <CoefficientTable
                caption="Withholding coefficients for this scale"
                rows={ordinaryRows}
                active={activeOrdinary}
              />

              {stsl && stslRows ? (
                <CoefficientTable
                  caption="Study-loan component coefficients"
                  rows={stslRows}
                  active={activeStsl}
                />
              ) : null}
            </section>
          ) : null
        }
        disclosure={<UniversalDisclosure financialYear="2026-27" />}
      />
    </>
  );
}
