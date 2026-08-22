import { describe, expect, it } from "vitest";
import { negotiateFormat } from "./accept";

describe("negotiateFormat", () => {
  it("serves HTML when no Accept header is sent", () => {
    expect(negotiateFormat(null)).toBe("html");
    expect(negotiateFormat("")).toBe("html");
    expect(negotiateFormat("   ")).toBe("html");
  });

  it("serves HTML to browsers and generic crawlers", () => {
    expect(negotiateFormat("text/html")).toBe("html");
    expect(
      negotiateFormat("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8"),
    ).toBe("html");
    expect(negotiateFormat("*/*")).toBe("html");
    expect(negotiateFormat("text/*")).toBe("html");
  });

  it("serves markdown when the client asks for it outright", () => {
    expect(negotiateFormat("text/markdown")).toBe("markdown");
    expect(negotiateFormat("TEXT/MARKDOWN")).toBe("markdown");
    expect(negotiateFormat("text/markdown; charset=utf-8")).toBe("markdown");
  });

  it("honours q-values when both representations are acceptable", () => {
    expect(negotiateFormat("text/markdown,text/html;q=0.9")).toBe("markdown");
    expect(negotiateFormat("text/html;q=0.4, text/markdown")).toBe("markdown");
    expect(negotiateFormat("text/markdown;q=0.4, text/html;q=0.3")).toBe("markdown");
    expect(negotiateFormat("text/markdown;q=0.1, text/html")).toBe("html");
    // Equal preference falls back to HTML, so */* clients keep today's behavior.
    expect(negotiateFormat("text/markdown;q=0.5, text/html;q=0.5")).toBe("html");
  });

  it("gives exact types precedence over wildcards", () => {
    expect(negotiateFormat("text/*;q=1, text/markdown;q=0.2")).toBe("html");
    expect(negotiateFormat("*/*;q=0.1, text/markdown")).toBe("markdown");
  });

  it("returns none when nothing we serve is acceptable", () => {
    expect(negotiateFormat("application/json")).toBe("none");
    expect(negotiateFormat("image/avif,image/webp")).toBe("none");
    expect(negotiateFormat("text/markdown;q=0")).toBe("none");
    expect(negotiateFormat("text/html;q=0,text/markdown;q=0")).toBe("none");
  });

  it("treats malformed headers and q-values leniently", () => {
    expect(negotiateFormat("garbage")).toBe("html");
    expect(negotiateFormat(",,,")).toBe("html");
    // A malformed q param is ignored, not read as q=0.
    expect(negotiateFormat("text/markdown;q=abc")).toBe("markdown");
  });
});
