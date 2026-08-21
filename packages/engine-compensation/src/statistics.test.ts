import { describe, expect, it } from "vitest";
import { Dec } from "@paymentcalcs/calculation-core";
import { incomePercentilesPack, superBalanceByAgePack, superGuaranteePacks, superThresholdsPack } from "@paymentcalcs/rules-au";
import {
  SuperThresholdUnavailableError,
  genderMix,
  incomePercentileFor,
  superBalanceCell,
  superBalanceSlice,
  superContributionSummary,
} from "./statistics";

const pct = incomePercentilesPack.rules;
const balances = superBalanceByAgePack.rules;
const thresholds = superThresholdsPack.rules;
const sg2627 = superGuaranteePacks.find((p) => p.rulePackId.endsWith("2026-27"))!.rules;

describe("incomePercentileFor", () => {
  it("boundary incomes land in the row whose verbatim range contains them", () => {
    const first = pct.percentiles[0]!;
    expect(incomePercentileFor(pct, "0").percentile).toBe(1);
    expect(incomePercentileFor(pct, first.upper!).percentile).toBe(1);
    const second = pct.percentiles[1]!;
    expect(incomePercentileFor(pct, String(Number(first.upper) + 1)).percentile).toBe(2);
    expect(incomePercentileFor(pct, second.upper!).percentile).toBe(2);
  });

  it("incomes beyond the top range land in percentile 100", () => {
    expect(incomePercentileFor(pct, "10000000").percentile).toBe(100);
  });

  it("gender mix sums to ~100 and share of net tax sums to ~1", () => {
    const mix = genderMix(incomePercentileFor(pct, "100000"));
    const sum = Number(mix.malePercent) + Number(mix.femalePercent);
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
    const totalShare = pct.percentiles.reduce((acc, row) => acc.plus(new Dec(row.shareOfNetTax)), new Dec(0));
    expect(totalShare.minus(1).abs().lessThan(new Dec("0.001"))).toBe(true);
  });
});

describe("super balance statistics", () => {
  it("finds a published cell verbatim and never fabricates a missing one", () => {
    const anyCell = balances.cells[0]!;
    const found = superBalanceCell(balances, anyCell.ageRange, anyCell.sex, anyCell.taxableIncomeRange);
    expect(found).toEqual(anyCell);
    expect(superBalanceCell(balances, "z. Not an age", "Male", anyCell.taxableIncomeRange)).toBeNull();
  });

  it("slices order by the source's age label prefixes", () => {
    const cell = balances.cells[0]!;
    const slice = superBalanceSlice(balances, cell.sex, cell.taxableIncomeRange);
    expect(slice.length).toBeGreaterThan(5);
    const labels = slice.map((c) => c.ageRange);
    expect([...labels].sort()).toEqual(labels);
  });
});

describe("superContributionSummary", () => {
  it("SG at the pack rate with cap headroom for FY2026-27", () => {
    const summary = superContributionSummary(sg2627, thresholds, "2026-27", "100000", "0");
    // 12% of $100,000 (below the annual max contribution base).
    expect(summary.sgAmount).toBe("12000.00");
    expect(summary.concessionalCap).toBe("32500");
    expect(summary.capRemaining).toBe("20500.00");
    expect(summary.overCapBy).toBe("0.00");
    expect(summary.division293Excess).toBe("0.00");
  });

  it("caps SG at the maximum contribution base and flags Division 293", () => {
    const summary = superContributionSummary(sg2627, thresholds, "2026-27", "400000", "0");
    // Base capped at $270,830 → SG 12% = $32,499.60.
    expect(summary.sgAmount).toBe("32499.60");
    // 400,000 + 32,499.60 − 250,000 over the Division 293 threshold.
    expect(summary.division293Excess).toBe("182499.60");
  });

  it("sacrifice counts toward the cap and can exceed it", () => {
    const summary = superContributionSummary(sg2627, thresholds, "2026-27", "100000", "25000");
    expect(summary.concessionalTotal).toBe("37000.00");
    expect(summary.overCapBy).toBe("4500.00");
    expect(summary.capRemaining).toBe("0.00");
  });

  it("fails closed for a year with no published cap", () => {
    expect(() => superContributionSummary(sg2627, thresholds, "2019-20", "100000", "0")).toThrow(
      SuperThresholdUnavailableError,
    );
  });
});
