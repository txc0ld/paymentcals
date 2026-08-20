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
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { stslRepayment } from "@paymentcalcs/engine-au-tax";
import { Dec, moneyFromDecimalString, moneyToDecimal, type DecimalValue } from "@paymentcalcs/calculation-core";
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { FINANCIAL_YEARS, resolvePayPacks, type FinancialYear, type PayResolutionOutcome } from "../../lib/pay-packs";

const entry = getRegistryEntry("AU-PAY-013")!;

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
            <div className="nexus-result grid gap-6 p-6">
              <PrimaryResult
                label="Compulsory annual repayment"
                amount={repayment}
                qualifier={
                  rules?.system === "marginal"
                    ? `Under the FY ${financialYear} marginal system: nothing up to $${Number(rules.threshold).toLocaleString("en-AU")}, then marginal rates on income above it.`
                    : `Under the FY ${financialYear} system a single rate applies to your whole repayment income once you cross the threshold.`
                }
              />
              <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
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
