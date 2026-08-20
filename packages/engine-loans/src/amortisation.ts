import {
  Dec,
  isoDate,
  nthOccurrence,
  plainDate,
  type DecimalValue,
  type Frequency,
  type ISODate,
} from "@paymentcalcs/calculation-core";

/**
 * E11 — amortising loan engine. Decimal arithmetic in dollars; results are
 * rounded to cents once per period (contract-setting, disclosed) with the
 * final payment adjusted so the closing balance is exactly zero (§13.5).
 */

export type LoanFrequencyKind = "weekly" | "fortnightly" | "monthly";

const PERIODS_PER_YEAR: Record<LoanFrequencyKind, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
};

export function frequencyOf(kind: LoanFrequencyKind): Frequency {
  return kind === "monthly" ? { kind: "monthly" } : { kind };
}

/** §13.5 closed-form payment; §13.6 with a residual balloon. */
export function amortisingPayment(
  principal: DecimalValue,
  periodicRate: DecimalValue,
  periods: number,
  balloon: DecimalValue = new Dec(0) as DecimalValue,
): DecimalValue {
  if (periods <= 0) return principal;
  if (periodicRate.isZero()) {
    return principal.minus(balloon).div(periods) as DecimalValue;
  }
  const onePlus = new Dec(1).plus(periodicRate);
  const discounted = balloon.div(onePlus.pow(periods));
  const numerator = principal.minus(discounted).times(periodicRate);
  const denominator = new Dec(1).minus(onePlus.pow(-periods));
  return numerator.div(denominator) as DecimalValue;
}

export interface LoanScheduleRow {
  period: number;
  date: ISODate;
  payment: DecimalValue;
  interest: DecimalValue;
  principal: DecimalValue;
  extraPayment: DecimalValue;
  fees: DecimalValue;
  closingBalance: DecimalValue;
}

export interface LoanScheduleInput {
  principal: DecimalValue;
  annualRate: DecimalValue;
  termPeriods: number;
  frequency: LoanFrequencyKind;
  firstPaymentDate: ISODate;
  repaymentType: "principal_and_interest" | "interest_only";
  interestOnlyPeriods?: number;
  balloon?: DecimalValue;
  /** Recurring fee charged every period (e.g. monthly service fee). */
  periodicFee?: DecimalValue;
  /** Fixed payment override (e.g. user-entered repayment). */
  paymentOverride?: DecimalValue;
  /** Recurring extra repayment per period. */
  extraPerPeriod?: DecimalValue;
}

export interface LoanScheduleResult {
  rows: LoanScheduleRow[];
  scheduledPayment: DecimalValue;
  totalInterest: DecimalValue;
  totalPrincipal: DecimalValue;
  totalFees: DecimalValue;
  totalPaid: DecimalValue;
  payoffDate: ISODate | null;
  /** True when payments do not cover interest (§13.7 warning state). */
  negativeAmortisation: boolean;
  /** Non-null when the schedule ended with balance unpaid (non-amortising). */
  unresolvedBalance: DecimalValue | null;
  reconciliation: {
    opening: DecimalValue;
    totalPrincipalPaid: DecimalValue;
    closing: DecimalValue;
    difference: DecimalValue;
    passed: boolean;
  };
}

const cents = (v: DecimalValue): DecimalValue =>
  v.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue;

