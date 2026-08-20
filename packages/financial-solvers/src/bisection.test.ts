import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { DecimalValue } from "@paymentcalcs/calculation-core";
import { bisect, defaultSolverOptions } from "./bisection";

describe("bisection (§13.28 safeguards)", () => {
  it("solves a smooth monotone objective to tolerance", () => {
    // f(x) = 0.7x − 70,000 → root at 100,000.
    const result = bisect((x) => x.times("0.7").minus(70000) as DecimalValue, defaultSolverOptions(0, 1_000_000));
    expect(result.status).toBe("converged");
    if (result.status === "converged") {
      expect(Number(result.value.toFixed(2))).toBeCloseTo(100000, 1);
      expect(result.discontinuity).toBe(false);
      expect(result.trace.length).toBeGreaterThan(5);
    }
  });

  it("reports unattainable targets instead of returning a plausible number", () => {
    const above = bisect((x) => x.times("0.5").minus(10_000_000) as DecimalValue, defaultSolverOptions(0, 1000));
    expect(above.status).toBe("unattainable");
    if (above.status === "unattainable") expect(above.reason).toBe("target_above_range");

    const below = bisect((x) => x.plus(50) as DecimalValue, defaultSolverOptions(0, 1000));
    expect(below.status).toBe("unattainable");
    if (below.status === "unattainable") expect(below.reason).toBe("target_below_range");
  });

  it("flags discontinuities and returns the smallest value meeting the target", () => {
    // Step function: f(x) = floor(x) − 99.5 — no exact root; smallest x meeting
    // target is 100.
    const result = bisect((x) => x.floor().minus("99.5") as DecimalValue, defaultSolverOptions(0, 1000));
    expect(result.status).toBe("converged");
    if (result.status === "converged") {
      expect(result.discontinuity).toBe(true);
      expect(result.residual.greaterThanOrEqualTo(0)).toBe(true);
      expect(Number(result.value.toFixed(0))).toBe(100);
    }
  });

  it("round-trips: solved input re-fed forward hits the target within tolerance", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 900_000 }), (target) => {
        const forward = (x: DecimalValue) =>
          x.times("0.68").plus(x.greaterThan(45_000) ? -1234 : 0) as DecimalValue;
        const result = bisect(
          (x) => forward(x).minus(target) as DecimalValue,
          defaultSolverOptions(0, 10_000_000),
        );
        expect(result.status).toBe("converged");
        if (result.status === "converged") {
          const recomputed = forward(result.value);
          expect(recomputed.minus(target).abs().lessThanOrEqualTo("1")).toBe(true);
        }
      }),
    );
  });
});
