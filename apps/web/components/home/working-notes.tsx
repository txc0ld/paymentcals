import type { ReactNode } from "react";

/**
 * C3 working copy for the mortgage cluster. The steps are the §13 formula
 * lines the engines actually run (already carried as comments in
 * engine-mortgage-ledger) and the limitations are the model's stated bounds.
 *
 * No `sources` are supplied anywhere here: every mortgage route reports
 * "No statutory rules required", so no rule pack participates in the result
 * and there is nothing to cite (non-negotiable #1).
 */

export const FIRST_REPAYMENT_DATE = "2026-10-01";

/** The window every dated event control on these routes is bounded to. */
export const EVENT_DATE_MIN = FIRST_REPAYMENT_DATE;
export const EVENT_DATE_MAX = "2056-10-01";

const LEDGER_STEPS: ReactNode[] = [
  "§13.5 payment — the scheduled repayment solves P = B·i ÷ (1 − (1 + i)^−n) from the balance B, the periodic rate i and the remaining periods n.",
  "§13.7 recurrence — each period: interest = accruing balance × i, then closing = opening + interest + fees − payment − extra repayment.",
  "§13.9 offset — interest accrues on max(0, balance − offset × effectiveness), floored at zero; offset cash is never a principal repayment.",
  "§12.5.8 reconciliation — the ledger identity is checked on every period. A reconciliation failure invalidates the result rather than warning about it.",
];

const LEDGER_ASSUMPTIONS = [
  "Interest accrues once per repayment period on the payment-period ledger. Daily accrual is not modelled at P0.",
  "The first repayment falls on 1 October 2026; every date in the schedule follows from that and the repayment frequency.",
  "The rate is held constant except where a dated rate-change event moves it.",
  "Weekly, fortnightly and monthly frequencies use 52, 26 and 12 periods per year.",
];

const LEDGER_LIMITATIONS = [
  "Lender daily accrual, transaction timing, fee timing and rounding can differ from this model; compare the settings with your loan contract and statements.",
  "Redraw availability, offset eligibility conditions, break costs and any lender fee that was not entered are not modelled.",
  "Amounts beyond the entered term are not projected; a balance left unpaid at term is reported rather than extended.",
];

export interface WorkingContent {
  summary: ReactNode;
  steps: ReactNode[];
  assumptions: string[];
  limitations: string[];
}

const SUMMARIES: Record<string, ReactNode> = {
  "AU-HOME-001":
    "The repayment comes from the §13.5 closed form, then every period is written out as a ledger row so the interest total, the payoff date and the schedule all come from the same run.",
  "AU-HOME-002":
    "One scheduled ledger carries your dated events — rate changes, extra repayments, offset movements and fees — in date order, and each period is reconciled before it is reported.",
  "AU-HOME-004":
    "Two ledgers run on identical dates: one with your extra repayments, one without. The difference between their interest totals and their period counts is what is reported as saved.",
  "AU-HOME-006":
    "Two ledgers run on identical dates: one with the offset balance and deposits, one with neither. Offset cash reduces the interest-bearing balance under §13.9 while staying yours to withdraw.",
  "AU-HOME-007":
    "Two ledgers run from the same loan: one where the rate changes on the effective date, one where it never moves. The repayment shown is the first scheduled repayment on or after that date.",
  "AU-HOME-012":
    "Both loans are run as full ledgers and compared on cumulative cash flow with residual balances included at the common horizon (§13.10). Repayments alone are never the comparison.",
};

export function workingContentFor(calculatorId: string, extraSteps: ReactNode[] = []): WorkingContent {
  return {
    summary: SUMMARIES[calculatorId] ?? SUMMARIES["AU-HOME-001"],
    steps: [...LEDGER_STEPS, ...extraSteps],
    assumptions: LEDGER_ASSUMPTIONS,
    limitations: LEDGER_LIMITATIONS,
  };
}

/** §13.10 — the extra line the refinance comparison adds on top of the ledger. */
export const REFINANCE_STEP: ReactNode =
  "§13.10 economic position — cumulative payments and fees of each loan, net of upfront switching costs and any counted cashback, plus the residual-balance difference at the common horizon.";

/** §12.6 — the line that keeps offset cash and principal legally distinct. */
export const OFFSET_STEP: ReactNode =
  "§12.6 offset vs principal — a deposit to offset lowers the accruing balance but not the debt; an extra repayment lowers the debt and cannot be withdrawn unless redraw allows it.";
