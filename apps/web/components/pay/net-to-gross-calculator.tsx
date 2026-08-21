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
import {
  Dec,
  moneyFromDecimalString,
  moneyToDecimal,
  type DecimalValue,
  type Money,
} from "@paymentcalcs/calculation-core";
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
  /** The annual target the displayed solution was solved against. */
  const [solvedTarget, setSolvedTarget] = useState<Money | null>(null);

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
      setSolvedTarget(null);
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
    const annualTargetMoney = moneyFromDecimalString("AUD", annualTarget.toFixed(2), 2);
    const result = solveGrossForNet(annualTargetMoney, template, resolution.resolution);
    setSolved(result);
    setSolvedTarget(annualTargetMoney);
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
            <div className="nexus-panel-soft grid gap-4 p-6 md:p-8">
              <h2 className="text-lg font-semibold tracking-tight text-ink">No solution in range</h2>
              <p className="text-[14px] leading-6 text-ink-2">{solved.reason}</p>
            </div>
          ) : (
            <div className="nexus-result grid gap-6 p-6 md:p-8">
              <PrimaryResult
                label={includesSuper ? "Required package (incl. super)" : "Required gross salary"}
                amount={solved.grossAnnual!}
                qualifier={`Re-running the forward calculator on this gross produces ${formatMoney(solved.achievedNetAnnual!)} net per year (residual ${formatMoney(solved.residual!)}). ${NET_TO_GROSS_TOLERANCE_NOTE}`}
              />
              <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
                <ResultMetric
                  label={`Gross ${frequency === "annually" ? "per year" : `per ${frequency.replace("ly", "").replace("annual", "year")}`}`}
                  amount={perPeriod(moneyToDecimal(solved.grossAnnual!) as DecimalValue)}
                />
                <ResultMetric label="Achieved net (annual)" amount={solved.achievedNetAnnual!} />
              </div>

              {solvedTarget ? (
                <section aria-label="Verification round-trip" className="grid gap-4 border-t border-hairline pt-6">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-ink-2">
                      Verification round-trip
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                      Solved by bisection over the full forward engine in {solved.iterations} iterations
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[320px] border-collapse text-left">
                      <caption className="sr-only">
                        Target net compared with the net recomputed from the solved gross
                      </caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">Step</th>
                          <th scope="col" className="py-2 text-right font-normal">Annual amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            ["Target net", solvedTarget, false],
                            ["Solved gross", solved.grossAnnual!, false],
                            ["Recomputed net from that gross", solved.achievedNetAnnual!, false],
                            ["Difference from target", solved.residual!, true],
                          ] as const
                        ).map(([label, amount, emphasis]) => (
                          <tr
                            key={label}
                            className={emphasis ? "border-b-2 border-hairline-strong" : "border-b border-hairline"}
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
                    The solved gross is fed back through the full forward engine; the difference above
                    is the residual left by bisection, not a rounding allowance.
                  </p>
                </section>
              ) : null}
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
