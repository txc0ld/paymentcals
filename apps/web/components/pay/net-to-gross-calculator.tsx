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
  NET_TO_GROSS_TOLERANCE_NOTE,
  solveGrossForNet,
  zAuPayInput,
  type NetToGrossResult,
} from "@paymentcalcs/engine-au-tax";
import { Dec, moneyFromDecimalString, moneyToDecimal, type DecimalValue } from "@paymentcalcs/calculation-core";
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { FINANCIAL_YEARS, resolvePayPacks, type FinancialYear, type PayResolutionOutcome } from "../../lib/pay-packs";

const entry = getRegistryEntry("AU-PAY-004")!;

const PERIODS = { annually: 1, monthly: 12, fortnightly: 26, weekly: 52 } as const;
type TargetFrequency = keyof typeof PERIODS;

export function NetToGrossCalculator() {
  const [financialYear, setFinancialYear] = useState<FinancialYear>("2026-27");
  const [targetRaw, setTargetRaw] = useState("");
  const [frequency, setFrequency] = useState<TargetFrequency>("annually");
  const [helpDebt, setHelpDebt] = useState(false);
  const [includesSuper, setIncludesSuper] = useState(false);
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");
  const [solved, setSolved] = useState<NetToGrossResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolution("pending");
    resolvePayPacks(financialYear).then((outcome) => {
      if (cancelled) return;
      setResolution(outcome);
      if (!outcome.ok) {
        analytics.track("rule_unavailable_shown", { calculator_id: entry.id, rule_status: "unavailable" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  const target = useMemo(() => parseMoneyInput(targetRaw), [targetRaw]);

  useEffect(() => {
    if (resolution === "pending" || !resolution.ok || !target.ok) {
      setSolved(null);
      return;
    }
    const annualTarget = (moneyToDecimal(target.money) as DecimalValue).times(PERIODS[frequency]);
    const template = zAuPayInput.parse({
      financialYear,
      income: { amount: moneyFromDecimalString("AUD", "0", 2), frequency: "annually" },
      package: {
        treatment: includesSuper ? "total_package_including_super" : "base_plus_super",
      },
      taxpayer: { residency: "resident" },
      studyLoans: { enabled: helpDebt },
    });
    const result = solveGrossForNet(
      moneyFromDecimalString("AUD", annualTarget.toFixed(2), 2),
      template,
      resolution.resolution,
    );
    setSolved(result);
    analytics.track(result.status === "solved" ? "calculation_completed" : "calculation_failed", {
      calculator_id: entry.id,
      mode: "simple",
      financial_year: financialYear,
      has_warnings: result.discontinuity,
      duration_bucket: "under_750ms",
      ...(result.status === "solved" ? {} : { error_code: "PC-CALC-0301" }),
    });
  }, [resolution, target, frequency, financialYear, helpDebt, includesSuper]);

  const draft = resolution !== "pending" && resolution.ok && resolution.draft;
  const perPeriod = (annual: DecimalValue) =>
    moneyFromDecimalString(
      "AUD",
      annual.div(PERIODS[frequency]).toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2),
      2,
    );

  return (
    <>
      {draft ? <DraftRulesBanner /> : null}
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
                id="ntg-fy"
                label="Financial year"
                value={financialYear}
                onChange={setFinancialYear}
                options={FINANCIAL_YEARS.map((fy) => ({ value: fy, label: `FY ${fy}` }))}
              />
              <MoneyField
                id="ntg-target"
                label="Target take-home amount"
                description="The net cash you want in hand after tax and study-loan repayments."
                value={targetRaw}
                onChange={setTargetRaw}
                error={!target.ok && target.error ? target.error : undefined}
              />
              <SelectField
                id="ntg-frequency"
                label="Target is per"
                value={frequency}
                onChange={setFrequency}
                options={[
                  { value: "annually", label: "Year" },
                  { value: "monthly", label: "Month" },
                  { value: "fortnightly", label: "Fortnight" },
                  { value: "weekly", label: "Week" },
                ]}
              />
              <ToggleField
                id="ntg-help"
                label="HELP or other study loan"
                checked={helpDebt}
                onChange={setHelpDebt}
              />
              <ToggleField
                id="ntg-super"
                label="Solve for a package including super"
                description="On to find the total package; off to find the base salary."
                checked={includesSuper}
                onChange={setIncludesSuper}
              />
            </div>
          )
        }
        results={
          resolution !== "pending" && !resolution.ok ? (
            <EmptyState>No result can be shown while the required rule packs are unavailable.</EmptyState>
          ) : !solved ? (
            <EmptyState>Enter a target take-home amount to solve the gross salary that produces it.</EmptyState>
          ) : solved.status !== "solved" ? (
            <div className="nexus-panel-soft grid gap-3 p-6">
              <h2 className="text-lg font-semibold tracking-tight text-ink">No solution in range</h2>
              <p className="text-[14px] leading-6 text-ink-2">{solved.reason}</p>
            </div>
          ) : (
            <div className="nexus-result grid gap-6 p-6">
              <PrimaryResult
                label={includesSuper ? "Required package (incl. super)" : "Required gross salary"}
                amount={solved.grossAnnual!}
                qualifier={`Re-running the forward calculator on this gross produces ${formatMoney(solved.achievedNetAnnual!)} net per year (residual ${formatMoney(solved.residual!)}). ${NET_TO_GROSS_TOLERANCE_NOTE}`}
              />
              <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
                <ResultMetric
                  label={`Gross ${frequency === "annually" ? "per year" : `per ${frequency.replace("ly", "").replace("annual", "year")}`}`}
                  amount={perPeriod(moneyToDecimal(solved.grossAnnual!) as DecimalValue)}
                />
                <ResultMetric label="Achieved net (annual)" amount={solved.achievedNetAnnual!} />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
                Solved by bisection over the full forward engine in {solved.iterations} iterations
              </p>
              {solved.discontinuity ? (
                <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                  Dollar-rounding creates small steps in net pay, so the smallest gross meeting the
                  target is shown rather than an exact match.
                </p>
              ) : null}
              <p className="text-[12px] leading-5 text-ink-3">
                Near Medicare levy surcharge thresholds (without hospital cover), more than one gross
                can produce the same net; the answer shown is verified by the forward calculation but
                may not be the only one.
              </p>
            </div>
          )
        }
        explanation={null}
        disclosure={<UniversalDisclosure financialYear={financialYear} />}
      />
    </>
  );
}
