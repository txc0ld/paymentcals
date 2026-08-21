"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  ScenarioActions,
  SelectField,
  UniversalDisclosure,
  WorkingPanel,
  formatMoney,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import {
  requiredContribution,
  simulateSavings,
  type CompoundingFrequency,
  type SavingsResult,
} from "@paymentcalcs/engine-savings";
import { CpiRangeError, computeRealIncome, quarterAtOrBefore } from "@paymentcalcs/engine-compensation";
import { resolveRulePack } from "@paymentcalcs/rule-schema";
import { allAuRulePacks, auIntegrityManifest, type CpiRulePack, type CpiRules } from "@paymentcalcs/rules-au";
import { allowDraftRules } from "../../lib/draft-rules";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const PERIOD_NOUN: Record<CompoundingFrequency, string> = {
  monthly: "month",
  quarterly: "quarter",
  annually: "year",
};

const money = (value: DecimalValue) => value.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2);

/** Shift an ISO date by whole years, keeping the month and day. */
function shiftYears(isoDate: string, years: number): string {
  return `${Number(isoDate.slice(0, 4)) + years}${isoDate.slice(4)}`;
}

export function SavingsCalculator({ variant }: { variant: "compound" | "goal" }) {
  const entry = getRegistryEntry(variant === "goal" ? "GL-SAVE-003" : "GL-SAVE-002")!;
  const [openingRaw, setOpeningRaw] = useState("");
  const [contributionRaw, setContributionRaw] = useState("");
  const [targetRaw, setTargetRaw] = useState("");
  const [ratePctRaw, setRatePctRaw] = useState("");
  const [yearsRaw, setYearsRaw] = useState("10");
  const [compounding, setCompounding] = useState<CompoundingFrequency>("monthly");
  const [timing, setTiming] = useState<"end" | "beginning">("end");
  const [cpiRules, setCpiRules] = useState<CpiRules | null>(null);

  // The CPI pack backs the real-value column only; the nominal projection
  // never depends on it, so a missing pack degrades one panel, not the result.
  useEffect(() => {
    let cancelled = false;
    resolveRulePack(allAuRulePacks, auIntegrityManifest, {
      domain: "cpi",
      jurisdiction: "AU",
      valuationDate: new Date().toISOString().slice(0, 10),
      allowDraftRules,
    }).then((outcome) => {
      if (!cancelled && outcome.ok) setCpiRules((outcome.pack as CpiRulePack).rules);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const perPeriodNeeded = useMemo(() => {
    if (variant !== "goal" || !settings || !target.ok) return null;
    return requiredContribution(moneyToDecimalString(target.money), settings).toDecimalPlaces(
      2,
      Dec.ROUND_UP,
    );
  }, [variant, settings, target]);

  /** The contribution the headline run uses, whichever variant is on screen. */
  const activeContribution = useMemo(() => {
    if (variant === "goal") return perPeriodNeeded ? perPeriodNeeded.toFixed(2) : null;
    if (!contribution.ok && contributionRaw.trim() !== "") return null;
    return contribution.ok ? moneyToDecimalString(contribution.money) : "0";
  }, [variant, perPeriodNeeded, contribution, contributionRaw]);

  const result: SavingsResult | null = useMemo(() => {
    if (!settings || activeContribution === null) return null;
    return simulateSavings({ ...settings, contribution: activeContribution });
  }, [settings, activeContribution]);

  // Time to goal: the first simulated year boundary at which the balance
  // reaches the target. Read from the same simulation that produced the
  // headline, so the readout can never disagree with the table.
  const timeToGoal = useMemo(() => {
    if (variant !== "goal" || !result || !target.ok) return null;
    const targetDec = new Dec(moneyToDecimalString(target.money));
    return result.years.find((row) => row.closingBalance.greaterThanOrEqualTo(targetDec)) ?? null;
  }, [variant, result, target]);

  /**
   * Sensitivity: nine runs of the same engine — the rate one percentage point
   * either side, crossed with the deposit a quarter smaller and a quarter
   * larger. Every cell is a full simulation, never an interpolation.
   */
  const sensitivity = useMemo(() => {
    if (!settings || activeContribution === null) return null;
    const baseRate = new Dec(settings.annualRate);
    const rates = [baseRate.minus("0.01"), baseRate, baseRate.plus("0.01")]
      .map((rate) => (rate.lessThan(0) ? new Dec(0) : rate))
      .map((rate) => rate.toFixed(6))
      .filter((rate, index, all) => all.indexOf(rate) === index);
    const base = new Dec(activeContribution);
    const contributions = [base.times("0.75"), base, base.times("1.25")]
      .map((value) => value.toDecimalPlaces(2, Dec.ROUND_HALF_UP).toFixed(2))
      .filter((value, index, all) => all.indexOf(value) === index);
    return {
      baseRate: baseRate.toFixed(6),
      baseContribution: base.toFixed(2),
      rates,
      contributions,
      cells: rates.map((rate) =>
        contributions.map(
          (contributionValue) =>
            simulateSavings({ ...settings, annualRate: rate, contribution: contributionValue }).futureValue,
        ),
      ),
    };
  }, [settings, activeContribution]);

  /**
   * Real value: the projected balance deflated by the CPI actually published
   * over an equally long window ending at the latest published quarter. It is
   * a historical yardstick, never a forecast — and if the window would reach
   * before the series begins, no number is shown at all.
   */
  const realValue = useMemo(() => {
    if (!cpiRules || !settings || !result) return null;
    if (result.futureValue.lessThanOrEqualTo(0)) return null;
    const quarters = cpiRules.quarters;
    const firstDate = quarters[0]!.date;
    const lastDate = quarters[quarters.length - 1]!.date;
    const fromDate = shiftYears(lastDate, -settings.years);
    if (fromDate < firstDate) {
      return {
        ok: false as const,
        reason: `A ${settings.years}-year comparison would start at ${fromDate}, before the published CPI series begins at ${firstDate}. No real-value figure is shown rather than an extrapolated one.`,
      };
    }
    try {
      const window = computeRealIncome(cpiRules, money(result.futureValue), fromDate, lastDate);
      const fromIndex = new Dec(window.fromQuarter.index);
      const perYear = result.years.map((row) => {
        const at = shiftYears(fromDate, row.year);
        const quarter = quarterAtOrBefore(cpiRules, at > lastDate ? lastDate : at);
        const factor = new Dec(quarter.index).div(fromIndex);
        return { year: row.year, real: money(row.closingBalance.div(factor) as DecimalValue) };
      });
      return { ok: true as const, window, fromDate, lastDate, perYear };
    } catch (error) {
      if (error instanceof CpiRangeError) return { ok: false as const, reason: error.message };
      throw error;
    }
  }, [cpiRules, settings, result]);

  const realRows = realValue?.ok ? realValue.perYear : null;
  const periodNoun = PERIOD_NOUN[compounding];

  function onReset() {
    setOpeningRaw("");
    setContributionRaw("");
    setTargetRaw("");
    setRatePctRaw("");
    setYearsRaw("10");
    setCompounding("monthly");
    setTiming("end");
  }

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
          methodologyHref={`/methodology/${entry.slug}`}
          actions={<ScenarioActions onReset={onReset} />}
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
          {/* Container query: the inputs column is 360–440px, too narrow for
            * two number inputs abreast however wide the viewport is. */}
          <div className="grid items-start gap-4 @md:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <label htmlFor="save-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Interest rate % p.a.
              </label>
              <input
                id="save-rate"
                inputMode="decimal"
                placeholder="4.50"
                value={ratePctRaw}
                onChange={(e) => setRatePctRaw(e.target.value)}
                className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <label htmlFor="save-years" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Years
              </label>
              <input
                id="save-years"
                inputMode="numeric"
                value={yearsRaw}
                onChange={(e) => setYearsRaw(e.target.value)}
                className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
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
          <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
            {variant === "goal" && perPeriodNeeded ? (
              <PrimaryResult
                label={`Deposit needed per ${periodNoun}`}
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
            <div
              className={`grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 ${
                timeToGoal || realValue?.ok ? "@xl:grid-cols-3" : ""
              }`}
            >
              <ResultMetric label="Total deposits" amount={moneyFromDecimalString("AUD", result.totalContributions.toFixed(2), 2)} />
              <ResultMetric label="Total interest earned" amount={moneyFromDecimalString("AUD", result.totalInterest.toFixed(2), 2)} />
              {timeToGoal ? (
                <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Time to goal</span>
                  <span className="font-mono text-xl tabular-nums text-ink">
                    {timeToGoal.year} {timeToGoal.year === 1 ? "year" : "years"}
                  </span>
                  <span className="text-[12px] leading-4 text-ink-3">
                    first year boundary at or above the target ({formatMoney(moneyFromDecimalString("AUD", timeToGoal.closingBalance.toFixed(2), 2))})
                  </span>
                </div>
              ) : null}
              {realValue?.ok ? (
                <ResultMetric
                  label="Same balance in start-of-window dollars"
                  amount={moneyFromDecimalString("AUD", realValue.window.effectiveValue, 2)}
                  detail={`deflated by the ${new Dec(realValue.window.cumulativeInflation).times(100).toFixed(2)}% CPI change published from ${realValue.window.fromQuarter.date} to ${realValue.window.toQuarter.date}`}
                />
              ) : null}
            </div>
            <div className="overflow-x-auto border-t border-hairline pt-6">
              <table className="nexus-table w-full min-w-[420px] border-collapse text-left">
                <caption className="sr-only">Year-by-year savings growth</caption>
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                    <th scope="col" className="py-2 pe-4 font-normal">Year</th>
                    <th scope="col" className="py-2 pe-4 text-right font-normal">Deposits</th>
                    <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
                    <th scope="col" className={`py-2 text-right font-normal ${realRows ? "pe-4" : ""}`}>Balance</th>
                    {realRows ? (
                      <th scope="col" className="py-2 text-right font-normal">Real value</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((row, index) => (
                    <tr key={row.year} className="border-b border-hairline">
                      <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink">{row.year}</td>
                      <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(moneyFromDecimalString("AUD", row.contributions.toFixed(2), 2))}
                      </td>
                      <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                        {formatMoney(moneyFromDecimalString("AUD", row.interest.toFixed(2), 2))}
                      </td>
                      <td className={`py-1.5 text-right font-mono text-[13px] tabular-nums text-ink ${realRows ? "pe-4" : ""}`}>
                        {formatMoney(moneyFromDecimalString("AUD", row.closingBalance.toFixed(2), 2))}
                      </td>
                      {realRows ? (
                        <td className="py-1.5 text-right font-mono text-[13px] tabular-nums text-ink-2">
                          {formatMoney(moneyFromDecimalString("AUD", realRows[index]!.real, 2))}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {realValue && !realValue.ok ? (
              <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">{realValue.reason}</p>
            ) : null}
          </div>
        )
      }
      explanation={
        <div className="grid min-w-0 gap-8">
          {sensitivity && sensitivity.rates.length > 1 && sensitivity.contributions.length > 1 ? (
            <section aria-label="Sensitivity to rate and deposit" className="nexus-panel grid min-w-0 gap-4 p-6 md:p-8">
              <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                If the rate or the deposit were different
              </h2>
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <caption className="sr-only">
                    Closing balance for each combination of interest rate one percentage point either side of
                    yours and deposit a quarter smaller and a quarter larger than yours
                  </caption>
                  <thead>
                    <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      <th scope="col" className="py-2 pe-4 font-normal">Rate</th>
                      {sensitivity.contributions.map((value) => (
                        <th key={value} scope="col" className="py-2 pe-4 text-right font-normal last:pe-0">
                          {formatMajor(value)} per {periodNoun}
                          {value === sensitivity.baseContribution ? (
                            <span className="ms-2 text-[var(--pc-accent-text)]">· Yours</span>
                          ) : null}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.rates.map((rate, rowIndex) => (
                      <tr key={rate} className="border-b border-hairline last:border-b-0">
                        <th scope="row" className="py-2 pe-4 text-left font-mono text-[13px] font-normal tabular-nums text-ink-2">
                          {new Dec(rate).times(100).toFixed(2)}%
                          {rate === sensitivity.baseRate ? (
                            <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pc-accent-text)]">
                              · Yours
                            </span>
                          ) : null}
                        </th>
                        {sensitivity.cells[rowIndex]!.map((value, cellIndex) => (
                          <td
                            key={sensitivity.contributions[cellIndex]}
                            className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink last:pe-0"
                          >
                            {formatMoney(moneyFromDecimalString("AUD", value.toFixed(2), 2))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[12px] leading-5 text-ink-3">
                Each cell is a full re-run of the same engine on the same starting balance, compounding and
                timing — nine simulations in total, with only the rate and the deposit changed. Rates are not
                offers and a deposit you have not committed to is not a plan.
              </p>
            </section>
          ) : null}
          <WorkingPanel
            summary={
              result
                ? `Interest is credited every ${periodNoun} at the annual rate divided by the number of periods in a year, and the deposit is added at the ${timing === "end" ? "end" : "start"} of each period. The table is the simulation itself, so the rows always add to the headline.`
                : "Enter a rate and timeframe to see the working behind the projection."
            }
            steps={[
              "i = annual rate ÷ periods per year (12 monthly, 4 quarterly, 1 annually)",
              timing === "beginning"
                ? "each period: balance = balance + deposit, then interest = balance × i"
                : "each period: interest = balance × i, then balance = balance + deposit",
              "interest is rounded half-up to the cent as it is credited",
              "closed form: FV = P × (1 + i)ⁿ + C × ((1 + i)ⁿ − 1) ÷ i, with an extra (1 + i) factor for start-of-period deposits",
              "the simulation and the closed form are compared every time; a mismatch beyond per-period rounding is a failure, not a warning",
              ...(realValue?.ok
                ? [
                    `real value = balance ÷ (CPI at the matching quarter ÷ CPI at ${realValue.window.fromQuarter.date})`,
                  ]
                : []),
            ]}
            assumptions={[
              "The rate is constant for the whole projection and interest is credited on the stated cycle.",
              "Deposits are made in full every period, and nothing is withdrawn.",
              "Tax on interest, account fees and inflation are excluded from the nominal figures.",
              ...(realValue?.ok
                ? [
                    `The real-value column uses the ABS All groups CPI actually published between ${realValue.window.fromQuarter.date} and ${realValue.window.toQuarter.date} — a window the same length as your projection. It is a historical yardstick, not a forecast of future inflation.`,
                  ]
                : []),
            ]}
            sources={
              realValue?.ok
                ? [
                    {
                      title: "Reserve Bank of Australia — Consumer Price Inflation (table G1)",
                      url: "https://www.rba.gov.au/statistics/tables/",
                      detail: `ABS All groups CPI, ${cpiRules?.quarters[0]?.date} to ${cpiRules?.quarters[cpiRules.quarters.length - 1]?.date}`,
                    },
                  ]
                : []
            }
            limitations={[
              "A projection over many years is an arithmetic illustration, not a prediction: real returns vary and can be negative.",
              "Variable-rate accounts, introductory bonus rates and conditions attached to bonus interest are not modelled.",
              "No product, provider or rate is being offered or compared here.",
              "Result accuracy class A: deterministic arithmetic on the figures you enter.",
            ]}
          />
        </div>
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
