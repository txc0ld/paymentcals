import type { LedgerResult } from "@paymentcalcs/engine-mortgage-ledger";
import type { RefinanceComparison } from "@paymentcalcs/engine-mortgage-ledger";

/**
 * Structured-clone-safe forms of the ledger results (Decimal instances do not
 * survive postMessage). All amounts are major-unit decimal strings.
 */
export interface SLedgerRow {
  period: number;
  date: string;
  annualRate: string;
  interest: string;
  payment: string;
  extraPayment: string;
  fees: string;
  offsetBalance: string;
  closingBalance: string;
}

export interface SLedgerResult {
  badge: "scheduled_model";
  rows: SLedgerRow[];
  scheduledPaymentInitial: string;
  totalInterest: string;
  totalFees: string;
  totalPaid: string;
  payoffDate: string | null;
  periodsUsed: number;
  unresolvedBalance: string | null;
  negativeAmortisation: boolean;
  finalOffsetBalance: string;
  reconciliationPassed: boolean;
}

export function serializeLedger(result: LedgerResult): SLedgerResult {
  return {
    badge: result.badge,
    rows: result.rows.map((row) => ({
      period: row.period,
      date: row.date,
      annualRate: row.annualRate,
      interest: row.interest.toFixed(2),
      payment: row.payment.toFixed(2),
      extraPayment: row.extraPayment.toFixed(2),
      fees: row.fees.toFixed(2),
      offsetBalance: row.offsetBalance.toFixed(2),
      closingBalance: row.closingBalance.toFixed(2),
    })),
    scheduledPaymentInitial: result.scheduledPaymentInitial.toFixed(2),
    totalInterest: result.totalInterest.toFixed(2),
    totalFees: result.totalFees.toFixed(2),
    totalPaid: result.totalPaid.toFixed(2),
    payoffDate: result.payoffDate,
    periodsUsed: result.periodsUsed,
    unresolvedBalance: result.unresolvedBalance?.toFixed(2) ?? null,
    negativeAmortisation: result.negativeAmortisation,
    finalOffsetBalance: result.finalOffsetBalance.toFixed(2),
    reconciliationPassed: result.reconciliation.passed,
  };
}

export interface SCompareResult {
  scenario: SLedgerResult;
  baseline: SLedgerResult;
  interestSaved: string;
  periodsSaved: number;
}

export interface SRefinanceResult {
  oldLoan: SLedgerResult;
  newLoan: SLedgerResult;
  repaymentDifference: string;
  upfrontNetSwitchingCost: string;
  cumulativeDelta: Array<{ date: string; delta: string }>;
  breakEvenDate: string | null;
  reversalsAfterBreakEven: number;
  horizonDate: string | null;
  economicAdvantageAtHorizon: string;
}

export function serializeRefinance(result: RefinanceComparison): SRefinanceResult {
  return {
    oldLoan: serializeLedger(result.oldLoan),
    newLoan: serializeLedger(result.newLoan),
    repaymentDifference: result.repaymentDifference.toFixed(2),
    upfrontNetSwitchingCost: result.upfrontNetSwitchingCost.toFixed(2),
    cumulativeDelta: result.cumulativeDelta.map((point) => ({
      date: point.date,
      delta: point.delta.toFixed(2),
    })),
    breakEvenDate: result.breakEvenDate,
    reversalsAfterBreakEven: result.reversalsAfterBreakEven,
    horizonDate: result.horizonDate,
    economicAdvantageAtHorizon: result.economicAdvantageAtHorizon.toFixed(2),
  };
}
