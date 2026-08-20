import { Dec, isoDate, nthOccurrence, plainDate, type DecimalValue, type ISODate } from "@paymentcalcs/calculation-core";

/**
 * E12 — revolving credit payoff (§12.11). Monthly statement cycles: interest
 * accrues on the cycle's opening balance at the applicable rate, the payment
 * is the greater of the chosen fixed payment and the minimum-payment rule,
 * and every cycle reconciles opening → closing.
 */

export interface CreditCardInput {
  balance: string;
  annualPurchaseRate: string;
  /** Minimum payment: max(percentOfBalance × balance, floorAmount). */
  minimumPercent: string;
  minimumFloor: string;
  /** Fixed payment chosen by the user; the engine pays max(fixed, minimum). */
  fixedPayment?: string;
  monthlyFee?: string;
  /** Promotional rate until (exclusive) the given cycle date. */
  promotionalRate?: string;
  promotionalEndDate?: ISODate;
  newSpendingPerMonth?: string;
  firstCycleDate: ISODate;
  /** "minimum_only" pays just the minimum each cycle. */
  strategy: "minimum_only" | "fixed_payment";
}

export interface CreditCardCycle {
  cycle: number;
  date: ISODate;
  rateApplied: string;
  interest: DecimalValue;
  fee: DecimalValue;
  spending: DecimalValue;
  minimumPayment: DecimalValue;
  payment: DecimalValue;
  closingBalance: DecimalValue;
}

export interface CreditCardResult {
  cycles: CreditCardCycle[];
  payoffDate: ISODate | null;
  totalInterest: DecimalValue;
  totalFees: DecimalValue;
  totalPaid: DecimalValue;
  firstMinimumPayment: DecimalValue;
  monthsToPayoff: number | null;
  nonAmortising: boolean;
  reconciliationPassed: boolean;
}

const cents = (v: DecimalValue): DecimalValue => v.toDecimalPlaces(2, Dec.ROUND_HALF_UP) as DecimalValue;
const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;

const MAX_CYCLES = 1200; // 100 years guard

export function simulateCreditCard(input: CreditCardInput): CreditCardResult {
  const zero = d(0);
  let balance = d(input.balance);
  const start = plainDate(input.firstCycleDate);
  const cycles: CreditCardCycle[] = [];
  let totalInterest = zero;
  let totalFees = zero;
  let totalPaid = zero;
  let payoffDate: ISODate | null = null;
  let nonAmortising = false;
  let firstMinimum: DecimalValue | null = null;
  let reconciliationPassed = true;

  for (let k = 1; k <= MAX_CYCLES && balance.greaterThan("0.004"); k += 1) {
    const date = isoDate(nthOccurrence(start, { kind: "monthly" }, k - 1));
    const promoActive =
      input.promotionalRate !== undefined &&
      input.promotionalEndDate !== undefined &&
      date < input.promotionalEndDate;
    const annualRate = promoActive ? input.promotionalRate! : input.annualPurchaseRate;
    const monthlyRate = d(annualRate).div(12) as DecimalValue;

    const opening = balance;
    const spending = cents(d(input.newSpendingPerMonth ?? "0"));
    const interest = cents(opening.times(monthlyRate) as DecimalValue);
    const fee = cents(d(input.monthlyFee ?? "0"));
    balance = balance.plus(spending).plus(interest).plus(fee) as DecimalValue;

    const minimum = cents(
      (Dec.max(balance.times(d(input.minimumPercent)), d(input.minimumFloor)) as DecimalValue),
    );
    if (firstMinimum === null) firstMinimum = (Dec.min(minimum, balance) as DecimalValue);

    let payment =
      input.strategy === "fixed_payment" && input.fixedPayment
        ? (Dec.max(d(input.fixedPayment), minimum) as DecimalValue)
        : minimum;
    payment = (Dec.min(payment, balance) as DecimalValue);

    if (payment.lessThanOrEqualTo(interest.plus(fee).plus(spending))) nonAmortising = true;

    const closing = cents(balance.minus(payment) as DecimalValue);
    const reconstructed = opening.plus(spending).plus(interest).plus(fee).minus(payment);
    if (reconstructed.minus(closing).abs().greaterThan("0.011")) reconciliationPassed = false;

    balance = closing.abs().lessThan("0.005") ? zero : closing;
    totalInterest = totalInterest.plus(interest) as DecimalValue;
    totalFees = totalFees.plus(fee) as DecimalValue;
    totalPaid = totalPaid.plus(payment) as DecimalValue;

    cycles.push({
      cycle: k,
      date,
      rateApplied: annualRate,
      interest,
      fee,
      spending,
      minimumPayment: minimum,
      payment,
      closingBalance: balance,
    });
    if (balance.isZero()) {
      payoffDate = date;
      break;
    }
  }

  return {
    cycles,
    payoffDate,
    totalInterest: cents(totalInterest),
    totalFees: cents(totalFees),
    totalPaid: cents(totalPaid),
    firstMinimumPayment: cents(firstMinimum ?? zero),
    monthsToPayoff: payoffDate ? cycles.length : null,
    nonAmortising,
    reconciliationPassed,
  };
}
