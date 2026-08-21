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
  UniversalDisclosure,
  formatMoney,
  formatRatePercent,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { stslRepayment } from "@paymentcalcs/engine-au-tax";
import { Dec, moneyFromDecimalString, moneyToDecimal, type DecimalValue } from "@paymentcalcs/calculation-core";
import type { StslRules } from "@paymentcalcs/rules-au";
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { FINANCIAL_YEARS, resolvePayPacks, type FinancialYear, type PayResolutionOutcome } from "../../lib/pay-packs";

const entry = getRegistryEntry("AU-PAY-013")!;

/** Whole-dollar pack bound, formatted for display. */
function bound(dollars: string): string {
  return formatMoney(moneyFromDecimalString("AUD", dollars, 0));
}

interface TierRow {
  key: string;
  range: string;
  rate: string;
  basis: string;
  active: boolean;
}

/** Repayment tiers exactly as the resolved pack states them, active one marked. */
function repaymentTiers(rules: StslRules, income: DecimalValue | null): TierRow[] {
  const rows: TierRow[] =
    rules.system === "marginal"
      ? [
          ...rules.bands.map((band) => ({
            key: band.over,
            range: band.upTo === null ? `Over ${bound(band.over)}` : `${bound(band.over)} to ${bound(band.upTo)}`,
            rate: formatRatePercent(band.rate),
            basis:
              band.baseAmount === "0"
                ? `On each dollar over ${bound(band.over)}`
                : `${bound(band.baseAmount)} plus that rate on each dollar over ${bound(band.over)}`,
            active: false,
          })),
          {
            key: `high-${rules.highIncome.over}`,
            range: `Over ${bound(rules.highIncome.over)}`,
            rate: formatRatePercent(rules.highIncome.rateOfTotal),
            basis: "On the whole repayment income",
            active: false,
          },
        ]
      : rules.rateTable.map((band) => ({
          key: band.over,
          range: band.upTo === null ? `Over ${bound(band.over)}` : `${bound(band.over)} to ${bound(band.upTo)}`,
          rate: formatRatePercent(band.rateOfTotal),
          basis: "On the whole repayment income",
          active: false,
        }));

  if (income) {
    const bands: ReadonlyArray<{ over: string; upTo: string | null }> =
      rules.system === "marginal" ? rules.bands : rules.rateTable;
    if (rules.system === "marginal" && income.greaterThan(new Dec(rules.highIncome.over))) {
      rows[rows.length - 1]!.active = true;
    } else {
      const index = bands.findIndex((band) => {
        const upTo = band.upTo === null ? null : new Dec(band.upTo);
        return income.greaterThan(new Dec(band.over)) && (upTo === null || income.lessThanOrEqualTo(upTo));
      });
      if (index >= 0) rows[index]!.active = true;
    }
  }
  return rows;
}

/** Five tiers centred on the active one — the thresholds around the income. */
function tierWindow(rows: TierRow[], size = 5): TierRow[] {
  if (rows.length <= size) return rows;
  const active = rows.findIndex((row) => row.active);
  const start = active < 0 ? 0 : Math.min(Math.max(0, active - 2), rows.length - size);
  return rows.slice(start, start + size);
}