/** §13.7 recurrence with per-period cent rounding and final-payment adjustment. */
export function buildLoanSchedule(input: LoanScheduleInput): LoanScheduleResult {
  const zero = new Dec(0) as DecimalValue;
  const periodicRate = input.annualRate.div(PERIODS_PER_YEAR[input.frequency]) as DecimalValue;
  const ioPeriods =
    input.repaymentType === "interest_only"
      ? (input.interestOnlyPeriods ?? input.termPeriods)
      : (input.interestOnlyPeriods ?? 0);
  const amortPeriods = input.termPeriods - ioPeriods;
  const balloon = input.balloon ?? zero;

  const scheduledPayment =
    input.paymentOverride ??
    (amortPeriods > 0
      ? cents(amortisingPayment(input.principal, periodicRate, amortPeriods, balloon))
      : cents(input.principal.times(periodicRate) as DecimalValue));

  const start = plainDate(input.firstPaymentDate);
  const freq = frequencyOf(input.frequency);
  const rows: LoanScheduleRow[] = [];
  let balance = input.principal;
  let totalInterest = zero;
  let totalFees = zero;
  let totalPaid = zero;
  let negativeAmortisation = false;
  let payoffDate: ISODate | null = null;
  const maxPeriods = input.termPeriods + 600; // guard runaway non-amortising loops

  for (let k = 1; k <= maxPeriods && balance.greaterThan("0.004"); k += 1) {
    const inIo = k <= ioPeriods;
    const interest = cents(balance.times(periodicRate) as DecimalValue);
    const fee = cents(input.periodicFee ?? zero);
    let extra = inIo ? zero : cents(input.extraPerPeriod ?? zero);
    const isFinalScheduled = k === input.termPeriods;

    let payment: DecimalValue;
    let last = false;
    if (inIo) {
      payment = interest;
    } else if (isFinalScheduled) {
      // Final-payment adjustment covers accumulated rounding and the balloon
      // (§13.5). It must never silently clear a non-amortising balance, so the
      // clearing payment is capped at one extra scheduled payment beyond the
      // balloon; anything larger is reported as unresolved.
      const required = cents(balance.plus(interest) as DecimalValue);
      const clearingCap = scheduledPayment.times(2).plus(balloon) as DecimalValue;
      if (required.lessThanOrEqualTo(clearingCap)) {
        payment = required;
        extra = zero;
        last = true;
      } else {
        payment = scheduledPayment;
      }
    } else {
      payment = scheduledPayment;
    }

    // Never overpay: cap payment + extra at balance + interest.
    const owed = balance.plus(interest) as DecimalValue;
    if (payment.plus(extra).greaterThan(owed)) {
      payment = (Dec.min(payment, owed) as DecimalValue);
      extra = (Dec.min(extra, owed.minus(payment) as DecimalValue) as DecimalValue);
      last = true;
    }

    if (!inIo && !last && payment.lessThan(interest)) negativeAmortisation = true;

    const principalPart = payment.plus(extra).minus(interest) as DecimalValue;
    balance = cents(balance.minus(principalPart) as DecimalValue);
    if (balance.abs().lessThan("0.005")) balance = zero;
    totalInterest = totalInterest.plus(interest) as DecimalValue;
    totalFees = totalFees.plus(fee) as DecimalValue;
    totalPaid = totalPaid.plus(payment).plus(extra).plus(fee) as DecimalValue;
    const date = isoDate(nthOccurrence(start, freq, k - 1));
    rows.push({
      period: k,
      date,
      payment,
      interest,
      principal: principalPart,
      extraPayment: extra,
      fees: fee,
      closingBalance: balance,
    });
    if (balance.isZero() && payoffDate === null) payoffDate = date;
    if (last) break;
    if (k >= input.termPeriods) break; // past contractual term: report unresolved
  }

  const closing = rows.length > 0 ? rows[rows.length - 1]!.closingBalance : input.principal;
  const totalPrincipalPaid = rows.reduce(
    (acc, row) => acc.plus(row.principal) as DecimalValue,
    zero,
  );
  const difference = input.principal.minus(totalPrincipalPaid).minus(closing) as DecimalValue;

  return {
    rows,
    scheduledPayment,
    totalInterest: cents(totalInterest),
    totalPrincipal: cents(totalPrincipalPaid),
    totalFees: cents(totalFees),
    totalPaid: cents(totalPaid),
    payoffDate,
    negativeAmortisation,
    unresolvedBalance: closing.greaterThan("0.004") ? closing : null,
    reconciliation: {
      opening: input.principal,
      totalPrincipalPaid: cents(totalPrincipalPaid),
      closing,
      difference: cents(difference),
      passed: difference.abs().lessThanOrEqualTo("0.02"),
    },
  };
}
