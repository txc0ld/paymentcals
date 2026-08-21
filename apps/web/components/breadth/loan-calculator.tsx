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
  ToggleField,
  UniversalDisclosure,
  WorkingPanel,
} from "@paymentcalcs/calculation-ui";
import { getRegistryEntry } from "@paymentcalcs/calculator-registry";
import { Dec, moneyFromDecimalString, moneyToDecimalString, type DecimalValue } from "@paymentcalcs/calculation-core";
import { buildLoanSchedule, type LoanScheduleResult } from "@paymentcalcs/engine-loans";
import { formatMajor, periodsToYearsLabel } from "../../lib/format-major";
import type { SCompareResult, SLedgerResult } from "../../lib/ledger-serialize";
import { parseMoneyInput } from "../../lib/money-input";
import { useLedgerJob } from "../../lib/use-ledger";
import { ScheduleView } from "../home/schedule-view";
import { LOAN_BASICS_DEFAULTS, LoanBasicsFields, PPY, parseLoanBasics, type LoanBasicsState } from "../home/loan-fields";
import { AdvancedGroup, NumberField } from "./advanced-group";

const FIRST_PAYMENT_DATE = "2026-10-01";

const PERIOD_NOUN: Record<"weekly" | "fortnightly" | "monthly", string> = {
  weekly: "week",
  fortnightly: "fortnight",
  monthly: "month",
};

const d = (value: string | number) => new Dec(value) as DecimalValue;

/** Cost-of-credit ledger row: label plus an already-computed major-unit string. */
function CostRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-hairline py-2 last:border-b-0">
      <span className="min-w-0 text-[13px] leading-5 text-ink-2">
        {label}
        {detail ? <span className="block text-[12px] leading-4 text-ink-3">{detail}</span> : null}
      </span>
      <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">{formatMajor(value)}</span>
    </div>
  );
}

/** Positive major-unit amount from a money field, or "0" when blank/invalid. */
function positiveAmount(raw: string): string {
  const parsed = parseMoneyInput(raw);
  if (!parsed.ok) return "0";
  const value = new Dec(moneyToDecimalString(parsed.money));
  return value.greaterThan(0) ? value.toFixed(2) : "0";
}

/**
 * AU-DEBT-001 (general/personal loan) and AU-DEBT-003 (car loan with balloon).
 * Balloon amounts here reduce the periodic repayment and fall due at term end;
 * they are shown, never hidden in a lower repayment.
 */
