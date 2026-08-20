import {
  Dec,
  compareDates,
  isoDate,
  nthOccurrence,
  plainDate,
  type DecimalValue,
  type ISODate,
} from "@paymentcalcs/calculation-core";
import { amortisingPayment, frequencyOf, type LoanFrequencyKind } from "@paymentcalcs/engine-loans";

/**
 * E07 — scheduled mortgage ledger (Merge Record #3): a payment-period ledger
 * with dated and recurring events. Daily accrual is NOT modelled at P0; the
 * contracts carry day-count fields so a daily mode can be added without
 * breaking changes. Interest per period accrues on
 * max(0, balance − offset × effectiveness) (§13.9), floored at zero.
 */

export type LedgerEvent =
  | { type: "rate_change"; effectiveDate: ISODate; annualRate: string }
  | { type: "extra_recurring"; startDate: ISODate; endDate?: ISODate; amount: string }
  | { type: "extra_oneoff"; effectiveDate: ISODate; amount: string }
  | { type: "offset_deposit_recurring"; startDate: ISODate; endDate?: ISODate; amount: string }
  | { type: "offset_deposit"; effectiveDate: ISODate; amount: string }
  | { type: "offset_withdrawal"; effectiveDate: ISODate; amount: string }
  | { type: "fee_annual"; startDate: ISODate; amount: string; financed: boolean }
  | { type: "fee_oneoff"; effectiveDate: ISODate; amount: string; financed: boolean };

export interface LedgerInput {
  openingPrincipal: string;
  annualRate: string;
  termPeriods: number;
  repaymentFrequency: LoanFrequencyKind;
  firstRepaymentDate: ISODate;
  repaymentType: "principal_and_interest" | "interest_only";
  interestOnlyPeriods?: number;
  repaymentResetPolicy: "keep_amount" | "recalculate_to_term";
  offsetOpeningBalance?: string;
  /** 1 = 100% offset. Contract assumption, surfaced in Advanced mode. */
  offsetEffectiveness?: string;
  paymentOverride?: string;
  events?: LedgerEvent[];
}

export interface LedgerRow {
  period: number;
  date: ISODate;
  annualRate: string;
  interest: DecimalValue;
  payment: DecimalValue;
  extraPayment: DecimalValue;
  fees: DecimalValue;
  offsetBalance: DecimalValue;
  closingBalance: DecimalValue;
}

export interface LedgerResult {
  badge: "scheduled_model";
  rows: LedgerRow[];
  scheduledPaymentInitial: DecimalValue;
  totalInterest: DecimalValue;
  totalFees: DecimalValue;
  totalPaid: DecimalValue;
  payoffDate: ISODate | null;
  periodsUsed: number;
  unresolvedBalance: DecimalValue | null;
  negativeAmortisation: boolean;
  finalOffsetBalance: DecimalValue;
  reconciliation: {
    opening: DecimalValue;
    interestCharged: DecimalValue;
    financedFees: DecimalValue;
    principalPaid: DecimalValue;
    closing: DecimalValue;
    difference: DecimalValue;
    passed: boolean;
  };
}

const PPY: Record<LoanFrequencyKind, number> = { weekly: 52, fortnightly: 26, monthly: 12 };
const cents = (v: DecimalValue): DecimalValue => v.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue;
const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;

