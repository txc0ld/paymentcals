import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";

/**
 * E24 monotonic bisection with the §13.28 safeguards. The objective is
 * evaluated on exact decimals; a solver failure never degrades to a
 * plausible-looking number — callers receive a typed non-convergence result.
 */
export interface BisectionOptions {
  /** Inclusive search bounds for the unknown (e.g. gross salary in dollars). */
  lowerBound: DecimalValue;
  upperBound: DecimalValue;
  /** Absolute tolerance on the objective residual, in the result's unit. */
  absoluteTolerance: DecimalValue;
  /** Stop when the bracket width shrinks below this (defends discontinuities). */
  intervalTolerance: DecimalValue;
  maxIterations: number;
  /** "monotone_increasing": objective grows with the unknown (net vs gross). */
  monotonicity: "monotone_increasing" | "monotone_decreasing";
  /**
   * "smallest_meeting_target": return the smallest input whose objective meets
   * or exceeds zero (§12.2 rule 6); "nearest": return the closest bracket end.
   */
  preference: "smallest_meeting_target" | "nearest";
}

export interface BisectionTraceEntry {
  iteration: number;
  lower: string;
  upper: string;
  midpoint: string;
  residual: string;
}

export type BisectionResult =
  | {
      status: "converged";
      value: DecimalValue;
      residual: DecimalValue;
      iterations: number;
      trace: BisectionTraceEntry[];
      /** True when a discontinuity prevented exact equality (§13.15 rule 7). */
      discontinuity: boolean;
    }
  | {
      status: "unattainable";
      reason: "target_below_range" | "target_above_range";
      objectiveAtLower: DecimalValue;
      objectiveAtUpper: DecimalValue;
      trace: BisectionTraceEntry[];
    }
  | {
      status: "did_not_converge";
      iterations: number;
      lower: DecimalValue;
      upper: DecimalValue;
      trace: BisectionTraceEntry[];
    };

/**
 * Find x in [lower, upper] with objective(x) = 0, where objective is the
 * signed residual (calculated − target). The objective must be monotone in
 * the stated direction; every iteration re-runs the full forward calculation.
 */
export function bisect(
  objective: (x: DecimalValue) => DecimalValue,
  options: BisectionOptions,
): BisectionResult {
  const sign = options.monotonicity === "monotone_increasing" ? 1 : -1;
  let lower = options.lowerBound;
  let upper = options.upperBound;
  const trace: BisectionTraceEntry[] = [];

  const fLower = objective(lower);
  const fUpper = objective(upper);

  // Attainability (§13.28: unsatisfiable target reporting).
  const lowSide = sign > 0 ? fLower : fUpper;
  const highSide = sign > 0 ? fUpper : fLower;
  if (highSide.lessThan(0)) {
    return { status: "unattainable", reason: "target_above_range", objectiveAtLower: fLower, objectiveAtUpper: fUpper, trace };
  }
  if (lowSide.greaterThan(0)) {
    return { status: "unattainable", reason: "target_below_range", objectiveAtLower: fLower, objectiveAtUpper: fUpper, trace };
  }

  let best: { value: DecimalValue; residual: DecimalValue } | null = null;

  for (let iteration = 1; iteration <= options.maxIterations; iteration += 1) {
    const midpoint = lower.plus(upper).div(2) as DecimalValue;
    const residual = objective(midpoint);
    trace.push({
      iteration,
      lower: lower.toString(),
      upper: upper.toString(),
      midpoint: midpoint.toString(),
      residual: residual.toString(),
    });

    const meets = residual.greaterThanOrEqualTo(0);
    if (
      meets &&
      (best === null ||
        residual.abs().lessThan(best.residual.abs()) ||
        (residual.abs().equals(best.residual.abs()) && midpoint.lessThan(best.value)))
    ) {
      best = { value: midpoint, residual };
    }

    if (residual.abs().lessThanOrEqualTo(options.absoluteTolerance)) {
      return { status: "converged", value: midpoint, residual, iterations: iteration, trace, discontinuity: false };
    }

    if (residual.times(sign).lessThan(0)) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }

    if (upper.minus(lower).abs().lessThanOrEqualTo(options.intervalTolerance)) {
      // Interval exhausted without residual convergence: a discontinuity
      // (e.g. dollar-rounded withholding) sits inside the bracket. For the
      // smallest-meeting-target preference the collapsed upper bound is the
      // infimum of inputs meeting the target.
      const atUpper = objective(upper);
      const candidate =
        options.preference === "smallest_meeting_target"
          ? atUpper.times(sign).greaterThanOrEqualTo(0) || best === null
            ? { value: upper, residual: atUpper }
            : best
          : { value: upper, residual: atUpper };
      return {
        status: "converged",
        value: candidate.value,
        residual: candidate.residual,
        iterations: iteration,
        trace,
        discontinuity: true,
      };
    }
  }

  return { status: "did_not_converge", iterations: options.maxIterations, lower, upper, trace };
}

export function defaultSolverOptions(
  lowerBound: number,
  upperBound: number,
): BisectionOptions {
  return {
    lowerBound: new Dec(lowerBound) as DecimalValue,
    upperBound: new Dec(upperBound) as DecimalValue,
    absoluteTolerance: new Dec("0.005") as DecimalValue,
    intervalTolerance: new Dec("0.005") as DecimalValue,
    maxIterations: 200,
    monotonicity: "monotone_increasing",
    preference: "smallest_meeting_target",
  };
}
