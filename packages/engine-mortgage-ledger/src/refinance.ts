import { Dec, type DecimalValue, type ISODate } from "@paymentcalcs/calculation-core";
import { runLedger, type LedgerInput, type LedgerResult } from "./ledger";

/**
 * AU-HOME-012 (§12.7, §13.10): cumulative-cash-flow refinance comparison.
 * Scenarios are compared at a common horizon with residual balances included;
 * comparing monthly repayments alone is prohibited by the PRD.
 */

export interface RefinanceCosts {
  /** Paid in cash at switch (discharge, establishment, legal, valuation…). */
  upfrontCash: string;
  /** Costs added to the new loan principal (accrue interest, §12.7 AC). */
  financedCosts: string;
  /** Cashback received; applied at its received date, never earlier. */
  cashback: string;
  cashbackDate?: ISODate;
  /** Ongoing annual fee difference is modelled via each loan's fee events. */
}

export interface RefinanceComparison {
  oldLoan: LedgerResult;
  newLoan: LedgerResult;
  repaymentDifference: DecimalValue;
  upfrontNetSwitchingCost: DecimalValue;
  /** Cumulative net cash advantage of switching, by period date. */
  cumulativeDelta: Array<{ date: ISODate; delta: DecimalValue }>;
  /** First crossing where the advantage stays non-negative (§13.10). */
  breakEvenDate: ISODate | null;
  /** Later reversals after the first sustainable crossing (disclosed). */
  reversalsAfterBreakEven: number;
  /** Economic cost difference at the common horizon incl. residual balances. */
  horizonDate: ISODate | null;
  economicAdvantageAtHorizon: DecimalValue;
}

const d = (s: string | number): DecimalValue => new Dec(s) as DecimalValue;

export function compareRefinance(
  oldInput: LedgerInput,
  newInputBase: LedgerInput,
  costs: RefinanceCosts,
): RefinanceComparison {
  const financed = d(costs.financedCosts);
  const newInput: LedgerInput = {
    ...newInputBase,
    openingPrincipal: d(newInputBase.openingPrincipal).plus(financed).toFixed(2),
  };

  const oldLoan = runLedger(oldInput);
  const newLoan = runLedger(newInput);

  const horizon = Math.min(oldLoan.rows.length, newLoan.rows.length);
  const upfront = d(costs.upfrontCash);
  const cashback = d(costs.cashback);

  const cumulativeDelta: Array<{ date: ISODate; delta: DecimalValue }> = [];
  let oldCum = d(0);
  let newCum = upfront; // cash paid at switch counts against the new scenario
  let cashbackApplied = false;

  for (let i = 0; i < horizon; i += 1) {
    const oldRow = oldLoan.rows[i]!;
    const newRow = newLoan.rows[i]!;
    oldCum = oldCum.plus(oldRow.payment).plus(oldRow.extraPayment).plus(oldRow.fees) as DecimalValue;
    newCum = newCum.plus(newRow.payment).plus(newRow.extraPayment).plus(newRow.fees) as DecimalValue;
    if (!cashbackApplied && (!costs.cashbackDate || newRow.date >= costs.cashbackDate)) {
      newCum = newCum.minus(cashback) as DecimalValue;
      cashbackApplied = true;
    }
    // §13.10: break-even runs on cumulative cash flows; residual balances
    // enter only at the common horizon (added after this loop).
    const delta = oldCum.minus(newCum) as DecimalValue;
    cumulativeDelta.push({ date: newRow.date, delta });
  }

  // §13.10: the primary break-even is the first crossing that stays
  // non-negative; earlier temporary crossings are disclosed as reversals.
  let breakEvenDate: ISODate | null = null;
  let reversals = 0;
  let allNonNegativeAfter = true;
  const sustainable: boolean[] = new Array(cumulativeDelta.length).fill(false);
  for (let i = cumulativeDelta.length - 1; i >= 0; i -= 1) {
    allNonNegativeAfter = allNonNegativeAfter && cumulativeDelta[i]!.delta.greaterThanOrEqualTo(0);
    sustainable[i] = allNonNegativeAfter;
  }
  let inRun = false;
  for (let i = 0; i < cumulativeDelta.length; i += 1) {
    const nonNegative = cumulativeDelta[i]!.delta.greaterThanOrEqualTo(0);
    if (sustainable[i]) {
      breakEvenDate = cumulativeDelta[i]!.date;
      break;
    }
    if (nonNegative && !inRun) reversals += 1; // a temporary crossing began
    inRun = nonNegative;
  }

  const lastDelta = cumulativeDelta.length > 0 ? cumulativeDelta[cumulativeDelta.length - 1]! : null;
  // Economic position at the common horizon: cash advantage plus the residual
  // balance difference (old still owed minus new still owed).
  const economicAtHorizon =
    lastDelta === null || horizon === 0
      ? d(0)
      : (lastDelta.delta
          .plus(oldLoan.rows[horizon - 1]!.closingBalance)
          .minus(newLoan.rows[horizon - 1]!.closingBalance) as DecimalValue);

  return {
    oldLoan,
    newLoan,
    repaymentDifference: oldLoan.scheduledPaymentInitial.minus(newLoan.scheduledPaymentInitial) as DecimalValue,
    upfrontNetSwitchingCost: upfront.plus(financed).minus(cashback) as DecimalValue,
    cumulativeDelta,
    breakEvenDate,
    reversalsAfterBreakEven: reversals,
    horizonDate: lastDelta?.date ?? null,
    economicAdvantageAtHorizon: economicAtHorizon,
  };
}
