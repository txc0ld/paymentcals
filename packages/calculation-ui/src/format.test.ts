import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moneyFromMinorUnits } from "@paymentcalcs/calculation-core";
import { formatMoney, formatRatePercent } from "./format";

describe("formatMoney", () => {
  it("formats from minor-unit strings without floats", () => {
    expect(formatMoney(moneyFromMinorUnits("AUD", "123456", 2))).toBe("$1,234.56");
    expect(formatMoney(moneyFromMinorUnits("AUD", "0", 2))).toBe("$0.00");
    expect(formatMoney(moneyFromMinorUnits("AUD", "5", 2))).toBe("$0.05");
    expect(formatMoney(moneyFromMinorUnits("AUD", "-5", 2))).toBe("−$0.05");
    expect(formatMoney(moneyFromMinorUnits("AUD", "9007199254740993", 2))).toBe(
      "$90,071,992,547,409.93",
    );
  });

  it("keeps non-AUD codes explicit", () => {
    expect(formatMoney(moneyFromMinorUnits("NZD", "100", 2))).toBe("NZD 1.00");
  });
});

describe("formatRatePercent", () => {
  it("renders decimal rate strings exactly", () => {
    expect(formatRatePercent("0.10")).toBe("10%");
    expect(formatRatePercent("0.015")).toBe("1.5%");
    expect(formatRatePercent("0.2")).toBe("20%");
  });
});

describe("result-surface copy (non-negotiable #11)", () => {
  it("no component source contains banned advice verbs", () => {
    const dir = join(process.cwd(), "src");
    const banned = /\b(should|we recommend|best for you)\b/i;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
      const text = readFileSync(join(dir, file), "utf8");
      expect(banned.test(text), `${file} contains banned copy`).toBe(false);
    }
  });
});
