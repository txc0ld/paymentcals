"use client";

import { MoneyField, SelectField, ToggleField } from "@paymentcalcs/calculation-ui";
import { moneyToDecimalString } from "@paymentcalcs/calculation-core";
import type { LoanFrequencyKind } from "@paymentcalcs/engine-loans";
import { parseMoneyInput } from "../../lib/money-input";

export interface LoanBasicsState {
  principalRaw: string;
  ratePctRaw: string;
  termYearsRaw: string;
  frequency: LoanFrequencyKind;
  interestOnly: boolean;
  ioYearsRaw: string;
}

export const LOAN_BASICS_DEFAULTS: LoanBasicsState = {
  principalRaw: "",
  ratePctRaw: "",
  termYearsRaw: "30",
  frequency: "monthly",
  interestOnly: false,
  ioYearsRaw: "5",
};

export const PPY: Record<LoanFrequencyKind, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

export interface ParsedLoanBasics {
  principal: string;
  annualRate: string;
  termPeriods: number;
  ioPeriods: number;
  frequency: LoanFrequencyKind;
  errors: Record<string, string>;
  ok: boolean;
}

export function parseLoanBasics(state: LoanBasicsState): ParsedLoanBasics {
  const errors: Record<string, string> = {};
  const principal = parseMoneyInput(state.principalRaw);
  if (!principal.ok) {
    if (principal.error) errors.principal = principal.error;
  } else if (principal.money.minorUnits.startsWith("-")) {
    errors.principal = "The loan amount must be positive.";
  }
  if (!/^\d+(\.\d+)?$/.test(state.ratePctRaw.trim())) {
    errors.rate = "Enter the annual rate as a percentage, like 5.99.";
  } else if (Number.parseFloat(state.ratePctRaw) > 30) {
    errors.rate = "Rates above 30% are outside this calculator's domain.";
  }
  if (!/^\d+(\.\d+)?$/.test(state.termYearsRaw.trim()) || Number.parseFloat(state.termYearsRaw) <= 0 || Number.parseFloat(state.termYearsRaw) > 40) {
    errors.term = "Term must be between 1 and 40 years.";
  }
  if (state.interestOnly && (!/^\d+$/.test(state.ioYearsRaw.trim()) || Number.parseInt(state.ioYearsRaw, 10) >= Number.parseFloat(state.termYearsRaw || "0"))) {
    errors.io = "Interest-only years must be a whole number shorter than the term.";
  }
  const ok = Object.keys(errors).length === 0 && principal.ok;
  const ppy = PPY[state.frequency];
  return {
    principal: principal.ok ? moneyToDecimalString(principal.money) : "0",
    annualRate: ok ? (Number.parseFloat(state.ratePctRaw) / 100).toString() : "0",
    termPeriods: ok ? Math.round(Number.parseFloat(state.termYearsRaw) * ppy) : 0,
    ioPeriods: ok && state.interestOnly ? Number.parseInt(state.ioYearsRaw, 10) * ppy : 0,
    frequency: state.frequency,
    errors,
    ok,
  };
}

export function LoanBasicsFields({
  state,
  onChange,
  errors,
}: {
  state: LoanBasicsState;
  onChange: (patch: Partial<LoanBasicsState>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-6">
      <MoneyField
        id="loan-principal"
        label="Loan amount"
        value={state.principalRaw}
        onChange={(principalRaw) => onChange({ principalRaw })}
        error={errors.principal}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="loan-rate" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            Interest rate % p.a.
          </label>
          <input
            id="loan-rate"
            inputMode="decimal"
            placeholder="5.99"
            value={state.ratePctRaw}
            onChange={(e) => onChange({ ratePctRaw: e.target.value })}
            aria-invalid={errors.rate ? true : undefined}
            className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
          />
          {errors.rate ? (
            <span role="alert" className="text-[12px] text-error">
              {errors.rate}
            </span>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="loan-term" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            Term (years)
          </label>
          <input
            id="loan-term"
            inputMode="decimal"
            value={state.termYearsRaw}
            onChange={(e) => onChange({ termYearsRaw: e.target.value })}
            aria-invalid={errors.term ? true : undefined}
            className="nexus-input min-h-11 bg-surface px-3 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
          />
          {errors.term ? (
            <span role="alert" className="text-[12px] text-error">
              {errors.term}
            </span>
          ) : null}
        </div>
      </div>
      <SelectField
        id="loan-frequency"
        label="Repayment frequency"
        value={state.frequency}
        onChange={(frequency) => onChange({ frequency })}
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "fortnightly", label: "Fortnightly" },
          { value: "weekly", label: "Weekly" },
        ]}
      />
      <ToggleField
        id="loan-io"
        label="Interest-only period"
        description="Repay interest only for the first years, then principal and interest."
        checked={state.interestOnly}
        onChange={(interestOnly) => onChange({ interestOnly })}
      />
      {state.interestOnly ? (
        <div className="grid gap-1.5">
          <label htmlFor="loan-io-years" className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2">
            Interest-only years
          </label>
          <input
            id="loan-io-years"
            inputMode="numeric"
            value={state.ioYearsRaw}
            onChange={(e) => onChange({ ioYearsRaw: e.target.value })}
            aria-invalid={errors.io ? true : undefined}
            className="nexus-input min-h-11 w-24 bg-surface px-3 text-center font-mono text-[15px] tabular-nums text-ink outline-none focus:border-focus"
          />
          {errors.io ? (
            <span role="alert" className="text-[12px] text-error">
              {errors.io}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
