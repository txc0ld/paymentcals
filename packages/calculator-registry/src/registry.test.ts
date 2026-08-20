import { describe, expect, it } from "vitest";
import { calculatorRegistry, getRegistryEntry, routePath } from "./index.js";

describe("calculator registry", () => {
  it("has unique IDs and unique category/slug pairs", () => {
    const ids = calculatorRegistry.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const routes = calculatorRegistry.map(routePath);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("contains AU-BIZ-001 routed at /au/business/gst-calculator", () => {
    const entry = getRegistryEntry("AU-BIZ-001");
    expect(entry).toBeDefined();
    expect(routePath(entry!)).toBe("/au/business/gst-calculator");
    expect(entry!.engineDependencies).toContain("E20");
    expect(entry!.rulePackDependencies).toContain("gst");
  });

  it("every entry carries a disclosure set and SEO metadata", () => {
    for (const entry of calculatorRegistry) {
      expect(entry.disclosureSet.length).toBeGreaterThan(0);
      expect(entry.seo.title.length).toBeLessThanOrEqual(70);
      expect(entry.seo.description.length).toBeLessThanOrEqual(165);
    }
  });
});
