import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { paygWithholdingPacks } from "@paymentcalcs/rules-au";
import { computeWithholding, selectScale, weeklyEquivalentX } from "./withholding";

const d = (n: number | string) => new Dec(n) as DecimalValue;
const rules = paygWithholdingPacks[0]!.rules;

describe("weekly-equivalent earnings (Schedule 1 conversions)", () => {
  it("weekly: floor dollars + 99c", () => {
    expect(weeklyEquivalentX(d("1000.45"), "weekly").toFixed(2)).toBe("1000.99");
  });
  it("fortnightly: halve, floor, + 99c", () => {
    expect(weeklyEquivalentX(d("4409.75"), "fortnightly").toFixed(2)).toBe("2204.99");
  });
  it("monthly: ×3 ÷ 13, floor, + 99c (with the 33c adjustment)", () => {
    expect(weeklyEquivalentX(d("10627.88"), "monthly").toFixed(2)).toBe("2452.99");
    // Ends in exactly .33 → add one cent first.
    expect(weeklyEquivalentX(d("4333.33"), "monthly").toFixed(2)).toBe("1000.99");
  });
  it("quarterly: ÷ 13, floor, + 99c", () => {
    expect(weeklyEquivalentX(d("13012.99"), "quarterly").toFixed(2)).toBe("1000.99");
  });
});

describe("withholding from pack coefficients", () => {
  it("scale 2, weekly $1,000: y = 0.3227 × 1000.99 − 185.1935 → $138", () => {
    const result = computeWithholding(rules, {
      periodEarnings: d("1000"),
      cycle: "weekly",
      scale: "scale2_tft",
      stslEnabled: false,
    });
    expect(result.weeklyOrdinary.toFixed(0)).toBe("138");
    expect(result.periodTotal.toFixed(0)).toBe("138");
  });

  it("below the tax-free threshold row withholds nothing on scale 2", () => {
    const result = computeWithholding(rules, {
      periodEarnings: d("300"),
      cycle: "weekly",
      scale: "scale2_tft",
      stslEnabled: false,
    });
    expect(result.weeklyOrdinary.isZero()).toBe(true);
  });

  it("monthly amounts scale by ×13 ÷ 3 with dollar rounding", () => {
    const weekly = computeWithholding(rules, {
      periodEarnings: d("1000"),
      cycle: "weekly",
      scale: "scale2_tft",
      stslEnabled: false,
    });
    const monthly = computeWithholding(rules, {
      // Monthly earnings whose weekly equivalent is also $1,000.99.
      periodEarnings: d("4337.66"),
      cycle: "monthly",
      scale: "scale2_tft",
      stslEnabled: false,
    });
    const expected = weekly.weeklyOrdinary.times(13).div(3).toDecimalPlaces(0, Dec.ROUND_HALF_UP);
    expect(monthly.periodOrdinary.toFixed(0)).toBe(expected.toFixed(0));
  });

  it("STSL component uses the no-TFT table only for scale 1", () => {
    const scale1 = computeWithholding(rules, {
      periodEarnings: d("2000"),
      cycle: "weekly",
      scale: "scale1_no_tft",
      stslEnabled: true,
    });
    const scale2 = computeWithholding(rules, {
      periodEarnings: d("2000"),
      cycle: "weekly",
      scale: "scale2_tft",
      stslEnabled: true,
    });
    // no-TFT row (<2144): 0.15x − 148.0615 = 152.09 → $152
    expect(scale1.weeklyStsl.toFixed(0)).toBe("152");
    // TFT row (<2494): 0.15x − 200.5615 = 99.59 → $100
    expect(scale2.weeklyStsl.toFixed(0)).toBe("100");
  });

  it("withholding is monotone non-decreasing in earnings per scale", () => {
    for (const scale of ["scale1_no_tft", "scale2_tft", "scale3_foreign"] as const) {
      let previous = d(0);
      for (let earnings = 100; earnings <= 5000; earnings += 50) {
        const { weeklyOrdinary } = computeWithholding(rules, {
          periodEarnings: d(earnings),
          cycle: "weekly",
          scale,
          stslEnabled: false,
        });
        expect(
          weeklyOrdinary.greaterThanOrEqualTo(previous),
          `${scale} at $${earnings}`,
        ).toBe(true);
        previous = weeklyOrdinary;
      }
    }
  });
});

describe("scale selection", () => {
  it("routes declarations to the correct schedule scale", () => {
    expect(
      selectScale({ residency: "resident", claimsTaxFreeThreshold: true, medicareStatus: "standard" }),
    ).toBe("scale2_tft");
    expect(
      selectScale({ residency: "resident", claimsTaxFreeThreshold: false, medicareStatus: "standard" }),
    ).toBe("scale1_no_tft");
    expect(
      selectScale({ residency: "foreign_resident", claimsTaxFreeThreshold: false, medicareStatus: "standard" }),
    ).toBe("scale3_foreign");
    expect(
      selectScale({ residency: "resident", claimsTaxFreeThreshold: true, medicareStatus: "full_exemption" }),
    ).toBe("scale5_full_medicare_exempt");
    const whm = selectScale({
      residency: "working_holiday_maker",
      claimsTaxFreeThreshold: false,
      medicareStatus: "standard",
    });
    expect(typeof whm).not.toBe("string");
  });
});
