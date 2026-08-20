"use client";

import { useMemo, useState } from "react";
import {
  CalculatorHeader,
  CalculatorShell,
  EmptyState,
  MoneyField,
  PrimaryResult,
  ResultMetric,
  SegmentedControl,
  UniversalDisclosure,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString, moneyToDecimalString } from "@paymentcalcs/calculation-core";
import { simulateCreditCard } from "@paymentcalcs/engine-debt";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";

const entry = getRegistryEntry("AU-DEBT-012")!;

export function CreditCardCalculator() {
  const [balanceRaw, setBalanceRaw] = useState("");
  const [ratePctRaw, setRatePctRaw] = useState("20.99");
  const [strategy, setStrategy] = useState<"minimum_only" | "fixed_payment">("fixed_payment");
  const [fixedRaw, setFixedRaw] = useState("");

  const balance = useMemo(() => parseMoneyInput(balanceRaw), [balanceRaw]);
  const fixed = useMemo(() => parseMoneyInput(fixedRaw), [fixedRaw]);
  const rateValid = /^\d+(\.\d+)?$/.test(ratePctRaw.trim()) && Number.parseFloat(ratePctRaw) <= 40;

  const result = useMemo(() => {
    if (!balance.ok || !rateValid) return null;
    if (strategy === "fixed_payment" && !fixed.ok) return null;
    return simulateCreditCard({
      balance: moneyToDecimalString(balance.money),
      annualPurchaseRate: (Number.parseFloat(ratePctRaw) / 100).toString(),
      minimumPercent: "0.02",
      minimumFloor: "25",
      firstCycleDate: "2026-10-01",
      strategy,
      ...(strategy === "fixed_payment" && fixed.ok ? { fixedPayment: moneyToDecimalString(fixed.money) } : {}),
    });
  }, [balance, rateValid, ratePctRaw, strategy, fixed]);

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
            periodLabel: "Monthly statement cycles",
            calculationClass: entry.calculationClass,
            ruleStatus: { label: "No statutory rules required", tone: "neutral" },
          }}
        />
      }
      inputs={
        <div className="grid gap-6">
          <MoneyField
            id="cc-balance"
            label="Card balance"
            value={balanceRaw}
            onChange={setBalanceRaw}
            error={!balance.ok && balance.error ? balance.error : undefined}
          />
          <div className="grid gap-1.5">
            <label htmlFor="cc-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
              Purchase rate % p.a.
            </label>
            <input
              id="cc-rate"
              inputMode="decimal"
              value={ratePctRaw}
              onChange={(e) => setRatePctRaw(e.target.value)}
              className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">Payment plan</span>
            <SegmentedControl
              label="Payment plan"
              value={strategy}
              onChange={setStrategy}
              options={[
                { value: "fixed_payment", label: "Fixed amount" },
                { value: "minimum_only", label: "Minimum only" },
              ]}
            />
          </div>
          {strategy === "fixed_payment" ? (
            <MoneyField
              id="cc-fixed"
              label="Monthly payment"
              value={fixedRaw}
              onChange={setFixedRaw}
              error={!fixed.ok && fixed.error ? fixed.error : undefined}
            />
          ) : (
            <p className="text-[13px] leading-5 text-ink-3">
              The minimum is modelled as the greater of 2% of the balance or $25, an editable
              default. Check your card's own rule.
            </p>
          )}
        </div>
      }
      results={
        !result ? (
          <EmptyState>Enter the balance and rate to see the payoff time cycle by cycle.</EmptyState>
        ) : (
          <div className="nexus-result grid gap-6 p-6">
            {result.payoffDate ? (
              <PrimaryResult
                label="Paid off"
                amount={moneyFromDecimalString("AUD", result.totalInterest.toFixed(2), 2)}
                qualifier={`Interest cost above. Cleared ${result.payoffDate} after ${result.monthsToPayoff} monthly cycles, paying ${formatMajor(result.totalPaid.toFixed(2))} in total. First minimum payment ${formatMajor(result.firstMinimumPayment.toFixed(2))}.`}
              />
            ) : (
              <div className="grid gap-2">
                <h2 className="text-lg font-medium text-ink">This balance never pays off</h2>
                <p className="text-[14px] leading-6 text-ink-2">
                  Under these settings the payments do not cover interest and charges, so the balance
                  does not amortise. Increase the payment to see a payoff date.
                </p>
              </div>
            )}
            {result.nonAmortising && result.payoffDate ? (
              <p className="border-l-2 border-warn pl-3 text-[13px] leading-5 text-ink-2">
                Some cycles fell short of interest and charges before the balance began to fall.
              </p>
            ) : null}
            {result.payoffDate ? (
              <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
                <ResultMetric label="Total interest" amount={moneyFromDecimalString("AUD", result.totalInterest.toFixed(2), 2)} />
                <ResultMetric label="Total paid" amount={moneyFromDecimalString("AUD", result.totalPaid.toFixed(2), 2)} />
              </div>
            ) : null}
          </div>
        )
      }
      explanation={null}
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
