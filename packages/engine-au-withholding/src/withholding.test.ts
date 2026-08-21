import { describe, expect, it } from "vitest";
import { Dec, type DecimalValue } from "@paymentcalcs/calculation-core";
import { paygWithholdingPacks, schedule5Pack } from "@paymentcalcs/rules-au";
import { computeMethodAWithholding, computeWithholding, selectScale, weeklyEquivalentX } from "./withholding";

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

describe("Schedule 5 Method A — back payments, commissions, bonuses", () => {
  const schedule5 = schedule5Pack.rules;
  const base = {
    cycle: "fortnightly" as const,
    scale: "scale2_tft" as const,
    stslEnabled: false,
  };

  it("reproduces the ten published steps independently for a $3,000 bonus on $3,076.92/fn", () => {
    const result = computeMethodAWithholding(rules, schedule5, {
      ...base,
      periodEarnings: d("3076.92"),
      additionalPayment: d("3000"),
    });
    // Independent reproduction of the steps against the same Schedule 1 pack.
    const step1 = d("3076.92").floor() as DecimalValue;
    const step2 = computeWithholding(rules, { ...base, periodEarnings: step1 }).periodTotal;
    const step3 = d("3000").div(26).floor() as DecimalValue; // 115
    const step5 = computeWithholding(rules, { ...base, periodEarnings: step1.plus(step3) as DecimalValue }).periodTotal;
    const step7 = step5.minus(step2).times(26) as DecimalValue;
    const step8 = d("3000").times(d(schedule5.additionalPaymentCapRate)) as DecimalValue;
    const step9 = (Dec.min(step7, step8) as DecimalValue).floor();
    expect(result.periodOnEarnings.toFixed(2)).toBe(step2.toFixed(2));
    expect(result.periodOnAdditional.toFixed(0)).toBe(step9.toFixed(0));
    expect(result.periodTotal.toFixed(2)).toBe(step2.plus(step9).toFixed(2));
    expect(result.steps.step3).toBe("115");
    expect(result.periodOnAdditional.greaterThan(0)).toBe(true);
  });

  it("zero additional payment withholds exactly the Schedule 1 amount", () => {
    const result = computeMethodAWithholding(rules, schedule5, {
      ...base,
      periodEarnings: d("2500"),
      additionalPayment: d("0"),
    });
    const schedule1 = computeWithholding(rules, { ...base, periodEarnings: d("2500") }).periodTotal;
    expect(result.periodOnAdditional.toFixed(0)).toBe("0");
    expect(result.periodTotal.toFixed(2)).toBe(schedule1.toFixed(2));
    expect(result.capApplied).toBe(false);
  });

  it("caps the additional-payment withholding at 47% for a top-bracket payee", () => {
    const result = computeMethodAWithholding(rules, schedule5, {
      ...base,
      scale: "scale1_no_tft",
      periodEarnings: d("15000"),
      additionalPayment: d("100000"),
    });
    // At the top marginal coefficient the differenced amount exceeds the cap.
    expect(result.capApplied).toBe(true);
    expect(result.periodOnAdditional.toFixed(0)).toBe(d("100000").times(d(schedule5.additionalPaymentCapRate)).floor().toFixed(0));
  });

  it("supports the defined-period apportionment override (4 weekly periods)", () => {
    const result = computeMethodAWithholding(rules, schedule5, {
      cycle: "weekly",
      scale: "scale2_tft",
      stslEnabled: false,
      periodEarnings: d("1500"),
      additionalPayment: d("2000"),
      apportionPeriods: 4,
    });
    expect(result.apportionPeriods).toBe(4);
    expect(result.steps.step3).toBe("500");
    // Cents are ignored at step 9 — always a whole-dollar amount.
    expect(result.periodOnAdditional.toFixed(2).endsWith(".00")).toBe(true);
  });

  it("includes the STSL component when the payee has a study loan", () => {
    const withStsl = computeMethodAWithholding(rules, schedule5, {
      ...base,
      stslEnabled: true,
      periodEarnings: d("3076.92"),
      additionalPayment: d("3000"),
    });
    const without = computeMethodAWithholding(rules, schedule5, {
      ...base,
      periodEarnings: d("3076.92"),
      additionalPayment: d("3000"),
    });
    expect(withStsl.periodTotal.greaterThan(without.periodTotal)).toBe(true);
  });
});
