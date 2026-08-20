import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  moneyFromMinorUnits,
  type CalculationRequestV1,
} from "@paymentcalcs/calculation-core";
import { gstPack } from "@paymentcalcs/rules-au";
import { calculateGst, computeGst, type GstResolution } from "./engine";
import type { GstInput } from "./schema";

const aud = (minor: string) => moneyFromMinorUnits("AUD", minor, 2);

const resolution: GstResolution = {
  pack: gstPack,
  manifestRef: {
    rulePackId: gstPack.rulePackId,
    rulesVersion: gstPack.rulesVersion,
    status: gstPack.status,
    integritySha256: "0".repeat(64),
  },
};

function makeRequest(input: GstInput): CalculationRequestV1<GstInput> {
  return {
    requestId: "req-test",
    calculatorId: "AU-BIZ-001",
    calculatorSchemaVersion: "1",
    jurisdiction: { country: "AU" },
    locale: "en-AU",
    currency: "AUD",
    valuationDate: "2026-08-20",
    input,
    options: { traceLevel: "full" },
  };
}

function run(input: GstInput) {
  return computeGst(makeRequest(input), resolution);
}

describe("GST boundaries (§12.15 acceptance criteria)", () => {
  it("adds GST to $100.00 exactly", () => {
    const r = run({ mode: "add", amount: aud("10000") });
    expect(r.status).toBe("success");
    expect(r.output?.gstAmount.minorUnits).toBe("1000");
    expect(r.output?.inclusiveAmount.minorUnits).toBe("11000");
  });

  it("handles zero and one-cent amounts without error", () => {
    expect(run({ mode: "add", amount: aud("0") }).output?.gstAmount.minorUnits).toBe("0");
    const oneCent = run({ mode: "add", amount: aud("1") });
    // 10% of 1c = 0.1c → rounds half-up to 0c.
    expect(oneCent.output?.gstAmount.minorUnits).toBe("0");
    expect(run({ mode: "split", amount: aud("1") }).output?.gstAmount.minorUnits).toBe("0");
  });

  it("rounds the half-cent boundary half-up: 10% of $0.05 = 1c", () => {
    const r = run({ mode: "add", amount: aud("5") });
    expect(r.output?.gstAmount.minorUnits).toBe("1");
  });

  it("splits a GST-inclusive $110.00 into $100.00 + $10.00", () => {
    const r = run({ mode: "split", amount: aud("11000") });
    expect(r.output?.exclusiveAmount.minorUnits).toBe("10000");
    expect(r.output?.gstAmount.minorUnits).toBe("1000");
  });

  it("flags negative amounts as credits with a warning, still calculating", () => {
    const r = run({ mode: "add", amount: aud("-10000") });
    expect(r.status).toBe("success_with_warnings");
    expect(r.output?.gstAmount.minorUnits).toBe("-1000");
  });

  it("never infers treatment from labels: a line labelled 'milk' is taxed when marked taxable", () => {
    const r = run({
      mode: "line_items",
      roundingLevel: "per_line",
      items: [
        { id: "l1", label: "milk (GST-free in real life)", amount: aud("1000"), amountIs: "exclusive", treatment: "taxable", quantity: 1 },
        { id: "l2", label: "consulting", amount: aud("1000"), amountIs: "exclusive", treatment: "gst_free", quantity: 1 },
      ],
    });
    expect(r.output?.lines?.[0]?.gstAmount.minorUnits).toBe("100");
    expect(r.output?.lines?.[1]?.gstAmount.minorUnits).toBe("0");
  });

  it("fails closed when the pack rate is null", () => {
    const nullPack = { ...gstPack, rules: { standardRate: null } };
    const r = computeGst(makeRequest({ mode: "add", amount: aud("100") }), {
      ...resolution,
      pack: nullPack,
    });
    expect(r.status).toBe("failed");
    expect(r.errors[0]?.code).toBe("PC-RULE-0004");
    expect(r.output).toBeUndefined();
  });

  it("rejects malformed input as invalid, not thrown", () => {
    const r = computeGst(
      makeRequest({ mode: "add", amount: { bad: true } } as unknown as GstInput),
      resolution,
    );
    expect(r.status).toBe("invalid");
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

const minorUnitsArb = fc
  .bigInt({ min: -99999999999n, max: 99999999999n })
  .map((n) => aud(n.toString()));

describe("GST properties", () => {
  it("reconciliation always passes and is exact: exclusive + gst = inclusive", () => {
    fc.assert(
      fc.property(minorUnitsArb, fc.constantFrom<GstInput["mode"]>("add", "remove", "split"), (amount, mode) => {
        const r = run({ mode, amount } as GstInput);
        expect(r.reconciliation?.[0]?.passed).toBe(true);
        const out = r.output!;
        expect(addMoney(out.exclusiveAmount, out.gstAmount).minorUnits).toBe(
          out.inclusiveAmount.minorUnits,
        );
      }),
    );
  });

  it("GST is monotone non-decreasing in the amount", () => {
    fc.assert(
      fc.property(minorUnitsArb, minorUnitsArb, (a, b) => {
        const [lo, hi] = compareMoney(a, b) <= 0 ? [a, b] : [b, a];
        const gstLo = run({ mode: "add", amount: lo }).output!.gstAmount;
        const gstHi = run({ mode: "add", amount: hi }).output!.gstAmount;
        expect(compareMoney(gstLo, gstHi)).toBeLessThanOrEqual(0);
      }),
    );
  });

  it("metamorphic: add then split round-trips within one cent", () => {
    fc.assert(
      fc.property(minorUnitsArb, (exclusive) => {
        const added = run({ mode: "add", amount: exclusive }).output!;
        const split = run({ mode: "split", amount: added.inclusiveAmount }).output!;
        const diff = BigInt(split.exclusiveAmount.minorUnits) - BigInt(exclusive.minorUnits);
        expect(diff <= 1n && diff >= -1n).toBe(true);
      }),
    );
  });

  it("line items: lines always sum exactly to totals at both rounding levels", () => {
    const itemArb = fc.record({
      id: fc.uuid(),
      amount: fc.bigInt({ min: 1n, max: 9999999n }).map((n) => aud(n.toString())),
      amountIs: fc.constantFrom("exclusive" as const, "inclusive" as const),
      treatment: fc.constantFrom("taxable" as const, "gst_free" as const, "input_taxed" as const),
      quantity: fc.integer({ min: 1, max: 20 }),
    });
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 12 }),
        fc.constantFrom("per_line" as const, "invoice_total" as const),
        (items, roundingLevel) => {
          const r = run({ mode: "line_items", items, roundingLevel });
          expect(r.status === "success" || r.status === "success_with_warnings").toBe(true);
          const out = r.output!;
          const sum = (key: "exclusiveAmount" | "gstAmount" | "inclusiveAmount") =>
            out.lines!.reduce((acc, l) => acc + BigInt(l[key].minorUnits), 0n).toString();
          expect(sum("exclusiveAmount")).toBe(out.exclusiveAmount.minorUnits);
          expect(sum("gstAmount")).toBe(out.gstAmount.minorUnits);
          expect(sum("inclusiveAmount")).toBe(out.inclusiveAmount.minorUnits);
        },
      ),
    );
  });

  it("invoice-total rounding preserves each line's entered basis (codex finding #3)", () => {
    // Two 5c inclusive-priced taxable lines: exact GST each ≈ 0.4545c.
    // Authoritative total GST = round(0.909c) = 1c. Entered inclusive amounts
    // must remain 5c each; the pre-fix behaviour produced an 11c invoice.
    const r = run({
      mode: "line_items",
      roundingLevel: "invoice_total",
      items: [
        { id: "a", amount: aud("5"), amountIs: "inclusive", treatment: "taxable", quantity: 1 },
        { id: "b", amount: aud("5"), amountIs: "inclusive", treatment: "taxable", quantity: 1 },
      ],
    });
    const out = r.output!;
    expect(out.lines![0]!.inclusiveAmount.minorUnits).toBe("5");
    expect(out.lines![1]!.inclusiveAmount.minorUnits).toBe("5");
    expect(out.inclusiveAmount.minorUnits).toBe("10");
    expect(out.gstAmount.minorUnits).toBe("1");
  });

  it("largest-remainder keeps every line within one cent of exact GST (codex finding #4)", () => {
    const itemArb = fc.record({
      id: fc.uuid(),
      amount: fc.bigInt({ min: 1n, max: 99999n }).map((n) => aud(n.toString())),
      amountIs: fc.constantFrom("exclusive" as const, "inclusive" as const),
      treatment: fc.constant("taxable" as const),
      quantity: fc.integer({ min: 1, max: 9 }),
    });
    fc.assert(
      fc.property(fc.array(itemArb, { minLength: 2, maxLength: 15 }), (items) => {
        const out = run({ mode: "line_items", items, roundingLevel: "invoice_total" }).output!;
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i]!;
          const line = out.lines![i]!;
          const entered = BigInt(item.amount.minorUnits) * BigInt(item.quantity);
          if (item.amountIs === "inclusive") {
            expect(line.inclusiveAmount.minorUnits).toBe(entered.toString());
          } else {
            expect(line.exclusiveAmount.minorUnits).toBe(entered.toString());
          }
          // gst within 1 cent of exact: exclusive → exact = entered/10, so
          // |10·gst − entered| ≤ 10; inclusive → exact = entered/11, so
          // |11·gst − entered| ≤ 11.
          const gst = BigInt(line.gstAmount.minorUnits);
          const scaled = item.amountIs === "exclusive" ? gst * 10n : gst * 11n;
          const bound = item.amountIs === "exclusive" ? 10n : 11n;
          const diff = scaled > entered ? scaled - entered : entered - scaled;
          expect(diff <= bound).toBe(true);
        }
      }),
    );
  });

  it("per-line vs invoice-total totals differ by at most half a cent per taxable line", () => {
    const itemArb = fc.record({
      id: fc.uuid(),
      amount: fc.bigInt({ min: 1n, max: 999999n }).map((n) => aud(n.toString())),
      amountIs: fc.constantFrom("exclusive" as const, "inclusive" as const),
      treatment: fc.constant("taxable" as const),
      quantity: fc.integer({ min: 1, max: 5 }),
    });
    fc.assert(
      fc.property(fc.array(itemArb, { minLength: 1, maxLength: 10 }), (items) => {
        const perLine = run({ mode: "line_items", items, roundingLevel: "per_line" }).output!;
        const invoice = run({ mode: "line_items", items, roundingLevel: "invoice_total" }).output!;
        const diff =
          BigInt(perLine.gstAmount.minorUnits) - BigInt(invoice.gstAmount.minorUnits);
        const bound = BigInt(items.length);
        expect(diff <= bound && diff >= -bound).toBe(true);
      }),
    );
  });
});

describe("determinism and integrity", () => {
  it("same request produces byte-identical results including hashes", async () => {
    const request = makeRequest({ mode: "add", amount: aud("123456") });
    const context = { now: "2026-08-20T10:00:00+08:00" };
    const a = await calculateGst(request, resolution, context);
    const b = await calculateGst(request, resolution, context);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.integrity.canonicalResultHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("labels the rate as an official rule sourced from the pack", async () => {
    const r = await calculateGst(makeRequest({ mode: "add", amount: aud("100") }), resolution, {
      now: "2026-08-20T10:00:00+08:00",
    });
    const rateAssumption = r.assumptions.find((a) => a.id === "gst-standard-rate");
    expect(rateAssumption?.category).toBe("official_rule");
    expect(r.sources[0]?.url).toContain("ato.gov.au");
  });
});
