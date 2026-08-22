import { describe, expect, it } from "vitest";
import { calculatorRegistry, routePath } from "@paymentcalcs/calculator-registry";
import { notFoundMarkdown, renderMarkdownForPath } from "./agent-markdown";
import { CONTENT_PAGES } from "./site-content";

describe("renderMarkdownForPath", () => {
  it("renders the homepage with a single H1 and site links", () => {
    const markdown = renderMarkdownForPath("/");
    expect(markdown).not.toBeNull();
    expect(markdown).toMatch(/^# PaymentCalcs/);
    expect(markdown).toContain("/llms.txt");
    expect(markdown).toContain("/calculators");
    expect(markdown).toContain("not financial advice");
  });

  it("lists every calculator on the index page", () => {
    const markdown = renderMarkdownForPath("/calculators");
    expect(markdown).not.toBeNull();
    for (const entry of calculatorRegistry) {
      expect(markdown).toContain(`[${entry.displayName}]`);
    }
  });

  it("renders every calculator route and its methodology page", () => {
    for (const entry of calculatorRegistry) {
      const calculator = renderMarkdownForPath(routePath(entry));
      expect(calculator, routePath(entry)).not.toBeNull();
      expect(calculator).toContain(entry.displayName);

      const methodology = renderMarkdownForPath(`/methodology/${entry.slug}`);
      expect(methodology, entry.slug).not.toBeNull();
      expect(methodology).toContain("## Engines and formulas");
    }
  });

  it("renders the trust and developer pages with substantial content", () => {
    for (const page of CONTENT_PAGES) {
      const markdown = renderMarkdownForPath(page.path);
      expect(markdown, page.path).not.toBeNull();
      // Agent-legitimacy checks look for 500+ characters of real content.
      expect((markdown as string).length, page.path).toBeGreaterThan(500);
      expect(markdown).toContain(`# ${page.title}`);
    }
  });

  it("renders sources and changelog", () => {
    expect(renderMarkdownForPath("/sources")).toContain("rule pack");
    expect(renderMarkdownForPath("/changelog")).toContain("Changelog");
  });

  it("normalises trailing slashes", () => {
    expect(renderMarkdownForPath("/calculators/")).toEqual(renderMarkdownForPath("/calculators"));
  });

  it("returns null for unknown paths", () => {
    expect(renderMarkdownForPath("/no-such-page")).toBeNull();
    expect(renderMarkdownForPath("/methodology/no-such-slug")).toBeNull();
  });
});

describe("notFoundMarkdown", () => {
  it("points agents at the sitemap and llms.txt", () => {
    const markdown = notFoundMarkdown("/missing");
    expect(markdown).toMatch(/^# 404/);
    expect(markdown).toContain("sitemap.xml");
    expect(markdown).toContain("llms.txt");
    expect(markdown).toContain("`/missing`");
  });
});