export function LoanCalculator({ variant }: { variant: "personal" | "car" }) {
  const entry = getRegistryEntry(variant === "car" ? "AU-DEBT-003" : "AU-DEBT-001")!;
  const [state, setState] = useState<LoanBasicsState>({ ...LOAN_BASICS_DEFAULTS, termYearsRaw: variant === "car" ? "5" : "5" });
  const [balloonRaw, setBalloonRaw] = useState("");
  const [extraRaw, setExtraRaw] = useState("");
  const [establishmentRaw, setEstablishmentRaw] = useState("");
  const [periodicFeeRaw, setPeriodicFeeRaw] = useState("");
  const [offerBOn, setOfferBOn] = useState(false);
  const [offerBRatePctRaw, setOfferBRatePctRaw] = useState("");
  const [offerBTermYearsRaw, setOfferBTermYearsRaw] = useState("");
  const [offerBEstablishmentRaw, setOfferBEstablishmentRaw] = useState("");
  const [offerBPeriodicFeeRaw, setOfferBPeriodicFeeRaw] = useState("");

  const parsed = useMemo(() => parseLoanBasics(state), [state]);
  const balloon = useMemo(() => parseMoneyInput(balloonRaw), [balloonRaw]);
  const extra = useMemo(() => parseMoneyInput(extraRaw), [extraRaw]);
  const establishment = useMemo(() => parseMoneyInput(establishmentRaw), [establishmentRaw]);
  const periodicFeeAmount = useMemo(() => parseMoneyInput(periodicFeeRaw), [periodicFeeRaw]);

  const establishmentFee = useMemo(() => positiveAmount(establishmentRaw), [establishmentRaw]);
  const periodicFee = useMemo(() => positiveAmount(periodicFeeRaw), [periodicFeeRaw]);
  const periodicFeeActive = new Dec(periodicFee).greaterThan(0);

  // The extra repayment is a local what-if only: an empty field reproduces the
  // plain schedule exactly, and nothing here touches the share URL.
  const extraAmount = useMemo(() => {
    if (extraRaw.trim() === "" || !extra.ok) return null;
    const value = moneyToDecimalString(extra.money);
    return new Dec(value).greaterThan(0) ? value : null;
  }, [extraRaw, extra]);

  // Balloon handling runs on the closed-form E11 engine via the ledger's
  // payment override: compute the balloon payment via the worker-run schedule.
  const job = useMemo(() => {
    if (!parsed.ok) return null;
    const input = {
      openingPrincipal: parsed.principal,
      annualRate: parsed.annualRate,
      termPeriods: parsed.termPeriods,
      repaymentFrequency: parsed.frequency,
      firstRepaymentDate: FIRST_PAYMENT_DATE,
      repaymentType: "principal_and_interest" as const,
      repaymentResetPolicy: "recalculate_to_term" as const,
    };
    if (extraAmount === null) return { kind: "run" as const, input: { ...input, events: [] } };
    return {
      kind: "compare" as const,
      input: {
        ...input,
        events: [
          { type: "extra_recurring" as const, startDate: FIRST_PAYMENT_DATE, amount: extraAmount },
        ],
      },
    };
  }, [parsed, extraAmount]);

  const { result: jobResult } = useLedgerJob<SLedgerResult | SCompareResult>(job);
  // "compare" returns scenario + baseline; the headline always reads the
  // baseline so the displayed loan is the loan as contracted.
  const comparison = jobResult && "baseline" in jobResult ? jobResult : null;
  const result: SLedgerResult | null = comparison
    ? comparison.baseline
    : ((jobResult as SLedgerResult | null) ?? null);

  const balloonError = useMemo(() => {
    if (variant !== "car" || !balloonRaw.trim() || !balloon.ok || !parsed.ok) return null;
    const balloonAmount = new Dec(moneyToDecimalString(balloon.money));
    return balloonAmount.greaterThanOrEqualTo(new Dec(parsed.principal))
      ? "The balloon must be smaller than the loan amount."
      : null;
  }, [variant, balloonRaw, balloon, parsed]);

  const balloonAmount = useMemo(() => {
    if (variant !== "car" || !balloonRaw.trim() || !balloon.ok || balloonError) return null;
    return moneyToDecimalString(balloon.money);
  }, [variant, balloonRaw, balloon, balloonError]);

  /**
   * The §13.6-aware E11 schedule. It drives the headline whenever a balloon or
   * a periodic fee is in play, so every displayed metric (repayment, interest,
   * fees, total, payoff) comes from one run of one engine.
   */
  const directSchedule = useMemo(() => {
    if (!parsed.ok) return null;
    if (balloonAmount === null && !periodicFeeActive) return null;
    const base = {
      principal: d(parsed.principal),
      annualRate: d(parsed.annualRate),
      termPeriods: parsed.termPeriods,
      frequency: parsed.frequency,
      firstPaymentDate: FIRST_PAYMENT_DATE,
      repaymentType: "principal_and_interest" as const,
      interestOnlyPeriods: parsed.ioPeriods,
      ...(balloonAmount !== null ? { balloon: d(balloonAmount) } : {}),
      ...(periodicFeeActive ? { periodicFee: d(periodicFee) } : {}),
    };
    const schedule = buildLoanSchedule(base);
    // Same engine, same inputs, extra repayment added: the pair is internally
    // consistent, so the saving is a difference of two comparable runs.
    const withExtra =
      extraAmount === null ? null : buildLoanSchedule({ ...base, extraPerPeriod: d(extraAmount) });
    return { schedule, withExtra };
  }, [parsed, balloonAmount, periodicFeeActive, periodicFee, extraAmount]);

  const headlineSchedule = directSchedule?.schedule ?? null;

  // Total cost of credit, from whichever schedule drives the headline.
  const costOfCredit = useMemo(() => {
    if (headlineSchedule) {
      return {
        principal: headlineSchedule.totalPrincipal.toFixed(2),
        interest: headlineSchedule.totalInterest.toFixed(2),
        fees: headlineSchedule.totalFees.toFixed(2),
        total: headlineSchedule.totalPaid.toFixed(2),
      };
    }
    if (!result || !parsed.ok) return null;
    const interest = new Dec(result.totalInterest);
    const fees = new Dec(result.totalFees);
    const principal = new Dec(result.totalPaid).minus(interest).minus(fees);
    return {
      principal: principal.toFixed(2),
      interest: interest.toFixed(2),
      fees: fees.toFixed(2),
      total: new Dec(result.totalPaid).toFixed(2),
    };
  }, [headlineSchedule, result, parsed]);

  const totalWithUpfront = useMemo(() => {
    if (!costOfCredit) return null;
    return new Dec(costOfCredit.total).plus(establishmentFee).toFixed(2);
  }, [costOfCredit, establishmentFee]);

  // Extra-repayment saving: interest and periods avoided, from two runs of the
  // same engine on the same inputs.
  const saving = useMemo(() => {
    if (extraAmount === null) return null;
    if (directSchedule) {
      const { schedule, withExtra } = directSchedule;
      if (!withExtra) return null;
      return {
        interestSaved: schedule.totalInterest.minus(withExtra.totalInterest).toFixed(2),
        periodsSaved: schedule.rows.length - withExtra.rows.length,
        newInterest: withExtra.totalInterest.toFixed(2),
        newPayoffDate: withExtra.payoffDate,
        periodsUsed: withExtra.rows.length,
      };
    }
    if (!comparison) return null;
    return {
      interestSaved: comparison.interestSaved,
      periodsSaved: comparison.periodsSaved,
      newInterest: comparison.scenario.totalInterest,
      newPayoffDate: comparison.scenario.payoffDate,
      periodsUsed: comparison.scenario.periodsUsed,
    };
  }, [extraAmount, directSchedule, comparison]);

  const offerBRateValid =
    /^\d+(\.\d+)?$/.test(offerBRatePctRaw.trim()) && Number.parseFloat(offerBRatePctRaw) <= 30;
  const offerBTermValid =
    /^\d+(\.\d+)?$/.test(offerBTermYearsRaw.trim()) &&
    Number.parseFloat(offerBTermYearsRaw) > 0 &&
    Number.parseFloat(offerBTermYearsRaw) <= 40;

  /**
   * Two offers on the same borrowed amount, both from one run each of the same
   * E11 engine, so the totals are directly comparable. Only rate, term and fees
   * differ between the columns.
   */
  const offers = useMemo(() => {
    if (!offerBOn || !parsed.ok || !offerBRateValid || !offerBTermValid) return null;
    const shared = {
      principal: d(parsed.principal),
      frequency: parsed.frequency,
      firstPaymentDate: FIRST_PAYMENT_DATE,
      repaymentType: "principal_and_interest" as const,
      ...(balloonAmount !== null ? { balloon: d(balloonAmount) } : {}),
    };
    const build = (
      annualRatePct: string,
      termYears: string,
      periodic: string,
      ioPeriods: number,
    ): LoanScheduleResult =>
      buildLoanSchedule({
        ...shared,
        annualRate: d((Number.parseFloat(annualRatePct) / 100).toString()),
        termPeriods: Math.round(Number.parseFloat(termYears) * PPY[parsed.frequency]),
        interestOnlyPeriods: ioPeriods,
        ...(new Dec(periodic).greaterThan(0) ? { periodicFee: d(periodic) } : {}),
      });

    const a = build(state.ratePctRaw, state.termYearsRaw, periodicFee, parsed.ioPeriods);
    const b = build(offerBRatePctRaw, offerBTermYearsRaw, positiveAmount(offerBPeriodicFeeRaw), 0);
    const aUpfront = d(establishmentFee);
    const bUpfront = d(positiveAmount(offerBEstablishmentRaw));
    const aTotal = a.totalPaid.plus(aUpfront) as DecimalValue;
    const bTotal = b.totalPaid.plus(bUpfront) as DecimalValue;
    return {
      a: { schedule: a, upfront: aUpfront, total: aTotal, rate: state.ratePctRaw, years: state.termYearsRaw },
      b: {
        schedule: b,
        upfront: bUpfront,
        total: bTotal,
        rate: offerBRatePctRaw,
        years: offerBTermYearsRaw,
      },
      totalDelta: bTotal.minus(aTotal) as DecimalValue,
      interestDelta: b.totalInterest.minus(a.totalInterest) as DecimalValue,
      repaymentDelta: b.scheduledPayment.minus(a.scheduledPayment) as DecimalValue,
    };
  }, [
    offerBOn,
    parsed,
    offerBRateValid,
    offerBTermValid,
    balloonAmount,
    state.ratePctRaw,
    state.termYearsRaw,
    periodicFee,
    establishmentFee,
    offerBRatePctRaw,
    offerBTermYearsRaw,
    offerBPeriodicFeeRaw,
    offerBEstablishmentRaw,
  ]);

  const periodNoun = PERIOD_NOUN[state.frequency];

  function onReset() {
    setState({ ...LOAN_BASICS_DEFAULTS, termYearsRaw: "5" });
    setBalloonRaw("");
    setExtraRaw("");
    setEstablishmentRaw("");
    setPeriodicFeeRaw("");
    setOfferBOn(false);
    setOfferBRatePctRaw("");
    setOfferBTermYearsRaw("");
    setOfferBEstablishmentRaw("");
    setOfferBPeriodicFeeRaw("");
  }

  return (
    <CalculatorShell
      header={
        <CalculatorHeader
          meta={{
            title: entry.displayName,
            jurisdictionLabel: "Australia",
            periodLabel: "Scheduled model",
            calculationClass: entry.calculationClass,
            ruleStatus: { label: "No statutory rules required", tone: "neutral" },
          }}
          methodologyHref={`/methodology/${entry.slug}`}
          actions={<ScenarioActions onReset={onReset} />}
        />
      }
      inputs={
        <div className="grid gap-6">
          <LoanBasicsFields state={state} onChange={(patch) => setState((s) => ({ ...s, ...patch }))} errors={parsed.errors} />
          {variant === "car" ? (
            <MoneyField
              id="loan-balloon"
              label="Balloon / residual payment"
              description="A lump owed at the end of the term. It lowers the repayment but not the total cost."
              value={balloonRaw}
              onChange={setBalloonRaw}
              error={
                balloonError ?? (!balloon.ok && balloon.error ? balloon.error : undefined) ?? undefined
              }
            />
          ) : null}
          <MoneyField
            id="loan-extra"
            label={`Extra repayment per ${periodNoun}`}
            description="Optional what-if. Leave empty for the contracted repayment only."
            value={extraRaw}
            onChange={setExtraRaw}
            error={!extra.ok && extra.error ? extra.error : undefined}
          />
          <AdvancedGroup
            legend="Fees"
            hint="Blank means no fee, which reproduces the fee-free result above."
          >
            <MoneyField
              id="loan-establishment"
              label="Establishment fee"
              description="Charged once at settlement. It is added to the total cost, not to the repayment."
              value={establishmentRaw}
              onChange={setEstablishmentRaw}
              error={establishmentRaw.trim() !== "" && !establishment.ok && establishment.error ? establishment.error : undefined}
            />
            <MoneyField
              id="loan-periodic-fee"
              label={`Account fee per ${periodNoun}`}
              description="Charged alongside every repayment. It raises the total cost and does not reduce the balance."
              value={periodicFeeRaw}
              onChange={setPeriodicFeeRaw}
              error={periodicFeeRaw.trim() !== "" && !periodicFeeAmount.ok && periodicFeeAmount.error ? periodicFeeAmount.error : undefined}
            />
          </AdvancedGroup>
          <AdvancedGroup
            legend="Compare a second offer"
            hint="Same borrowed amount and repayment frequency; only the rate, term and fees change."
          >
            <ToggleField
              id="loan-offer-b"
              label="Compare a second offer"
              description="Runs the same engine a second time and shows the difference in total cost."
              checked={offerBOn}
              onChange={setOfferBOn}
            />
            {offerBOn ? (
              <>
                <div className="grid items-start gap-4 @md:grid-cols-2">
                  <NumberField
                    id="loan-b-rate"
                    label="Offer B rate % p.a."
                    value={offerBRatePctRaw}
                    onChange={setOfferBRatePctRaw}
                    unit="%"
                    error={
                      offerBRatePctRaw.trim() !== "" && !offerBRateValid
                        ? "Enter an annual rate up to 30, like 6.49."
                        : undefined
                    }
                  />
                  <NumberField
                    id="loan-b-term"
                    label="Offer B term (years)"
                    value={offerBTermYearsRaw}
                    onChange={setOfferBTermYearsRaw}
                    unit="yr"
                    error={
                      offerBTermYearsRaw.trim() !== "" && !offerBTermValid
                        ? "Term must be between 1 and 40 years."
                        : undefined
                    }
                  />
                </div>
                <MoneyField
                  id="loan-b-establishment"
                  label="Offer B establishment fee"
                  value={offerBEstablishmentRaw}
                  onChange={setOfferBEstablishmentRaw}
                />
                <MoneyField
                  id="loan-b-periodic-fee"
                  label={`Offer B account fee per ${periodNoun}`}
                  value={offerBPeriodicFeeRaw}
                  onChange={setOfferBPeriodicFeeRaw}
                />
              </>
            ) : null}
          </AdvancedGroup>
        </div>
      }
      results={
        !result && !headlineSchedule ? (
          <EmptyState>Enter the loan to see repayments, total interest and the schedule.</EmptyState>
        ) : (
          <div className="nexus-result @container grid min-w-0 gap-6 p-6 md:p-8">
            <PrimaryResult
              label={`Repayment per ${periodNoun}`}
              amount={moneyFromDecimalString(
                "AUD",
                headlineSchedule ? headlineSchedule.scheduledPayment.toFixed(2) : result!.scheduledPaymentInitial,
                2,
              )}
              qualifier={
                balloonAmount !== null
                  ? `Plus a ${formatMajor(balloonAmount)} balloon due at the end of the term. The balloon reduces each repayment, not the amount you owe.`
                  : periodicFeeActive
                    ? `Over ${state.termYearsRaw} years at ${state.ratePctRaw || "…"}% p.a. The ${formatMajor(periodicFee)} account fee is charged on top of this repayment.`
                    : `Over ${state.termYearsRaw} years at ${state.ratePctRaw || "…"}% p.a.`
              }
            />
            <div className="grid gap-4 border-t border-hairline pt-6 @sm:grid-cols-2 @xl:grid-cols-3">
              <ResultMetric
                label="Total interest"
                amount={moneyFromDecimalString(
                  "AUD",
                  headlineSchedule ? headlineSchedule.totalInterest.toFixed(2) : result!.totalInterest,
                  2,
                )}
              />
              <ResultMetric
                label="Total paid"
                amount={moneyFromDecimalString(
                  "AUD",
                  headlineSchedule ? headlineSchedule.totalPaid.toFixed(2) : result!.totalPaid,
                  2,
                )}
                detail={balloonAmount !== null ? "including the balloon at term end" : undefined}
              />
              <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Paid off</span>
                <span className="font-mono text-xl tabular-nums text-ink">
                  {headlineSchedule
                    ? (headlineSchedule.payoffDate ?? "at term with balloon")
                    : (result!.payoffDate ?? "beyond term")}
                </span>
                <span className="text-[12px] leading-4 text-ink-3">
                  {periodsToYearsLabel(
                    headlineSchedule ? headlineSchedule.rows.length : result!.periodsUsed,
                    PPY[state.frequency],
                  )}
                </span>
              </div>
            </div>
            {costOfCredit ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  Total cost of credit
                </h3>
                <div className="nexus-panel-soft grid min-w-0 px-4 py-2">
                  <CostRow label="Principal repaid" value={costOfCredit.principal} />
                  <CostRow label="Interest charged" value={costOfCredit.interest} />
                  {new Dec(costOfCredit.fees).greaterThan(0) ? (
                    <CostRow label={`Account fees charged per ${periodNoun}`} value={costOfCredit.fees} />
                  ) : null}
                  {balloonAmount !== null ? (
                    <CostRow
                      label="of which balloon at term end"
                      value={balloonAmount}
                      detail="already counted inside the principal repaid"
                    />
                  ) : null}
                  <CostRow label="Total paid over the loan" value={costOfCredit.total} />
                  {new Dec(establishmentFee).greaterThan(0) && totalWithUpfront ? (
                    <>
                      <CostRow label="Establishment fee at settlement" value={establishmentFee} />
                      <CostRow
                        label="Total cost including the upfront fee"
                        value={totalWithUpfront}
                        detail="repayments and fees over the term, plus the one-off establishment fee"
                      />
                    </>
                  ) : null}
                </div>
                <p className="text-[12px] leading-5 text-ink-3">
                  Principal, interest and fees sum to the total paid, and all of them come from the
                  same schedule as the repayment and payoff date above.
                </p>
              </div>
            ) : null}
            {offers ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--pc-accent-text)]">
                  This loan against the second offer
                </h3>
                <div className="overflow-x-auto">
                  <table className="nexus-table w-full min-w-[440px] border-collapse text-left">
                    <caption className="sr-only">
                      Repayment, interest, fees and total cost for each offer on the same borrowed amount
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
                        <th scope="col" className="py-2 pe-4 font-normal">Line</th>
                        <th scope="col" className="py-2 pe-4 text-right font-normal">
                          This loan · {offers.a.rate}% · {offers.a.years} yr
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          Offer B · {offers.b.rate}% · {offers.b.years} yr
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          [
                            `Repayment per ${periodNoun}`,
                            offers.a.schedule.scheduledPayment.toFixed(2),
                            offers.b.schedule.scheduledPayment.toFixed(2),
                          ],
                          [
                            "Interest over the term",
                            offers.a.schedule.totalInterest.toFixed(2),
                            offers.b.schedule.totalInterest.toFixed(2),
                          ],
                          [
                            "Account fees over the term",
                            offers.a.schedule.totalFees.toFixed(2),
                            offers.b.schedule.totalFees.toFixed(2),
                          ],
                          [
                            "Establishment fee",
                            offers.a.upfront.toFixed(2),
                            offers.b.upfront.toFixed(2),
                          ],
                          ["Total cost", offers.a.total.toFixed(2), offers.b.total.toFixed(2)],
                        ] as const
                      ).map(([label, a, b]) => (
                        <tr key={label} className="border-b border-hairline last:border-b-0">
                          <td className="py-2 pe-4 text-[13px] leading-5 text-ink-2">{label}</td>
                          <td className="py-2 pe-4 text-right font-mono text-[13px] tabular-nums text-ink">
                            {formatMajor(a)}
                          </td>
                          <td className="py-2 text-right font-mono text-[13px] tabular-nums text-ink">
                            {formatMajor(b)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[12px] leading-5 text-ink-2">
                  Over each offer&rsquo;s own term, offer B costs{" "}
                  {formatMajor(offers.totalDelta.abs().toFixed(2))}{" "}
                  {offers.totalDelta.isZero() ? "the same in total" : offers.totalDelta.greaterThan(0) ? "more in total" : "less in total"}
                  , with {formatMajor(offers.interestDelta.abs().toFixed(2))}{" "}
                  {offers.interestDelta.greaterThan(0) ? "more" : "less"} interest and a repayment{" "}
                  {formatMajor(offers.repaymentDelta.abs().toFixed(2))}{" "}
                  {offers.repaymentDelta.greaterThan(0) ? "higher" : "lower"} per {periodNoun}. The terms
                  differ, so the totals cover different lengths of time.
                </p>
              </div>
            ) : null}
            {saving ? (
              <div className="grid min-w-0 gap-4 border-t border-hairline pt-6">
                <h3 className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
                  {/* Accent used as a rule, never as small coloured text. */}
                  <span aria-hidden="true" className="h-0.5 w-6 shrink-0 bg-accent" />
                  With {formatMajor(extraAmount!)} extra per {periodNoun}
                </h3>
                <div className="grid items-start gap-4 @sm:grid-cols-2">
                  <ResultMetric
                    label="Interest saved"
                    amount={moneyFromDecimalString("AUD", saving.interestSaved, 2)}
                    detail={`interest falls to ${formatMajor(saving.newInterest)}`}
                  />
                  <div className="nexus-panel-soft flex min-w-0 flex-col gap-1 p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Time saved</span>
                    <span className="font-mono text-xl tabular-nums text-ink">
                      {periodsToYearsLabel(Math.max(0, saving.periodsSaved), PPY[state.frequency])}
                    </span>
                    <span className="text-[12px] leading-4 text-ink-3">
                      {saving.newPayoffDate
                        ? `paid off ${saving.newPayoffDate}`
                        : "still beyond the contracted term"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      }
      explanation={
        <div className="grid min-w-0 gap-8">
          {result && !headlineSchedule ? (
            <div className="nexus-panel-soft min-w-0 p-6 md:p-8">
              <ScheduleView result={result} calculatorId={entry.id} frequency={state.frequency} />
            </div>
          ) : null}
          <WorkingPanel
            summary={
              headlineSchedule || result
                ? `The repayment is the closed-form amount that clears the borrowed amount over the term at the entered rate${balloonAmount !== null ? ", after discounting the balloon back to today" : ""}. The schedule then re-runs that payment period by period, rounding to the cent each period, so the totals shown are the totals of the rows.`
                : "Enter the loan amount, rate and term to see the repayment and the working behind it."
            }
            steps={[
              "periodic rate = annual rate ÷ periods per year (52 weekly, 26 fortnightly, 12 monthly)",
              "payment = (principal − balloon ÷ (1 + i)ⁿ) × i ÷ (1 − (1 + i)⁻ⁿ)",
              "each period: interest = opening balance × i, principal part = payment + extra − interest",
              "closing balance = opening balance − principal part, rounded to the cent",
              "account fees are added to the total paid and never reduce the balance",
              "the final payment is adjusted so the closing balance is exactly zero",
            ]}
            assumptions={[
              "The rate is fixed for the whole term; rate changes are not modelled here.",
              "Repayments are made in full and on time, on a regular cycle from the first repayment date.",
              "Fees are the amounts you enter, not published rates. The establishment fee is treated as payable at settlement.",
              "Interest is charged on the payment-period balance, not accrued daily.",
            ]}
            limitations={[
              "Redraw, offset, honeymoon and introductory rates, and lender-specific fee waivers are not modelled.",
              "Comparison rates published by lenders use a different statutory basis and are not reproduced here.",
              "Result accuracy class A: deterministic arithmetic on the figures you enter.",
            ]}
          />
        </div>
      }
      disclosure={<UniversalDisclosure financialYear="current" />}
    />
  );
}
