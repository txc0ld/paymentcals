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
import { analytics } from "../../lib/analytics";
import { parseMoneyInput } from "../../lib/money-input";
import { resolvePayPacks, type PayResolutionOutcome } from "../../lib/pay-packs";

const entry = getRegistryEntry("AU-PAY-011")!;

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
            <div className="clay-result grid gap-6 p-6">
              <PrimaryResult
                label={`Total withheld per ${cycle.replace("ly", "")}`}
                amount={toMoney(computation.periodTotal)}
                qualifier={`Calculated as y = a·x − b on weekly-equivalent earnings of $${computation.weeklyX} using ${computation.scale.replaceAll("_", " ")}, rounded to the dollar per the schedule.`}
              />
              <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
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
        explanation={null}
        disclosure={<UniversalDisclosure financialYear="2026-27" />}
      />
    </>
  );
}
