"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  ScenarioActions,
  UniversalDisclosure,
  WorkingPanel,
  formatMoney,
  formatRatePercent,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { amortisingPayment } from "@paymentcalcs/engine-loans";
import { requiredContribution, simulateSavings } from "@paymentcalcs/engine-savings";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";
import { AdvancedGroup, NumberField } from "./advanced-group";

const d = (s: string | number) => new Dec(s) as DecimalValue;

/** Common lender LVR bands, fixed order, shown as context rather than options. */
const LVR_LADDER = ["95", "90", "85", "80", "70"] as const;
/** Horizons for the required-saving ladder. */
const SAVING_HORIZONS = [1, 2, 3, 5] as const;
/** Simulation horizon for time-to-deposit; beyond this no figure is shown. */
const MAX_SAVING_YEARS = 40;

/** AU-HOME-019 — deposit needed for a target LVR plus entered upfront costs. */
export function DepositCalculator() {
  const entry = getRegistryEntry("AU-HOME-019")!;
  const [priceRaw, setPriceRaw] = useState("");
  const [lvrPctRaw, setLvrPctRaw] = useState("80");
  const [costsRaw, setCostsRaw] = useState("");
  const [savedRaw, setSavedRaw] = useState("");
  const [monthlySavingRaw, setMonthlySavingRaw] = useState("");
  const [savingsRatePctRaw, setSavingsRatePctRaw] = useState("0");

  const price = useMemo(() => parseMoneyInput(priceRaw), [priceRaw]);
  const costs = useMemo(() => parseMoneyInput(costsRaw), [costsRaw]);
  const saved = useMemo(() => parseMoneyInput(savedRaw), [savedRaw]);
  const monthlySaving = useMemo(() => parseMoneyInput(monthlySavingRaw), [monthlySavingRaw]);
  const lvrValid = /^\d+(\.\d+)?$/.test(lvrPctRaw.trim()) && Number.parseFloat(lvrPctRaw) > 0 && Number.parseFloat(lvrPctRaw) <= 100;
  const savingsRateValid =
    /^\d+(\.\d+)?$/.test(savingsRatePctRaw.trim()) && Number.parseFloat(savingsRatePctRaw) <= 25;

  const result = useMemo(() => {
    if (!price.ok || !lvrValid) return null;
    const priceDec = d(moneyToDecimalString(price.money));
    const lvr = d(lvrPctRaw).div(100) as DecimalValue;
    const loan = priceDec.times(lvr) as DecimalValue;
    const deposit = priceDec.minus(loan) as DecimalValue;
    const upfront = costs.ok ? d(moneyToDecimalString(costs.money)) : d(0);
    return {
      priceDec,
      upfront,
      deposit: deposit.toFixed(2),
      loan: loan.toFixed(2),
      totalCashNeeded: deposit.plus(upfront).toFixed(2),
    };
  }, [price, lvrValid, lvrPctRaw, costs]);

  /** Every band on the same price and the same entered upfront costs. */
  const ladder = useMemo(() => {
    if (!result) return null;
    return LVR_LADDER.map((band) => {
      const lvr = d(band).div(100) as DecimalValue;
      const loan = result.priceDec.times(lvr) as DecimalValue;
      const deposit = result.priceDec.minus(loan) as DecimalValue;
      return {
        band,
        loan: loan.toFixed(2),
        deposit: deposit.toFixed(2),
        cash: deposit.plus(result.upfront).toFixed(2),
        selected: d(band).equals(d(lvrPctRaw.trim() || "0")),
      };
    });
  }, [result, lvrPctRaw]);

  /**
   * Time to the deposit, from the savings engine: the shortfall is closed by a
   * monthly deposit at the rate entered, and the first year boundary at or
   * above the cash needed is reported. Beyond the modelled horizon no figure is
   * shown rather than an extrapolated one.
   */
  const timeToDeposit = useMemo(() => {
    if (!result || !savingsRateValid) return null;
    if (!monthlySaving.ok || monthlySavingRaw.trim() === "") return null;
    const target = d(result.totalCashNeeded);
    const opening = saved.ok ? d(moneyToDecimalString(saved.money)) : d(0);
    const shortfall = target.minus(opening) as DecimalValue;
    if (shortfall.lessThanOrEqualTo(0)) {
      return { covered: true as const, shortfall, opening, target };
    }
    const contribution = d(moneyToDecimalString(monthlySaving.money));
    if (contribution.lessThanOrEqualTo(0)) return null;
    const settings = {
      openingBalance: opening.toFixed(2),
      annualRate: (Number.parseFloat(savingsRatePctRaw) / 100).toString(),
      years: MAX_SAVING_YEARS,
      compounding: "monthly" as const,
      timing: "end" as const,
    };
    const simulation = simulateSavings({ ...settings, contribution: contribution.toFixed(2) });
    const index = simulation.years.findIndex((row) => row.closingBalance.greaterThanOrEqualTo(target));
    const reached = index === -1 ? null : simulation.years[index]!;
    const previous = index > 0 ? simulation.years[index - 1]! : null;
    const horizons = SAVING_HORIZONS.map((years) => ({
      years,
      perMonth: requiredContribution(target.toFixed(2), { ...settings, years })
        .toDecimalPlaces(2, Dec.ROUND_UP)
        .toFixed(2),
    }));
    return { covered: false as const, shortfall, opening, target, reached, previous, horizons, contribution };
  }, [result, savingsRateValid, savingsRatePctRaw, monthlySaving, monthlySavingRaw, saved]);

  function onReset() {
    setPriceRaw("");
    setLvrPctRaw("80");
    setCostsRaw("");
    setSavedRaw("");
    setMonthlySavingRaw("");
    setSavingsRatePctRaw("0");
  }

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
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
          <MoneyField id="dep-price" label="Property price" value={priceRaw} onChange={setPriceRaw} error={!price.ok && price.error ? price.error : undefined} />
          <div className="grid gap-1.5">
            <label htmlFor="dep-lvr" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
              Target LVR %
            </label>
            <input
              id="dep-lvr"
              inputMode="decimal"
              value={lvrPctRaw}
              onChange={(e) => setLvrPctRaw(e.target.value)}
              className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
            />
          </div>
          <MoneyField
            id="dep-costs"
            label="Upfront costs you expect"
            description="Stamp duty, legal, inspections and other costs you enter yourself. The stamp duty calculator can estimate the duty component."
            value={costsRaw}
            onChange={setCostsRaw}
            error={!costs.ok && costs.error ? costs.error : undefined}
          />
          <AdvancedGroup
            legend="How long it takes to save"
            hint="Blank leaves the deposit figure exactly as it is above; fill these in to see the time to reach it."
          >
            <MoneyField
              id="dep-saved"
              label="Saved towards it so far"
              value={savedRaw}
              onChange={setSavedRaw}
              error={!saved.ok && saved.error ? saved.error : undefined}
            />
            <MoneyField
              id="dep-monthly"
              label="Amount you save each month"
              value={monthlySavingRaw}
              onChange={setMonthlySavingRaw}
              error={!monthlySaving.ok && monthlySaving.error ? monthlySaving.error : undefined}
            />
            <NumberField
              id="dep-savings-rate"
              label="Interest on your savings % p.a."
              value={savingsRatePctRaw}
              onChange={setSavingsRatePctRaw}
              unit="%"
              description="Zero treats the balance as cash set aside."
              error={savingsRateValid ? undefined : "Enter a rate between 0 and 25."}
            />
          </AdvancedGroup>
        </div>
      }
      results={
        !result ? (
          <EmptyState>Enter the property price and target LVR to see the deposit needed.</EmptyState>
        ) : (
          <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
            <PrimaryResult
              label={`Deposit at ${lvrPctRaw}% LVR`}
              amount={moneyFromDecimalString("AUD", result.deposit, 2)}
              qualifier={`With your entered upfront costs the cash needed is ${formatMajor(result.totalCashNeeded)}. The loan at this LVR is ${formatMajor(result.loan)}.`}
            />
            <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2">
              <ResultMetric label="Loan amount" amount={moneyFromDecimalString("AUD", result.loan, 2)} />
              <ResultMetric label="Total cash needed" amount={moneyFromDecimalString("AUD", result.totalCashNeeded, 2)} detail="deposit + entered costs" />
            </div>
            {timeToDeposit ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  Time to reach it
                </h3>
                {timeToDeposit.covered ? (
                  <p className="text-[14px] leading-6 text-ink-2">
                    What you have saved already covers the {formatMajor(result.totalCashNeeded)} of cash needed
                    at this LVR, so no further saving is modelled.
                  </p>
                ) : (
                  <>
                    <div className="grid items-start gap-4 @sm:grid-cols-2">
                      <ResultMetric
                        label="Still to save"
                        amount={moneyFromDecimalString("AUD", timeToDeposit.shortfall.toFixed(2), 2)}
                        detail={`${formatMajor(timeToDeposit.target.toFixed(2))} needed, ${formatMajor(timeToDeposit.opening.toFixed(2))} saved`}
                      />
                      <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Reached</span>
                        <span className="font-mono text-xl tabular-nums text-ink">
                          {timeToDeposit.reached
                            ? `Year ${timeToDeposit.reached.year}`
                            : `Beyond ${MAX_SAVING_YEARS} years`}
                        </span>
                        <span className="text-[12px] leading-4 text-ink-3">
                          {timeToDeposit.reached
                            ? `first year boundary at or above the cash needed (${formatMoney(moneyFromDecimalString("AUD", timeToDeposit.reached.closingBalance.toFixed(2), 2))})${
                                timeToDeposit.previous
                                  ? `; a year earlier the balance was ${formatMajor(timeToDeposit.previous.closingBalance.toFixed(2))}`
                                  : ""
                              }`
                            : `saving ${formatMajor(timeToDeposit.contribution.toFixed(2))} a month does not reach it inside the ${MAX_SAVING_YEARS}-year horizon this tool models, so no date is shown`}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="nexus-table w-full min-w-[320px] border-collapse text-left">
                        <caption className="sr-only">
                          Monthly deposit that reaches the cash needed within each timeframe
                        </caption>
                        <thead>
                          <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                            <th scope="col" className="py-2 pe-4 font-normal">To get there in</th>
                            <th scope="col" className="py-2 text-right font-normal">Save per month</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timeToDeposit.horizons.map((row) => (
                            <tr key={row.years} className="border-b border-hairline last:border-b-0">
                              <td className="py-2 pe-4 text-[13px] leading-5 text-ink-2">
                                {row.years} {row.years === 1 ? "year" : "years"}
                              </td>
                              <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                                {formatMoney(moneyFromDecimalString("AUD", row.perMonth, 2))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            ) : null}
            {ladder ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  The same price at other LVR bands
                </h3>
                <div className="overflow-x-auto">
                  <table className="nexus-table w-full min-w-[420px] border-collapse text-left">
                    <caption className="sr-only">
                      Loan, deposit and total cash needed at each common LVR band on the same property price
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">LVR</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">Loan</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">Deposit</th>
                        <th scope="col" className="py-2 text-right font-normal">Cash needed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ladder.map((row) => (
                        <tr
                          key={row.band}
                          aria-current={row.selected ? "true" : undefined}
                          className={row.selected ? "border-b-2 border-[var(--pc-accent)]" : "border-b border-hairline"}
                        >
                          <th scope="row" className="py-2 pe-4 text-left font-mono text-[13px] font-normal tabular-nums text-ink">
                            {row.band}%
                            {row.selected ? (
                              <span className="ms-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--pc-accent-text)]">
                                · Yours
                              </span>
                            ) : null}
                          </th>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                            {formatMajor(row.loan)}
                          </td>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                            {formatMajor(row.deposit)}
                          </td>
                          <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                            {formatMajor(row.cash)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  Lenders commonly treat 80% as the threshold above which lenders mortgage insurance can
                  apply; the premium is not modelled here and individual policies differ. Every row uses the
                  same price and the same upfront costs you entered.
                </p>
              </div>
            ) : null}
          </div>
        )
      }
      explanation={
        <WorkingPanel
          summary={
            result
              ? `At ${lvrPctRaw}% LVR the lender advances that share of the price and you contribute the rest, plus whatever upfront costs you entered.`
              : "Enter the property price and target LVR to see the deposit and the working behind it."
          }
          steps={[
            "loan = property price × target LVR",
            "deposit = property price − loan",
            "cash needed = deposit + the upfront costs you entered",
            "time to reach it: the savings engine runs monthly deposits on what you have saved, and the first year boundary at or above the cash needed is reported",
            "save per month: the closed-form deposit that reaches the cash needed over each timeframe, rounded up to the next cent",
          ]}
          assumptions={[
            "LVR is measured against the price you enter. Lenders assess against their own valuation, which can be lower.",
            "Upfront costs are your figures; nothing is estimated for you on this route.",
            "The savings projection assumes deposits are made in full every month, at the end of the month, at a constant rate, with no withdrawals.",
          ]}
          limitations={[
            "Lenders mortgage insurance, guarantor arrangements, first-home schemes and lender-specific LVR caps are not modelled.",
            "Property prices move, so the cash needed on the day is not the cash needed today.",
            "Result accuracy class A: deterministic arithmetic on the figures you enter.",
          ]}
        />
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}

/** AU-HOME-020 — LVR from value and loan, with the common bands as context. */
export function LvrCalculator() {
  const entry = getRegistryEntry("AU-HOME-020")!;
  const [valueRaw, setValueRaw] = useState("");
  const [loanRaw, setLoanRaw] = useState("");
  const value = useMemo(() => parseMoneyInput(valueRaw), [valueRaw]);
  const loan = useMemo(() => parseMoneyInput(loanRaw), [loanRaw]);

  const lvr = useMemo(() => {
    if (!value.ok || !loan.ok) return null;
    const valueDec = d(moneyToDecimalString(value.money));
    if (valueDec.isZero()) return null;
    return d(moneyToDecimalString(loan.money)).div(valueDec) as DecimalValue;
  }, [value, loan]);

  function onReset() {
    setValueRaw("");
    setLoanRaw("");
  }

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
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
          <MoneyField id="lvr-value" label="Property value" value={valueRaw} onChange={setValueRaw} error={!value.ok && value.error ? value.error : undefined} />
          <MoneyField id="lvr-loan" label="Loan amount" value={loanRaw} onChange={setLoanRaw} error={!loan.ok && loan.error ? loan.error : undefined} />
        </div>
      }
      results={
        lvr === null ? (
          <EmptyState>Enter the property value and loan amount to calculate the LVR.</EmptyState>
        ) : (
          <div className="nexus-result grid min-w-0 gap-6 p-6 md:p-8">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                Loan-to-value ratio
              </span>
              <span
                role="status"
                aria-live="polite"
                className="font-mono text-[length:var(--pc-text-result-xl)] font-medium leading-none tracking-tight tabular-nums text-ink"
              >
                {lvr.times(100).toFixed(1)}%
              </span>
              <p className="text-[13px] leading-5 text-ink-2">
                {formatRatePercent(lvr.toFixed(4))} of the property value is borrowed. Lenders
                commonly treat 80% as the threshold above which lenders mortgage insurance can
                apply; individual policies differ.
              </p>
            </div>
          </div>
        )
      }
      explanation={
        <WorkingPanel
          summary={
            lvr
              ? `The loan is ${lvr.times(100).toFixed(1)}% of the value you entered. LVR is a ratio of two figures you supply, with nothing inferred.`
              : "Enter the property value and the loan amount to see the ratio and the working behind it."
          }
          steps={["LVR = loan amount ÷ property value", "the result is shown to one decimal place"]}
          assumptions={[
            "The property value is the figure you enter. Lenders use their own valuation, which can differ from a purchase price or an online estimate.",
            "The loan amount is the amount advanced, before any capitalised insurance premium or fee.",
          ]}
          limitations={[
            "Lenders mortgage insurance thresholds, premiums and capitalisation rules vary by lender and are not modelled.",
            "Cross-collateralised and multi-property structures compute LVR differently and are out of scope.",
            "Result accuracy class A: deterministic arithmetic on the figures you enter.",
          ]}
        />
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}

/** AU-HOME-022 — Class C indicative borrowing range (§17.5 discipline). */
export function AffordabilityEstimate() {
  const entry = getRegistryEntry("AU-HOME-022")!;
  const [netMonthlyRaw, setNetMonthlyRaw] = useState("");
  const [expensesRaw, setExpensesRaw] = useState("");
  const [debtsRaw, setDebtsRaw] = useState("");
  const [ratePctRaw, setRatePctRaw] = useState("5.99");
  const [bufferPctRaw, setBufferPctRaw] = useState("3");

  const netMonthly = useMemo(() => parseMoneyInput(netMonthlyRaw), [netMonthlyRaw]);
  const expenses = useMemo(() => parseMoneyInput(expensesRaw), [expensesRaw]);
  const debts = useMemo(() => parseMoneyInput(debtsRaw), [debtsRaw]);
  const rateValid = /^\d+(\.\d+)?$/.test(ratePctRaw.trim());
  const bufferValid = /^\d+(\.\d+)?$/.test(bufferPctRaw.trim());

  // Editable expense floor: a generic default, clearly labelled, never a HEM claim.
  const EXPENSE_FLOOR_MONTHLY = "2500";

  const range = useMemo(() => {
    if (!netMonthly.ok || !rateValid || !bufferValid) return null;
    const income = d(moneyToDecimalString(netMonthly.money));
    const enteredExpenses = expenses.ok ? d(moneyToDecimalString(expenses.money)) : d(0);
    const flooredExpenses = (Dec.max(enteredExpenses, d(EXPENSE_FLOOR_MONTHLY)) as DecimalValue);
    const debtRepayments = debts.ok ? d(moneyToDecimalString(debts.money)) : d(0);
    const surplus = income.minus(flooredExpenses).minus(debtRepayments) as DecimalValue;
    if (surplus.lessThanOrEqualTo(0)) return { surplus, low: d(0), high: d(0), flooredExpenses };
    const assessedRate = d(ratePctRaw).div(100).plus(d(bufferPctRaw).div(100)) as DecimalValue;
    const monthlyRateHigh = assessedRate.div(12) as DecimalValue;
    const monthlyRateLow = assessedRate.plus("0.005").div(12) as DecimalValue;
    const n = 30 * 12;
    // Capacity: surplus equals the §13.5 payment on the borrowed amount.
    const capacity = (monthlyRate: DecimalValue) => {
      const paymentPerDollar = amortisingPayment(d(1), monthlyRate, n);
      return surplus.div(paymentPerDollar) as DecimalValue;
    };
    return { surplus, low: capacity(monthlyRateLow), high: capacity(monthlyRateHigh), flooredExpenses };
  }, [netMonthly, expenses, debts, rateValid, ratePctRaw, bufferValid, bufferPctRaw]);

  function onReset() {
    setNetMonthlyRaw("");
    setExpensesRaw("");
    setDebtsRaw("");
    setRatePctRaw("5.99");
    setBufferPctRaw("3");
  }

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
            periodLabel: "Indicative range",
            calculationClass: "C",
            ruleStatus: { label: "Generic assumptions", tone: "neutral" },
          }}
          methodologyHref={`/methodology/${entry.slug}`}
          actions={<ScenarioActions onReset={onReset} />}
        />
      }
      inputs={
        <div className="grid gap-6">
          <MoneyField id="aff-income" label="Net household income per month" value={netMonthlyRaw} onChange={setNetMonthlyRaw} error={!netMonthly.ok && netMonthly.error ? netMonthly.error : undefined} />
          <MoneyField
            id="aff-expenses"
            label="Living expenses per month"
            description={`An editable floor of ${formatMajor(EXPENSE_FLOOR_MONTHLY)} applies as a generic default, not a benchmark of your spending.`}
            value={expensesRaw}
            onChange={setExpensesRaw}
            error={!expenses.ok && expenses.error ? expenses.error : undefined}
          />
          <MoneyField id="aff-debts" label="Existing debt repayments per month" value={debtsRaw} onChange={setDebtsRaw} error={!debts.ok && debts.error ? debts.error : undefined} />
          {/* Container query: "Assessment buffer % (editable)" alone needs more
            * than half of the 360–440px inputs column. */}
          <div className="grid items-start gap-4 @md:grid-cols-2">
            <div className="grid min-w-0 gap-1.5">
              <label htmlFor="aff-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Interest rate % p.a.
              </label>
              <input id="aff-rate" inputMode="decimal" value={ratePctRaw} onChange={(e) => setRatePctRaw(e.target.value)} className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus" />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <label htmlFor="aff-buffer" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
                Assessment buffer % (editable)
              </label>
              <input id="aff-buffer" inputMode="decimal" value={bufferPctRaw} onChange={(e) => setBufferPctRaw(e.target.value)} className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus" />
            </div>
          </div>
        </div>
      }
      results={
        !range ? (
          <EmptyState>Enter your income to see an indicative borrowing range under generic assumptions.</EmptyState>
        ) : range.high.isZero() ? (
          <div className="nexus-panel-soft grid min-w-0 gap-4 p-6 md:p-8">
            <h2 className="text-lg font-semibold tracking-tight text-ink">No surplus under these assumptions</h2>
            <p className="text-[14px] leading-6 text-ink-2">
              After the expense floor and debt repayments there is no monthly surplus to service a
              loan in this model.
            </p>
          </div>
        ) : (
          <div className="nexus-result grid min-w-0 gap-6 p-6 md:p-8">
            <PrimaryResult
              label="Indicative borrowing range"
              amount={moneyFromDecimalString("AUD", range.high.toFixed(2), 2)}
              qualifier={`An indicative range of ${formatMajor(range.low.toFixed(2))} to ${formatMajor(range.high.toFixed(2))} over 30 years, assessed at your rate plus the ${bufferPctRaw}% buffer, from a monthly surplus of ${formatMajor(range.surplus.toFixed(2))}.`}
            />
            <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
              This is a range under generic assumptions, not a borrowing capacity assessment or
              pre-approval. Lender assessment policies differ materially.
            </p>
          </div>
        )
      }
      explanation={
        <WorkingPanel
          summary={
            range
              ? `The monthly surplus left after the expense floor and your entered debt repayments is treated as the whole repayment on a 30-year loan, priced at your rate plus the buffer. The range comes from pricing that same surplus at two rates half a percentage point apart.`
              : "Enter your net monthly income to see an indicative range and the working behind it."
          }
          steps={[
            `expenses used = max(what you entered, the ${formatMajor(EXPENSE_FLOOR_MONTHLY)} generic floor)`,
            "surplus = net monthly income − expenses used − existing debt repayments",
            "assessed rate = your rate + the assessment buffer",
            "capacity = surplus ÷ the §13.5 monthly payment on $1 over 30 years at the assessed rate",
            "the upper end prices the surplus at the assessed rate; the lower end adds a further 0.5 percentage points",
          ]}
          assumptions={[
            "A 30-year principal-and-interest term at a constant assessed rate.",
            "The entire surplus goes to the repayment, leaving nothing for rates, insurance, strata or maintenance.",
            "The expense floor is a generic editable default, not a household expenditure benchmark and not a measure of your spending.",
            "Income is the net figure you enter; no tax, salary packaging or income-type weighting is applied here.",
          ]}
          limitations={[
            "This is Class C: an indicative range under generic assumptions, not a borrowing capacity assessment, a credit decision or a pre-approval.",
            "Lenders apply their own buffers, expense benchmarks, income shading, credit policy and serviceability tests; results will differ materially.",
            "Lenders mortgage insurance, deposit size and existing credit limits are not modelled.",
          ]}
        />
      }
      disclosure={
        <div className="grid gap-3">
          <aside
            aria-label="Affordability limitations"
            data-disclosure-version="affordability-addendum-v2.0"
            className="border-t border-hairline pt-4 text-[12px] leading-5 text-ink-3"
          >
            <p>
              Lender assessment policies differ materially; the figure shown is an indicative range
              under generic assumptions, not pre-approval, and living-expense floors are
              approximations.
            </p>
          </aside>
          <UniversalDisclosure financialYear="current" />
        </div>
      }
    />
  );
}
