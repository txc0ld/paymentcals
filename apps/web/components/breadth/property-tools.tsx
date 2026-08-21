"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  UniversalDisclosure,
  formatRatePercent,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { amortisingPayment } from "@paymentcalcs/engine-loans";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const d = (s: string | number) => new Dec(s) as DecimalValue;

/** AU-HOME-019 — deposit needed for a target LVR plus entered upfront costs. */
export function DepositCalculator() {
  const entry = getRegistryEntry("AU-HOME-019")!;
  const [priceRaw, setPriceRaw] = useState("");
  const [lvrPctRaw, setLvrPctRaw] = useState("80");
  const [costsRaw, setCostsRaw] = useState("");

  const price = useMemo(() => parseMoneyInput(priceRaw), [priceRaw]);
  const costs = useMemo(() => parseMoneyInput(costsRaw), [costsRaw]);
  const lvrValid = /^\d+(\.\d+)?$/.test(lvrPctRaw.trim()) && Number.parseFloat(lvrPctRaw) > 0 && Number.parseFloat(lvrPctRaw) <= 100;

  const result = useMemo(() => {
    if (!price.ok || !lvrValid) return null;
    const priceDec = d(moneyToDecimalString(price.money));
    const lvr = d(lvrPctRaw).div(100) as DecimalValue;
    const loan = priceDec.times(lvr) as DecimalValue;
    const deposit = priceDec.minus(loan) as DecimalValue;
    const upfront = costs.ok ? d(moneyToDecimalString(costs.money)) : d(0);
    return {
      deposit: deposit.toFixed(2),
      loan: loan.toFixed(2),
      totalCashNeeded: deposit.plus(upfront).toFixed(2),
    };
  }, [price, lvrValid, lvrPctRaw, costs]);

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
          </div>
        )
      }
      explanation={null}
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
      explanation={null}
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
      explanation={null}
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
