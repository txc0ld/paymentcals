import { describe, expect, it } from "vitest";
import { dec } from "./decimal.js";
import {
  MoneyDomainError,
  addMoney,
  compareMoney,
  moneyFromDecimalString,
  moneyFromMinorUnits,
  moneyToDecimalString,
  multiplyMoney,
  negateMoney,
  subtractMoney,
  sumMoney,
} from "./money.js";
import { roundTo } from "./rounding.js";

const aud = (minor: string) => moneyFromMinorUnits("AUD", minor, 2);

describe("money construction", () => {
  it("accepts signed integer strings", () => {
    expect(aud("12345").minorUnits).toBe("12345");
    expect(aud("-12345").minorUnits).toBe("-12345");
    expect(aud("0").minorUnits).toBe("0");
  });

  it("normalises negative zero", () => {
    expect(moneyFromMinorUnits("AUD", "-0", 2).minorUnits).toBe("0");
  });

  it("rejects floats, exponents, blanks and leading zeros", () => {
    for (const bad of ["1.5", "1e3", "", " 1", "01", "--1", "NaN"]) {
      expect(() => aud(bad), bad).toThrow(MoneyDomainError);
    }
  });

  it("rejects invalid currency and scale", () => {
    expect(() => moneyFromMinorUnits("aud", "1", 2)).toThrow(MoneyDomainError);
    expect(() => moneyFromMinorUnits("AUD", "1", 2.5)).toThrow(MoneyDomainError);
    expect(() => moneyFromMinorUnits("AUD", "1", -1)).toThrow(MoneyDomainError);
  });

  it("parses major-unit decimal strings with explicit rounding", () => {
    expect(moneyFromDecimalString("AUD", "1234.56", 2).minorUnits).toBe("123456");
    expect(moneyFromDecimalString("AUD", "0.005", 2, "half_up").minorUnits).toBe("1");
    expect(moneyFromDecimalString("AUD", "0.005", 2, "half_even").minorUnits).toBe("0");
    expect(moneyFromDecimalString("AUD", "-0.005", 2, "truncate").minorUnits).toBe("0");
  });
});

describe("money arithmetic", () => {
  it("adds and subtracts exactly at arbitrary magnitude", () => {
    const big = aud("9007199254740993"); // beyond Number.MAX_SAFE_INTEGER
    expect(addMoney(big, aud("1")).minorUnits).toBe("9007199254740994");
    expect(subtractMoney(big, aud("3")).minorUnits).toBe("9007199254740990");
  });

  it("refuses cross-currency and cross-scale operations", () => {
    expect(() => addMoney(aud("1"), moneyFromMinorUnits("NZD", "1", 2))).toThrow(MoneyDomainError);
    expect(() => addMoney(aud("1"), moneyFromMinorUnits("AUD", "1", 0))).toThrow(MoneyDomainError);
  });

  it("multiplies with the stated rounding mode", () => {
    // 10% of $0.05 = 0.5c — direction depends on mode, and must be explicit.
    expect(multiplyMoney(aud("5"), dec("0.1"), "half_up").minorUnits).toBe("1");
    expect(multiplyMoney(aud("5"), dec("0.1"), "half_even").minorUnits).toBe("0");
    expect(multiplyMoney(aud("5"), dec("0.1"), "floor").minorUnits).toBe("0");
    expect(multiplyMoney(aud("5"), dec("0.1"), "ceiling").minorUnits).toBe("1");
    expect(multiplyMoney(aud("-5"), dec("0.1"), "floor").minorUnits).toBe("-1");
    expect(multiplyMoney(aud("-5"), dec("0.1"), "truncate").minorUnits).toBe("0");
  });

  it("sums, negates, compares and serialises", () => {
    const total = sumMoney("AUD", 2, [aud("100"), aud("-30"), aud("5")]);
    expect(total.minorUnits).toBe("75");
    expect(negateMoney(total).minorUnits).toBe("-75");
    expect(compareMoney(aud("2"), aud("10"))).toBe(-1);
    expect(moneyToDecimalString(aud("123456"))).toBe("1234.56");
    expect(moneyToDecimalString(aud("-5"))).toBe("-0.05");
  });
});

describe("rounding modes", () => {
  it("covers all five §13.27 modes on the half boundary", () => {
    expect(roundTo(dec("2.5"), 0, "half_up").toFixed(0)).toBe("3");
    expect(roundTo(dec("2.5"), 0, "half_even").toFixed(0)).toBe("2");
    expect(roundTo(dec("3.5"), 0, "half_even").toFixed(0)).toBe("4");
    expect(roundTo(dec("2.9"), 0, "floor").toFixed(0)).toBe("2");
    expect(roundTo(dec("2.1"), 0, "ceiling").toFixed(0)).toBe("3");
    expect(roundTo(dec("-2.9"), 0, "truncate").toFixed(0)).toBe("-2");
    expect(roundTo(dec("-2.5"), 0, "half_up").toFixed(0)).toBe("-3");
    expect(roundTo(dec("-2.1"), 0, "floor").toFixed(0)).toBe("-3");
  });
});