export function runLedger(input: LedgerInput): LedgerResult {
  const zero = d(0);
  const freq = frequencyOf(input.repaymentFrequency);
  const start = plainDate(input.firstRepaymentDate);
  const ppy = PPY[input.repaymentFrequency];
  const events = input.events ?? [];
  // Effectiveness is a 0..1 contract assumption; out-of-range values are
  // clamped rather than allowed to invert the §13.9 interest-base floor.
  const effectiveness = (Dec.min(
    d(1),
    Dec.max(zero, d(input.offsetEffectiveness ?? "1")),
  ) as DecimalValue);
  if (d(input.offsetOpeningBalance ?? "0").lessThan(0)) {
    throw new RangeError("Offset opening balance cannot be negative.");
  }
  for (const event of events) {
    const amount = "amount" in event ? d(event.amount) : null;
    if (amount !== null && amount.lessThan(0)) {
      throw new RangeError(`Event amounts cannot be negative (${event.type}).`);
    }
  }
  const ioPeriods =
    input.repaymentType === "interest_only"
      ? (input.interestOnlyPeriods ?? input.termPeriods)
      : (input.interestOnlyPeriods ?? 0);

  // Sorted dated occurrences per event stream, expanded for recurrences.
  interface Occurrence {
    date: ISODate;
    order: number; // §11.5-inspired intra-period order
    apply: (state: State) => void;
  }
  interface State {
    balance: DecimalValue;
    offset: DecimalValue;
    rate: DecimalValue;
    payment: DecimalValue;
    rateChanged: boolean;
    cashFees: DecimalValue;
    financedFees: DecimalValue;
    /** One-off extra repayments due this period (join the payment path so the
     * §12.5.8 cash-flow invariant holds). */
    pendingExtra: DecimalValue;
  }

  const horizon = nthOccurrence(start, freq, input.termPeriods + 599);
  const occurrences: Occurrence[] = [];
  const pushRecurring = (
    startDate: ISODate,
    endDate: ISODate | undefined,
    recurFreq: Parameters<typeof nthOccurrence>[1],
    order: number,
    apply: Occurrence["apply"],
  ) => {
    const s = plainDate(startDate);
    const e = endDate ? plainDate(endDate) : horizon;
    for (let k = 0; ; k += 1) {
      const date = nthOccurrence(s, recurFreq, k);
      if (compareDates(date, e) > 0 || compareDates(date, horizon) > 0) break;
      occurrences.push({ date: isoDate(date), order, apply });
      if (k > 5000) break;
    }
  };

  for (const event of events) {
    switch (event.type) {
      case "rate_change":
        occurrences.push({
          date: event.effectiveDate,
          order: 1,
          apply: (s) => {
            s.rate = d(event.annualRate);
            s.rateChanged = true;
          },
        });
        break;
      case "offset_deposit":
        occurrences.push({ date: event.effectiveDate, order: 2, apply: (s) => void (s.offset = s.offset.plus(d(event.amount)) as DecimalValue) });
        break;
      case "offset_withdrawal":
        occurrences.push({
          date: event.effectiveDate,
          order: 2,
          apply: (s) => void (s.offset = (Dec.max(zero, s.offset.minus(d(event.amount))) as DecimalValue)),
        });
        break;
      case "offset_deposit_recurring":
        pushRecurring(event.startDate, event.endDate, freq, 2, (s) => void (s.offset = s.offset.plus(d(event.amount)) as DecimalValue));
        break;
      case "extra_oneoff":
        occurrences.push({
          date: event.effectiveDate,
          order: 4,
          apply: (s) => void (s.pendingExtra = s.pendingExtra.plus(d(event.amount)) as DecimalValue),
        });
        break;
      case "fee_oneoff":
        occurrences.push({
          date: event.effectiveDate,
          order: 5,
          apply: (s) => {
            if (event.financed) s.financedFees = s.financedFees.plus(d(event.amount)) as DecimalValue;
            else s.cashFees = s.cashFees.plus(d(event.amount)) as DecimalValue;
          },
        });
        break;
      case "fee_annual":
        pushRecurring(event.startDate, undefined, { kind: "annually" }, 5, (s) => {
          if (event.financed) s.financedFees = s.financedFees.plus(d(event.amount)) as DecimalValue;
          else s.cashFees = s.cashFees.plus(d(event.amount)) as DecimalValue;
        });
        break;
      case "extra_recurring":
        // handled per-period below (aligned to repayment periods, MORT-AC-003)
        break;
    }
  }
  occurrences.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order));

  const extraRecurring = events.filter((e): e is Extract<LedgerEvent, { type: "extra_recurring" }> => e.type === "extra_recurring");

  const opening = d(input.openingPrincipal);
  const initialPayment =
    input.paymentOverride !== undefined
      ? d(input.paymentOverride)
      : ioPeriods >= input.termPeriods
        ? cents(opening.times(d(input.annualRate).div(ppy)) as DecimalValue)
        : cents(amortisingPayment(opening, d(input.annualRate).div(ppy) as DecimalValue, input.termPeriods - ioPeriods));

  const state: State = {
    balance: opening,
    offset: d(input.offsetOpeningBalance ?? "0"),
    rate: d(input.annualRate),
    payment: initialPayment,
    rateChanged: false,
    cashFees: zero,
    financedFees: zero,
    pendingExtra: zero,
  };

  const rows: LedgerRow[] = [];
  let occurrenceIndex = 0;
  let totalInterest = zero;
  let totalFees = zero;
  let totalPaid = zero;
  let financedFeesTotal = zero;
  let principalPaid = zero;
  let payoffDate: ISODate | null = null;
  let negativeAmortisation = false;
  const maxPeriods = input.termPeriods + 600;

  for (let k = 1; k <= maxPeriods && state.balance.greaterThan("0.004"); k += 1) {
    const periodDate = isoDate(nthOccurrence(start, freq, k - 1));
    state.cashFees = zero;
    state.financedFees = zero;
    state.rateChanged = false;

    // Apply dated occurrences due on or before this period date (§11.5 order).
    while (occurrenceIndex < occurrences.length && occurrences[occurrenceIndex]!.date <= periodDate) {
      occurrences[occurrenceIndex]!.apply(state);
      occurrenceIndex += 1;
    }

    const inIo = k <= ioPeriods;
    const remaining = input.termPeriods - k + 1;
    if ((state.rateChanged || k === ioPeriods + 1) && !inIo) {
      if (input.repaymentResetPolicy === "recalculate_to_term" || k === ioPeriods + 1) {
        if (input.paymentOverride === undefined) {
          state.payment = cents(
            amortisingPayment(state.balance, state.rate.div(ppy) as DecimalValue, Math.max(1, remaining)),
          );
        }
      }
    }

    // Financed fees capitalise before interest accrues this period.
    state.balance = state.balance.plus(state.financedFees) as DecimalValue;
    financedFeesTotal = financedFeesTotal.plus(state.financedFees) as DecimalValue;

    const interestBase = (Dec.max(zero, state.balance.minus(state.offset.times(effectiveness))) as DecimalValue);
    const interest = cents(interestBase.times(state.rate.div(ppy)) as DecimalValue);

    let payment = inIo ? interest : state.payment;
    let extra = state.pendingExtra;
    state.pendingExtra = zero;
    for (const recurring of extraRecurring) {
      if (periodDate >= recurring.startDate && (!recurring.endDate || periodDate <= recurring.endDate) && !inIo) {
        extra = extra.plus(d(recurring.amount)) as DecimalValue;
      }
    }

    const owed = state.balance.plus(interest) as DecimalValue;
    let last = false;
    if (payment.plus(extra).greaterThanOrEqualTo(owed)) {
      payment = (Dec.min(payment, owed) as DecimalValue);
      extra = (Dec.min(extra, owed.minus(payment) as DecimalValue) as DecimalValue);
      last = true;
    } else if (k === input.termPeriods) {
      const required = cents(owed);
      const clearingCap = state.payment.times(2) as DecimalValue;
      if (required.lessThanOrEqualTo(clearingCap)) {
        payment = required;
        extra = zero;
        last = true;
      }
    }

    if (!inIo && !last && payment.lessThan(interest)) negativeAmortisation = true;

    const principalPart = payment.plus(extra).minus(interest) as DecimalValue;
    state.balance = cents(state.balance.minus(principalPart) as DecimalValue);
    if (state.balance.abs().lessThan("0.005")) state.balance = zero;

    totalInterest = totalInterest.plus(interest) as DecimalValue;
    const periodFees = state.cashFees.plus(state.financedFees) as DecimalValue;
    totalFees = totalFees.plus(periodFees) as DecimalValue;
    totalPaid = totalPaid.plus(payment).plus(extra).plus(state.cashFees) as DecimalValue;
    principalPaid = principalPaid.plus(principalPart) as DecimalValue;

    rows.push({
      period: k,
      date: periodDate,
      annualRate: state.rate.toString(),
      interest,
      payment,
      extraPayment: extra,
      fees: periodFees,
      offsetBalance: state.offset,
      closingBalance: state.balance,
    });
    if (state.balance.isZero() && payoffDate === null) payoffDate = periodDate;
    if (last) break;
    if (k >= input.termPeriods) break;
  }

  const closing = rows.length > 0 ? rows[rows.length - 1]!.closingBalance : opening;
  // §12.5.8: opening + financed fees + interest − payments − extras = closing.
  const reconstructed = opening
    .plus(financedFeesTotal)
    .minus(principalPaid) as DecimalValue;
  const difference = reconstructed.minus(closing) as DecimalValue;

  return {
    badge: "scheduled_model",
    rows,
    scheduledPaymentInitial: initialPayment,
    totalInterest: cents(totalInterest),
    totalFees: cents(totalFees),
    totalPaid: cents(totalPaid),
    payoffDate,
    periodsUsed: rows.length,
    unresolvedBalance: closing.greaterThan("0.004") ? closing : null,
    negativeAmortisation,
    finalOffsetBalance: rows.length > 0 ? rows[rows.length - 1]!.offsetBalance : d(input.offsetOpeningBalance ?? "0"),
    reconciliation: {
      opening,
      interestCharged: cents(totalInterest),
      financedFees: cents(financedFeesTotal),
      principalPaid: cents(principalPaid),
      closing,
      difference: cents(difference),
      passed: difference.abs().lessThanOrEqualTo("0.05"),
    },
  };
}

/** Interest and time saved versus a baseline without offsets/extras. */
export function compareToBaseline(input: LedgerInput): {
  scenario: LedgerResult;
  baseline: LedgerResult;
  interestSaved: DecimalValue;
  periodsSaved: number;
} {
  const scenario = runLedger(input);
  const baseline = runLedger({
    ...input,
    offsetOpeningBalance: "0",
    events: (input.events ?? []).filter(
      (e) =>
        e.type !== "extra_recurring" &&
        e.type !== "extra_oneoff" &&
        e.type !== "offset_deposit" &&
        e.type !== "offset_deposit_recurring" &&
        e.type !== "offset_withdrawal",
    ),
  });
  return {
    scenario,
    baseline,
    interestSaved: baseline.totalInterest.minus(scenario.totalInterest) as DecimalValue,
    periodsSaved: baseline.periodsUsed - scenario.periodsUsed,
  };
}
