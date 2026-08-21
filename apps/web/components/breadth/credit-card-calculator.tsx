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
  SegmentedControl,
  ToggleField,
  UniversalDisclosure,
  WorkingPanel,
  downloadCsv,
  formatMoney,
  formatRatePercent,
  toCsv,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { moneyFromDecimalString, moneyToDecimalString } from "@paymentcalcs/calculation-core";
import { simulateCreditCard, type CreditCardInput } from "@paymentcalcs/engine-debt";
import { formatMajor } from "../../lib/format-major";
import { parseMoneyInput } from "../../lib/money-input";
import { AdvancedGroup, CsvDownloadButton, DateField, NumberField } from "./advanced-group";

const entry = getRegistryEntry("AU-DEBT-012")!;

const FIRST_CYCLE_DATE = "2026-10-01";
/** Cycles rendered on screen; the CSV always carries every cycle. */
const VISIBLE_CYCLES = 60;

/** Engine defaults that reproduce the simple result exactly. */
const DEFAULTS = {
  minimumPercent: "2",
  minimumFloor: "25",
  monthlyFee: "",
  spending: "",
  promotionalRate: "0",
  promotionalEnd: "",
};

export function CreditCardCalculator() {
  const [balanceRaw, setBalanceRaw] = useState("");
  const [ratePctRaw, setRatePctRaw] = useState("20.99");
  const [strategy, setStrategy] = useState<"minimum_only" | "fixed_payment">("fixed_payment");
  const [fixedRaw, setFixedRaw] = useState("");

  // Advanced surface — every field below defaults to the engine's neutral value.
  const [minPercentRaw, setMinPercentRaw] = useState(DEFAULTS.minimumPercent);
  const [minFloorRaw, setMinFloorRaw] = useState(DEFAULTS.minimumFloor);
  const [monthlyFeeRaw, setMonthlyFeeRaw] = useState(DEFAULTS.monthlyFee);
  const [spendingRaw, setSpendingRaw] = useState(DEFAULTS.spending);
  const [promoOn, setPromoOn] = useState(false);
  const [promoRatePctRaw, setPromoRatePctRaw] = useState(DEFAULTS.promotionalRate);
  const [promoEndRaw, setPromoEndRaw] = useState(DEFAULTS.promotionalEnd);

  const balance = useMemo(() => parseMoneyInput(balanceRaw), [balanceRaw]);
  const fixed = useMemo(() => parseMoneyInput(fixedRaw), [fixedRaw]);
  const minFloor = useMemo(() => parseMoneyInput(minFloorRaw), [minFloorRaw]);
  const monthlyFee = useMemo(() => parseMoneyInput(monthlyFeeRaw), [monthlyFeeRaw]);
  const spending = useMemo(() => parseMoneyInput(spendingRaw), [spendingRaw]);

  const rateValid = /^\d+(\.\d+)?$/.test(ratePctRaw.trim()) && Number.parseFloat(ratePctRaw) <= 40;
  const minPercentValid =
    /^\d+(\.\d+)?$/.test(minPercentRaw.trim()) &&
    Number.parseFloat(minPercentRaw) > 0 &&
    Number.parseFloat(minPercentRaw) <= 100;
  const promoRateValid =
    /^\d+(\.\d+)?$/.test(promoRatePctRaw.trim()) && Number.parseFloat(promoRatePctRaw) <= 40;
  const promoDateValid = /^\d{4}-\d{2}-\d{2}$/.test(promoEndRaw) && promoEndRaw > FIRST_CYCLE_DATE;
  const promoActive = promoOn && promoRateValid && promoDateValid;

  const baseInput = useMemo((): Omit<CreditCardInput, "strategy"> | null => {
    if (!balance.ok || !rateValid || !minPercentValid) return null;
    if (minFloorRaw.trim() !== "" && !minFloor.ok) return null;
    if (monthlyFeeRaw.trim() !== "" && !monthlyFee.ok) return null;
    if (spendingRaw.trim() !== "" && !spending.ok) return null;
    return {
      balance: moneyToDecimalString(balance.money),
      annualPurchaseRate: (Number.parseFloat(ratePctRaw) / 100).toString(),
      minimumPercent: (Number.parseFloat(minPercentRaw) / 100).toString(),
      minimumFloor: minFloor.ok ? moneyToDecimalString(minFloor.money) : "0",
      firstCycleDate: FIRST_CYCLE_DATE,
      ...(monthlyFee.ok ? { monthlyFee: moneyToDecimalString(monthlyFee.money) } : {}),
      ...(spending.ok ? { newSpendingPerMonth: moneyToDecimalString(spending.money) } : {}),
      ...(promoActive
        ? {
            promotionalRate: (Number.parseFloat(promoRatePctRaw) / 100).toString(),
            promotionalEndDate: promoEndRaw,
          }
        : {}),
    };
  }, [
    balance,
    rateValid,
    ratePctRaw,
    minPercentValid,
    minPercentRaw,
    minFloor,
    minFloorRaw,
    monthlyFee,
    monthlyFeeRaw,
    spending,
    spendingRaw,
    promoActive,
    promoRatePctRaw,
    promoEndRaw,
  ]);

  const result = useMemo(() => {
    if (!baseInput) return null;
    if (strategy === "fixed_payment" && !fixed.ok) return null;
    return simulateCreditCard({
      ...baseInput,
      strategy,
      ...(strategy === "fixed_payment" && fixed.ok ? { fixedPayment: moneyToDecimalString(fixed.money) } : {}),
    });
  }, [baseInput, strategy, fixed]);

  // Both strategies on the same balance, rate and minimum rule, from the same
  // engine, so the two columns are directly comparable.
  const comparison = useMemo(() => {
    if (!baseInput || !fixed.ok || fixedRaw.trim() === "") return null;
    const fixedAmount = moneyToDecimalString(fixed.money);
    return {
      fixedLabel: `Fixed ${formatMajor(fixedAmount)} per month`,
      minimumOnly: simulateCreditCard({ ...baseInput, strategy: "minimum_only" }),
      fixedPayment: simulateCreditCard({
        ...baseInput,
        strategy: "fixed_payment",
        fixedPayment: fixedAmount,
      }),
    };
  }, [baseInput, fixed, fixedRaw]);

  const cycles = result?.cycles ?? [];
  const visibleCycles = cycles.slice(0, VISIBLE_CYCLES);

  function onDownloadCycles() {
    if (cycles.length === 0) return;
    downloadCsv(
      "credit-card-cycles.csv",
      toCsv(
        [
          "cycle",
          "date",
          "annual_rate_applied",
          "interest",
          "fee",
          "new_spending",
          "minimum_payment",
          "payment",
          "closing_balance",
        ],
        cycles.map((cycle) => [
          cycle.cycle,
          cycle.date,
          cycle.rateApplied,
          cycle.interest.toFixed(2),
          cycle.fee.toFixed(2),
          cycle.spending.toFixed(2),
          cycle.minimumPayment.toFixed(2),
          cycle.payment.toFixed(2),
          cycle.closingBalance.toFixed(2),
        ]),
      ),
    );
  }

  function onReset() {
    setBalanceRaw("");
    setRatePctRaw("20.99");
    setStrategy("fixed_payment");
    setFixedRaw("");
    setMinPercentRaw(DEFAULTS.minimumPercent);
    setMinFloorRaw(DEFAULTS.minimumFloor);
    setMonthlyFeeRaw(DEFAULTS.monthlyFee);
    setSpendingRaw(DEFAULTS.spending);
    setPromoOn(false);
    setPromoRatePctRaw(DEFAULTS.promotionalRate);
    setPromoEndRaw(DEFAULTS.promotionalEnd);
  }

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
          methodologyHref={`/methodology/${entry.slug}`}
          actions={<ScenarioActions onReset={onReset} />}
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
          <div className="grid justify-items-start gap-1.5">
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
              The minimum is the greater of the percentage and the floor set below. Check your
              card&rsquo;s own rule and change them to match.
            </p>
          )}
          <AdvancedGroup
            legend="Your card's terms"
            hint="These start at the modelled defaults. Change them to the terms printed on your own statement."
          >
            <div className="grid items-start gap-4 @md:grid-cols-2">
              <NumberField
                id="cc-min-percent"
                label="Minimum payment %"
                value={minPercentRaw}
                onChange={setMinPercentRaw}
                unit="%"
                error={minPercentValid ? undefined : "Enter a percentage above 0 and up to 100."}
              />
              <MoneyField
                id="cc-min-floor"
                label="Minimum payment floor"
                value={minFloorRaw}
                onChange={setMinFloorRaw}
                error={minFloorRaw.trim() !== "" && !minFloor.ok && minFloor.error ? minFloor.error : undefined}
              />
            </div>
            <MoneyField
              id="cc-monthly-fee"
              label="Monthly card fee"
              description="Charged to the balance every statement cycle. Blank means no fee."
              value={monthlyFeeRaw}
              onChange={setMonthlyFeeRaw}
              error={monthlyFeeRaw.trim() !== "" && !monthlyFee.ok && monthlyFee.error ? monthlyFee.error : undefined}
            />
            <MoneyField
              id="cc-spending"
              label="New spending per month"
              description="Added to the balance each cycle before interest is charged. Blank means no new spending."
              value={spendingRaw}
              onChange={setSpendingRaw}
              error={spendingRaw.trim() !== "" && !spending.ok && spending.error ? spending.error : undefined}
            />
            <ToggleField
              id="cc-promo"
              label="Promotional rate period"
              description="Models a balance transfer: a lower rate until an exact date, then the purchase rate."
              checked={promoOn}
              onChange={setPromoOn}
            />
            {promoOn ? (
              <div className="grid items-start gap-4 @md:grid-cols-2">
                <NumberField
                  id="cc-promo-rate"
                  label="Promotional rate % p.a."
                  value={promoRatePctRaw}
                  onChange={setPromoRatePctRaw}
                  unit="%"
                  error={promoRateValid ? undefined : "Enter a rate between 0 and 40."}
                />
                <DateField
                  id="cc-promo-end"
                  label="Promotional rate ends"
                  value={promoEndRaw}
                  onChange={setPromoEndRaw}
                  min={FIRST_CYCLE_DATE}
                  description="The first cycle charged at the purchase rate."
                />
              </div>
            ) : null}
            {promoOn && !promoActive ? (
              <p role="alert" className="text-[12px] leading-5 text-error">
                Enter a valid promotional rate and an end date after {FIRST_CYCLE_DATE} for the
                promotional period to apply.
              </p>
            ) : null}
          </AdvancedGroup>
        </div>
      }
      results={
        !result ? (
          <EmptyState>Enter the balance and rate to see the payoff time cycle by cycle.</EmptyState>
        ) : (
          <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
            {result.payoffDate ? (
              <PrimaryResult
                label="Paid off"
                amount={moneyFromDecimalString("AUD", result.totalInterest.toFixed(2), 2)}
                qualifier={`Interest cost above. Cleared ${result.payoffDate} after ${result.monthsToPayoff} monthly cycles, paying ${formatMajor(result.totalPaid.toFixed(2))} in total. First minimum payment ${formatMajor(result.firstMinimumPayment.toFixed(2))}.`}
              />
            ) : (
              <div className="grid gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-ink">This balance never pays off</h2>
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
              <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 @xl:grid-cols-3">
                <ResultMetric label="Total interest" amount={moneyFromDecimalString("AUD", result.totalInterest.toFixed(2), 2)} />
                <ResultMetric label="Total fees" amount={moneyFromDecimalString("AUD", result.totalFees.toFixed(2), 2)} />
                <ResultMetric label="Total paid" amount={moneyFromDecimalString("AUD", result.totalPaid.toFixed(2), 2)} />
              </div>
            ) : null}
            {comparison ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  Minimum only against your fixed payment
                </h3>
                <div className="overflow-x-auto">
                  <table className="nexus-table w-full min-w-[380px] border-collapse text-left">
                    <caption className="sr-only">
                      Payoff time and cost under each payment plan on the same balance and rate
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">Plan</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">Cycles</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
                        <th scope="col" className="py-2 text-right font-normal">Total paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["Minimum only", comparison.minimumOnly],
                          [comparison.fixedLabel, comparison.fixedPayment],
                        ] as const
                      ).map(([label, run]) => (
                        <tr key={label} className="border-b border-hairline last:border-b-0">
                          <td className="py-2 pe-4 text-[13px] leading-5 text-ink">{label}</td>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                            {run.monthsToPayoff ?? "—"}
                          </td>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                            {run.payoffDate
                              ? formatMoney(moneyFromDecimalString("AUD", run.totalInterest.toFixed(2), 2))
                              : "—"}
                          </td>
                          <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                            {run.payoffDate
                              ? formatMoney(moneyFromDecimalString("AUD", run.totalPaid.toFixed(2), 2))
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  {comparison.minimumOnly.payoffDate
                    ? `Both runs use the same balance, rate and minimum-payment rule; only the payment differs. The difference in interest is ${formatMajor(comparison.minimumOnly.totalInterest.minus(comparison.fixedPayment.totalInterest).toFixed(2))}.`
                    : "Under the minimum-only rule this balance does not clear within the modelled horizon, so no interest total is shown for it."}
                </p>
              </div>
            ) : null}
          </div>
        )
      }
      explanation={
        <div className="grid min-w-0 gap-8">
          {cycles.length > 0 ? (
            <section aria-label="Statement cycles" className="nexus-panel grid min-w-0 gap-4 p-6 md:p-8">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <h2 className="font-mono text-[11px] tracking-[0.16em] text-[var(--pc-accent-text)]">
                  Cycle by cycle
                </h2>
                <CsvDownloadButton label="Download cycles CSV" onDownload={onDownloadCycles} />
              </div>
              <div className="min-w-0 overflow-x-auto">
                <table className="nexus-table w-full min-w-[620px] border-collapse text-left">
                  <caption className="sr-only">
                    Interest, fee, minimum payment and closing balance for each monthly statement cycle
                  </caption>
                  <thead>
                    <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                      <th scope="col" className="py-2 pe-4 font-normal">Cycle</th>
                      <th scope="col" className="py-2 pe-4 font-normal">Date</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">Rate</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">Interest</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">Fee</th>
                      <th scope="col" className="py-2 pe-4 text-right font-normal">Minimum</th>
                      <th scope="col" className="py-2 text-right font-normal">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCycles.map((cycle) => (
                      <tr key={cycle.cycle} className="border-b border-hairline last:border-b-0">
                        <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink-2">{cycle.cycle}</td>
                        <td className="py-1.5 pe-4 font-mono text-[13px] tabular-nums text-ink-2">{cycle.date}</td>
                        <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink-2">
                          {formatRatePercent(cycle.rateApplied)}
                        </td>
                        <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                          {formatMoney(moneyFromDecimalString("AUD", cycle.interest.toFixed(2), 2))}
                        </td>
                        <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                          {formatMoney(moneyFromDecimalString("AUD", cycle.fee.toFixed(2), 2))}
                        </td>
                        <td className="py-1.5 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                          {formatMoney(moneyFromDecimalString("AUD", cycle.minimumPayment.toFixed(2), 2))}
                        </td>
                        <td className="py-1.5 text-right font-mono text-[13px] tabular-nums text-ink">
                          {formatMoney(moneyFromDecimalString("AUD", cycle.closingBalance.toFixed(2), 2))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[12px] leading-5 text-ink-3">
                {cycles.length > VISIBLE_CYCLES
                  ? `Showing the first ${VISIBLE_CYCLES} of ${cycles.length} cycles. The CSV contains every cycle.`
                  : `All ${cycles.length} ${cycles.length === 1 ? "cycle" : "cycles"} are listed. The CSV contains the same rows.`}
              </p>
            </section>
          ) : null}
          <WorkingPanel
            summary={
              result
                ? `Each statement cycle charges interest on the opening balance at the applicable annual rate divided by twelve, adds any card fee and new spending, then applies the larger of your payment and the minimum-payment rule.${
                    result.reconciliationPassed
                      ? " Every cycle reconciles opening + spending + interest + fee − payment to its closing balance."
                      : ""
                  }`
                : "Enter a balance and rate to see the cycle-by-cycle working."
            }
            steps={[
              "interest = opening balance × (annual rate ÷ 12), rounded half-up to the cent",
              "balance = opening balance + new spending + interest + monthly fee",
              "minimum = max(balance × minimum percent, minimum floor)",
              "payment = min(balance, max(your fixed payment, minimum))",
              "closing balance = balance − payment",
            ]}
            assumptions={[
              "Interest is charged on the full opening balance every cycle: no interest-free days are modelled, so a card paid in full each month is outside this model.",
              "Cycles are calendar-monthly from the first cycle date; statement periods that vary in length are not modelled.",
              "A promotional rate applies to every cycle dated before its end date, and the purchase rate from that date onwards.",
              "Card terms above are your entries, not published rates. Nothing here is read from a rule pack.",
            ]}
            limitations={[
              "Payment allocation across purchase, cash-advance and promotional balances at different rates is not modelled; a single balance carries a single applicable rate.",
              "Late fees, over-limit fees, cash-advance fees and interest capitalisation rules specific to your issuer are not included.",
              "Result accuracy class A: deterministic arithmetic on the figures you enter.",
            ]}
          />
        </div>
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