export function HelpRepaymentCalculator() {
  const [financialYear, setFinancialYear] = useState<FinancialYear>("2026-27");
  const [incomeRaw, setIncomeRaw] = useState("");
  const [resolution, setResolution] = useState<PayResolutionOutcome | "pending">("pending");

  useEffect(() => {
    let cancelled = false;
    setResolution("pending");
    resolvePayPacks(financialYear).then((outcome) => {
      if (cancelled) return;
      setResolution(outcome);
      if (!outcome.ok || !outcome.resolution.stsl) {
        analytics.track("rule_unavailable_shown", { calculator_id: entry.id, rule_status: "unavailable" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [financialYear]);

  const income = useMemo(() => parseMoneyInput(incomeRaw), [incomeRaw]);

  const repayment = useMemo(() => {
    if (resolution === "pending" || !resolution.ok || !resolution.resolution.stsl || !income.ok) return null;
    const amount = stslRepayment(
      moneyToDecimal(income.money) as DecimalValue,
      resolution.resolution.stsl.pack.rules,
    );
    return moneyFromDecimalString("AUD", amount.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2), 2);
  }, [resolution, income]);

  useEffect(() => {
    if (repayment) {
      analytics.track("calculation_completed", {
        calculator_id: entry.id,
        mode: "simple",
        financial_year: financialYear,
        has_warnings: false,
        duration_bucket: "under_100ms",
      });
    }
  }, [repayment, financialYear]);

  const stslMissing = resolution !== "pending" && resolution.ok && resolution.resolution.stsl === null;
  const draft = resolution !== "pending" && resolution.ok && resolution.draft;
  const rules =
    resolution !== "pending" && resolution.ok && resolution.resolution.stsl
      ? resolution.resolution.stsl.pack.rules
      : null;
  const tiers = rules
    ? tierWindow(repaymentTiers(rules, income.ok ? (moneyToDecimal(income.money) as DecimalValue) : null))
    : [];

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
                  : resolution.ok && resolution.resolution.stsl
                    ? resolution.draft
                      ? { label: "Draft rules — not verified", tone: "draft" }
                      : { label: "Current", tone: "neutral" }
                    : { label: "Rules unavailable", tone: "warn" },
            }}
          />
        }
        inputs={
          resolution !== "pending" && (!resolution.ok || stslMissing) ? (
            <RuleUnavailableState
              jurisdictionLabel={`Australia FY ${financialYear}`}
              detail={resolution.ok ? "The study-loan rule pack could not be resolved." : resolution.reason}
            />
          ) : (
            <div className="grid gap-6">
              <SelectField
                id="help-fy"
                label="Financial year"
                value={financialYear}
                onChange={setFinancialYear}
                options={FINANCIAL_YEARS.map((fy) => ({ value: fy, label: `FY ${fy}` }))}
              />
              <MoneyField
                id="help-income"
                label="Repayment income"
                description="Taxable income plus reportable fringe benefits, reportable super contributions, net investment losses and exempt foreign employment income."
                value={incomeRaw}
                onChange={setIncomeRaw}
                error={!income.ok && income.error ? income.error : undefined}
              />
            </div>
          )
        }
        results={
          resolution !== "pending" && (!resolution.ok || stslMissing) ? (
            <EmptyState>No result can be shown while the study-loan rules are unavailable.</EmptyState>
          ) : !repayment ? (
            <EmptyState>Enter your repayment income to estimate the compulsory annual repayment.</EmptyState>
          ) : (
            <div className="nexus-result grid gap-6 p-6 md:p-8">
              <PrimaryResult
                label="Compulsory annual repayment"
                amount={repayment}
                qualifier={
                  rules?.system === "marginal"
                    ? `Under the FY ${financialYear} marginal system: nothing up to $${Number(rules.threshold).toLocaleString("en-AU")}, then marginal rates on income above it.`
                    : `Under the FY ${financialYear} system a single rate applies to your whole repayment income once you cross the threshold.`
                }
              />
              <div className="grid auto-rows-fr gap-4 border-t border-hairline pt-6 sm:grid-cols-2">
                <ResultMetric
                  label="Repayment income"
                  amount={income.ok ? income.money : repayment}
                />
                <ResultMetric
                  label="Monthly set-aside"
                  amount={moneyFromDecimalString(
                    "AUD",
                    (moneyToDecimal(repayment) as DecimalValue).div(12).toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2),
                    2,
                  )}
                  detail="repayment ÷ 12 for budgeting"
                />
              </div>

              {tiers.length > 0 ? (
                <section aria-label="Repayment rate thresholds" className="grid gap-4 border-t border-hairline pt-6">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                    <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                      Repayment rate thresholds
                    </h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                      From the resolved rule pack
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[320px] border-collapse text-left">
                      <caption className="sr-only">
                        Repayment income tiers around your income, with the applied tier marked
                      </caption>
                      <thead>
                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                          <th scope="col" className="py-2 pe-4 font-normal">Repayment income</th>
                          <th scope="col" className="py-2 pe-4 text-right font-normal">Rate</th>
                          <th scope="col" className="py-2 font-normal">Basis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiers.map((tier) => (
                          <tr
                            key={tier.key}
                            aria-current={tier.active ? "true" : undefined}
                            className={
                              tier.active
                                ? "border-b-2 border-hairline-strong bg-surface-2"
                                : "border-b border-hairline"
                            }
                          >
                            <th
                              scope="row"
                              className={`py-2 pe-4 font-mono text-[13px] font-normal tabular-nums ${tier.active ? "text-ink" : "text-ink-2"}`}
                            >
                              {tier.range}
                              {tier.active ? (
                                <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--pc-accent-text)]">
                                  Applied
                                </span>
                              ) : null}
                            </th>
                            <td
                              className={`py-2 pe-4 text-right font-mono text-[13px] tabular-nums ${tier.active ? "text-ink" : "text-ink-3"}`}
                            >
                              {tier.rate}
                            </td>
                            <td className={`py-2 text-[13px] ${tier.active ? "text-ink-2" : "text-ink-3"}`}>
                              {tier.basis}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <p className="text-[12px] leading-5 text-ink-3">
                The compulsory repayment is assessed on your tax return. Employer withholding for study
                loans accumulates toward it during the year but is a separate amount:{" "}
                {formatMoney(repayment)} is the annual figure, not a per-pay deduction.
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
