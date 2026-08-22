import { expect, test } from "@playwright/test";

/**
 * Agent-readiness surface: real 404s with recovery links, markdown content
 * negotiation (acceptmarkdown.com), trust pages, llms.txt guidance and
 * structured data. Request-level tests — agents don't run our JavaScript.
 */

test.describe("agent-friendly 404", () => {
  test("nonexistent path returns HTTP 404 with recovery links", async ({ request }) => {
    const response = await request.get("/some-path-that-does-not-exist");
    expect(response.status()).toBe(404);
    const body = await response.text();
    expect(body).toContain("No page at this address");
    expect(body).toContain("/llms.txt");
    expect(body).toContain("/sitemap.xml");
    expect(body).toContain("/calculators");
  });

  test("nonexistent path returns a markdown 404 to markdown clients", async ({ request }) => {
    const response = await request.get("/some-path-that-does-not-exist", {
      headers: { Accept: "text/markdown" },
    });
    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    const body = await response.text();
    expect(body).toMatch(/^# 404/);
    expect(body).toContain("llms.txt");
    expect(body).toContain("sitemap.xml");
  });
});

test.describe("markdown content negotiation", () => {
  test("Accept: text/markdown returns markdown with Vary: Accept", async ({ request }) => {
    const response = await request.get("/", { headers: { Accept: "text/markdown" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(response.headers()["vary"]?.toLowerCase()).toContain("accept");
    const body = await response.text();
    expect(body).toMatch(/^# PaymentCalcs/);
  });

  test("browser Accept headers keep getting HTML", async ({ request }) => {
    const response = await request.get("/", {
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    // Vary: Accept on the HTML variant is set via next.config headers and
    // applied at the CDN edge in production; Next overwrites it in the
    // local server, so it is asserted here only on the markdown and 406
    // responses (which the acceptmarkdown.com check inspects).
  });

  test("q-values decide the representation", async ({ request }) => {
    const markdownWins = await request.get("/calculators", {
      headers: { Accept: "text/html;q=0.4, text/markdown" },
    });
    expect(markdownWins.headers()["content-type"]).toContain("text/markdown");

    const htmlWins = await request.get("/calculators", {
      headers: { Accept: "text/markdown;q=0.1, text/html" },
    });
    expect(htmlWins.headers()["content-type"]).toContain("text/html");
  });

  test("methodology and calculator pages negotiate to markdown", async ({ request }) => {
    for (const path of ["/methodology/income-tax-calculator", "/au/pay-tax/income-tax-calculator", "/about"]) {
      const response = await request.get(path, { headers: { Accept: "text/markdown" } });
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toContain("text/markdown");
    }
  });

  test("a client accepting neither HTML nor markdown gets 406", async ({ request }) => {
    const response = await request.get("/", { headers: { Accept: "application/json" } });
    expect(response.status()).toBe(406);
    expect(response.headers()["vary"]?.toLowerCase()).toContain("accept");
    expect(await response.text()).toContain("llms.txt");
  });

  test("non-page files stay out of negotiation", async ({ request }) => {
    const response = await request.get("/llms.txt", { headers: { Accept: "application/json" } });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
  });
});

test.describe("trust anchor pages", () => {
  for (const path of ["/about", "/contact", "/privacy", "/developers"]) {
    test(`${path} serves substantial server-rendered content`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const body = await response.text();
      // Raw-HTML text check: strip tags, require 500+ chars of readable copy.
      const text = body
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");
      expect(text.length).toBeGreaterThan(500);
      expect(body).toContain("<h1");
    });
  }

  test("contact page names working channels", async ({ request }) => {
    const body = await (await request.get("/contact")).text();
    expect(body).toContain("github.com/txc0ld/paymentcals");
    expect(body).toContain("team@fantomlabs.io");
  });
});

test.describe("agent guidance and structured data", () => {
  test("llms.txt carries when-to-use guidance and negotiation instructions", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("## When to use PaymentCalcs");
    expect(body).toContain("Accept: text/markdown");
    expect(body).toContain("/developers");
    expect(body).toContain("Do not use it for financial advice");
  });

  test("homepage JSON-LD identifies the product and organisation", async ({ request }) => {
    const body = await (await request.get("/")).text();
    const jsonLd = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    expect(jsonLd).toBeTruthy();
    const graph = JSON.parse(jsonLd as string)["@graph"] as Array<Record<string, unknown>>;
    const organization = graph.find((node) => node["@type"] === "Organization");
    const application = graph.find((node) => node["@type"] === "WebApplication");
    expect(organization?.name).toBe("PaymentCalcs");
    expect(typeof organization?.description).toBe("string");
    expect((organization?.contactPoint as { email?: string })?.email).toBe("team@fantomlabs.io");
    expect(application?.applicationCategory).toBe("FinanceApplication");
    expect(application?.offers).toBeTruthy();
  });

  test("homepage serves an H1 and hierarchical headings without JavaScript", async ({ request }) => {
    const body = await (await request.get("/")).text();
    expect(body).toContain("<h1");
    const h2Count = (body.match(/<h2/g) ?? []).length;
    expect(h2Count).toBeGreaterThanOrEqual(3);
    expect(body).toContain("<h3");
  });

  test("sitemap lists the trust and developer pages", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/about", "/contact", "/privacy", "/developers"]) {
      expect(body).toContain(path);
    }
  });
});
