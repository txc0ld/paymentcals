"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  SelectField,
  UniversalDisclosure,
  formatMoney,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString } from "@paymentcalcs/calculation-core";
import {
  requiredContribution,
  simulateSavings,
  type CompoundingFrequency,
  type SavingsResult,
} from "@paymentcalcs/engine-savings";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

export function SavingsCalculator({ variant }: { variant: "compound" | "goal" }) {
  const entry = getRegistryEntry(variant === "goal" ? "GL-SAVE-003" : "GL-SAVE-002")!;
  const [openingRaw, setOpeningRaw] = useState("");
  const [contributionRaw, setContributionRaw] = useState("");
  const [targetRaw, setTargetRaw] = useState("");
  const [ratePctRaw, setRatePctRaw] = useState("");
  const [yearsRaw, setYearsRaw] = useState("10");
  const [compounding, setCompounding] = useState<CompoundingFrequency>("monthly");
  const [timing, setTiming] = useState<"end" | "beginning">("end");

  const opening = useMemo(() => parseMoneyInput(openingRaw), [openingRaw]);
  const contribution = useMemo(() => parseMoneyInput(contributionRaw), [contributionRaw]);
  const target = useMemo(() => parseMoneyInput(targetRaw), [targetRaw]);
  const rateValid = /^\d+(\.\d+)?$/.test(ratePctRaw.trim()) && Number.parseFloat(ratePctRaw) <= 25;
  const yearsValid = /^\d+$/.test(yearsRaw.trim()) && Number.parseInt(yearsRaw, 10) >= 1 && Number.parseInt(yearsRaw, 10) <= 60;

  const settings = useMemo(() => {
    if (!rateValid || !yearsValid) return null;
    return {
      openingBalance: opening.ok ? moneyToDecimalString(opening.money) : "0",
      annualRate: (Number.parseFloat(ratePctRaw) / 100).toString(),
      years: Number.parseInt(yearsRaw, 10),
      compounding,
      timing,
    };
  }, [rateValid, yearsValid, opening, ratePctRaw, yearsRaw, compounding, timing]);

  const result: SavingsResult | null = useMemo(() => {
    if (!settings) return null;
    if (variant === "goal") {
      if (!target.ok) return null;
      // Round the required deposit UP to the next cent so the cent-rounded
      // simulation can never finish below the stated target.
      const needed = requiredContribution(moneyToDecimalString(target.money), settings)
        .toDecimalPlaces(2, Dec.ROUND_UP);
      return simulateSavings({ ...settings, contribution: needed.toFixed(2) });
    }
    if (!contribution.ok && contributionRaw.trim() !== "") return null;
    return simulateSavings({
      ...settings,
      contribution: contribution.ok ? moneyToDecimalString(contribution.money) : "0",
    });
  }, [settings, variant, target, contribution, contributionRaw]);

  const perPeriodNeeded = useMemo(() => {
    if (variant !== "goal" || !settings || !target.ok) return null;
    return requiredContribution(moneyToDecimalString(target.money), settings).toDecimalPlaces(
      2,
      Dec.ROUND_UP,
    );
  }, [variant, settings, target]);

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Universal",
            periodLabel: "Deterministic arithmetic",
            calculationClass: entry.calculationClass,
            ruleStatus: { label: "No statutory rules required", tone: "neutral" },
          }}
        />
      }
      inputs={
        <div className="grid gap-6">
          {variant === "goal" ? (
            <MoneyField
              id="save-target"
              label="Savings target"
              value={targetRaw}
              onChange={setTargetRaw}
              error={!target.ok && target.error ? target.error : undefined}
            />
          ) : null}
          <MoneyField
            id="save-opening"
            label="Starting balance"
            value={openingRaw}
            onChange={setOpeningRaw}
            error={!opening.ok && opening.error ? opening.error : undefined}
          />
          {variant === "compound" ? (
            <MoneyField
              id="save-contribution"
              label="Regular deposit (per compounding period)"
              value={contributionRaw}
              onChange={setContributionRaw}
              error={!contribution.ok && contribution.error ? contribution.error : undefined}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="save-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Interest rate % p.a.
              </label>
              <input
                id="save-rate"
                inputMode="decimal"
                placeholder="4.50"
                value={ratePctRaw}
                onChange={(e) => setRatePctRaw(e.target.value)}
                className="clay-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="save-years" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Years
              </label>
              <input
                id="save-years"
                inputMode="numeric"
                value={yearsRaw}
                onChange={(e) => setYearsRaw(e.target.value)}
                className="clay-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
              />
            </div>
          </div>
          <SelectField
            id="save-compounding"
            label="Compounding"
            value={compounding}
            onChange={setCompounding}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "quarterly", label: "Quarterly" },
              { value: "annually", label: "Annually" },
            ]}
          />
          <SelectField
            id="save-timing"
            label="Deposits are made"
            value={timing}
            onChange={setTiming}
            options={[
              { value: "end", label: "At the end of each period" },
              { value: "beginning", label: "At the start of each period" },
            ]}
          />
        </div>
      }
      results={
        !result ? (
          <EmptyState>
            {variant === "goal"
              ? "Enter a target, rate and timeframe to find the deposit needed."
              : "Enter a rate and timeframe to see the balance grow with compound interest."}
          </EmptyState>
        ) : (
          <div className="clay-result grid gap-6 p-6">
            {variant === "goal" && perPeriodNeeded ? (
              <PrimaryResult
                label={`Deposit needed per ${compounding === "monthly" ? "month" : compounding === "quarterly" ? "quarter" : "year"}`}
                amount={moneyFromDecimalString("AUD", perPeriodNeeded.toFixed(2), 2)}
                qualifier={`Re-running the forward calculation with this deposit reaches ${formatMajor(result.futureValue.toFixed(2))} after ${yearsRaw} years.`}
              />
            ) : (
              <PrimaryResult
                label={`Balance after ${yearsRaw} years`}
                amount={moneyFromDecimalString("AUD", result.futureValue.toFixed(2), 2)}
                qualifier={`Simulated period by period; the §13.11 closed form gives ${formatMajor(result.closedFormValue.toFixed(2))} and the simulation reconciles within rounding.`}
              />
            )}
            <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
              <ResultMetric label="Total deposits" amount={moneyFromDecimalString("AUD", result.totalContributions.toFixed(2), 2)} />
              <ResultMetric label="Total interest earned" amount={moneyFromDecimalString("AUD", result.totalInterest.toFixed(2), 2)} />
            </div>
            <div className="overflow-x-auto border-t border-hairline pt-4">
              <table className="clay-table w-full min-w-[420px] border-collapse text-left">
                <caption className="sr-only">Year-by-year savings growth</caption>
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    <th scope="col" className="py-2 pe-4 font-normal">Year</th>
                    <th scope="col" className="py-2 pe-4 text-right font-normal">Deposits</th>
                    <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
                    <th scope="col" className="py-2 text-right font-normal">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((row) => (
                    <tr key={row.year} className="border-b border-hairline">
                      <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink">{row.year}</td>
                      <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(moneyFromDecimalString("AUD", row.contributions.toFixed(2), 2))}
                      </td>
                      <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(moneyFromDecimalString("AUD", row.interest.toFixed(2), 2))}
                      </td>
                      <td className="py-1.5 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(moneyFromDecimalString("AUD", row.closingBalance.toFixed(2), 2))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      explanation={null}
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
