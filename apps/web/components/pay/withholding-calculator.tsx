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
import { Dec, moneyFromDecimalString, moneyToDecimal, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { CoefficientRow } from "@paymentcalcs/rules-au";
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { resolvePayPacks, type PayResolutionOutcome } from "../../lib/pay-packs";

const entry = getRegistryEntry("AU-PAY-011")!;

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
      <h3 className="font-mono text-[11px] tracking-[0.16em] text-ink-2">{caption}</h3>
      <div className="overflow-x-auto">
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
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");
  const [computation, setComputation] = useState<WithholdingComputation | null>(null);

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
      medicareStatus: "standard",
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
  }, [resolution, earnings, cycle, claimsTFT, foreignResident, stsl]);

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
            <div className="nexus-result grid gap-6 p-6 md:p-8">
              <PrimaryResult
                label={`Total withheld per ${cycle.replace("ly", "")}`}
                amount={toMoney(computation.periodTotal)}
                qualifier={`Calculated as y = a·x − b on weekly-equivalent earnings of $${computation.weeklyX} using ${computation.scale.replaceAll("_", " ")}, rounded to the dollar per the schedule.`}
              />
              <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
                <ResultMetric label="PAYG component" amount={toMoney(computation.periodOrdinary)} />
                <ResultMetric label="Study loan component" amount={toMoney(computation.periodStsl)} />
              </div>
              <p className="text-[12px] leading-5 text-ink-3">
                This follows the ATO schedule for the pay period. It is not annual tax divided by pay
                periods, and it can differ from the annual liability that settles at tax time. Withheld
                per year at this rate: {formatMoney(toMoney(computation.periodTotal.times(cycle === "weekly" ? 52 : cycle === "fortnightly" ? 26 : cycle === "monthly" ? 12 : 4) as DecimalValue))}.
              </p>
            </div>
          )
        }
        explanation={
          computation && weeklyX && ordinaryRows ? (
            <section
              aria-label="How this was calculated"
              className="nexus-panel grid min-w-0 gap-6 p-6 md:p-8"
            >
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-ink-2">Working</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                  {SCALE_LABEL[computation.scale] ?? computation.scale}
                </span>
              </div>

              <dl className="grid auto-rows-fr gap-4 sm:grid-cols-3">
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
