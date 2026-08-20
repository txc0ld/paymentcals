import {
  moneyFromDecimalString,
  moneyToDecimal,
  type DecimalValue,
  type Money,
} from "@paymentcalcs/calculation-core";
import { bisect, defaultSolverOptions, type BisectionResult } from "@paymentcalcs/financial-solvers";
import { computeAuPay, type AuPayResolution } from "./engine";
import type { AuPayInput } from "./schema";

/**
 * AU-PAY-004 (§12.2, §13.15): solve the annual gross salary that produces a
 * target net annual cash amount by bisection over the full forward engine.
 */
export interface NetToGrossResult {
  status: "solved" | "unattainable" | "did_not_converge";
  grossAnnual: Money | null;
  achievedNetAnnual: Money | null;
  residual: Money | null;
  iterations: number;
  discontinuity: boolean;
  reason: string | null;
  solverTrace: BisectionResult["trace"];
}

export function solveGrossForNet(
  targetNetAnnual: Money,
  template: AuPayInput,
  resolution: AuPayResolution,
  bounds: { lower: number; upper: number } = { lower: 0, upper: 5_000_000 },
): NetToGrossResult {
  const target = moneyToDecimal(targetNetAnnual) as DecimalValue;

  const forwardNet = (grossAnnual: DecimalValue): DecimalValue => {
    const input: AuPayInput = {
      ...template,
      income: {
        ...template.income,
        amount: moneyFromDecimalString("AUD", grossAnnual.toFixed(2), 2),
        frequency: "annually",
      },
    };
    const { output } = computeAuPay(input, resolution);
    return moneyToDecimal(output.netAnnualCash) as DecimalValue;
  };

  const result = bisect(
    (gross) => forwardNet(gross).minus(target) as DecimalValue,
    { ...defaultSolverOptions(bounds.lower, bounds.upper) },
  );

  if (result.status === "unattainable") {
    return {
      status: "unattainable",
      grossAnnual: null,
      achievedNetAnnual: null,
      residual: null,
      iterations: 0,
      discontinuity: false,
      reason:
        result.reason === "target_above_range"
          ? "The target net income is not attainable within the gross search bounds."
          : "The target net income is below what the smallest gross in the search bounds produces.",
      solverTrace: result.trace,
    };
  }
  if (result.status === "did_not_converge") {
    return {
      status: "did_not_converge",
      grossAnnual: null,
      achievedNetAnnual: null,
      residual: null,
      iterations: result.iterations,
      discontinuity: false,
      reason: "The solver did not converge within its iteration limit.",
      solverTrace: result.trace,
    };
  }

  const achieved = forwardNet(result.value);
  return {
    status: "solved",
    grossAnnual: moneyFromDecimalString("AUD", result.value.toFixed(2), 2),
    achievedNetAnnual: moneyFromDecimalString("AUD", achieved.toFixed(2), 2),
    residual: moneyFromDecimalString(
      "AUD",
      (achieved.minus(target) as DecimalValue).toFixed(2),
      2,
    ),
    iterations: result.iterations,
    discontinuity: result.discontinuity,
    reason: null,
    solverTrace: result.trace,
  };
}

export const NET_TO_GROSS_TOLERANCE_NOTE =
  "Solves annual net cash under annual liability rules; pay-cycle withholding may differ.";
