import { describe, expect, it } from "vitest";
import { canonicalHash, canonicalStringify } from "./canonical";

describe("canonical serialisation", () => {
  it("is key-order independent, recursively", async () => {
    const a = { b: 1, a: { z: [1, { y: 2, x: 3 }], w: "s" } };
    const b = { a: { w: "s", z: [1, { x: 3, y: 2 }] }, b: 1 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(await canonicalHash(a)).toBe(await canonicalHash(b));
  });

  it("drops undefined properties but keeps nulls", () => {
    expect(canonicalStringify({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it("distinguishes different values", async () => {
    expect(await canonicalHash({ a: 1 })).not.toBe(await canonicalHash({ a: 2 }));
  });

  it("refuses non-finite numbers", () => {
    expect(() => canonicalStringify({ a: Number.NaN })).toThrow(TypeError);
  });

  it("produces a stable known digest", async () => {
    // Locked vector: changing canonicalisation silently would break replay integrity.
    expect(await canonicalHash({ a: 1, b: "x" })).toBe(
      "ecf9e98ec0641e23113ff3ce8bdc78d0ddd249886517fd4a7f68cc83d4e65667",
    );
  });
});
