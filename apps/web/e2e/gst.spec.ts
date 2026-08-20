import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/* Axe scans exclude "header nav": the STRATA nav uses mix-blend-difference,
 * which guarantees inverted (maximum) rendered contrast over our pure
 * black/white canvases, but axe computes contrast from DOM colours and
 * cannot model blend modes, so it false-positives there. */
test.describe("homepage", () => {
  test("renders hero and calculator index, axe-clean", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Know the number.");
    await expect(page.getByRole("link", { name: /Open calculators/i })).toBeVisible();

    const results = await new AxeBuilder({ page }).exclude("header nav").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("GST calculator (draft rules dev preview)", () => {
  test("shows the draft banner — never a silently active draft pack", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await expect(
      page.getByRole("status").filter({ hasText: "Development preview only" }),
    ).toBeVisible();
  });

  test("add mode calculates $100 → $110.00 with working shown", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByLabel("Amount excluding GST").fill("100");
    await expect(page.getByRole("status").filter({ hasText: "$110.00" })).toBeVisible();
    await expect(page.getByText("$10.00").first()).toBeVisible();

    await page.getByRole("tab", { name: "Working" }).click();
    await expect(page.getByText("gst = exclusive × g")).toBeVisible();
    await page.getByRole("tab", { name: "Assumptions" }).click();
    await expect(page.getByText("Official rule")).toBeVisible();
    await page.getByRole("tab", { name: "Sources" }).click();
    await expect(page.getByText("ato.gov.au").first()).toBeVisible();
  });

  test("split mode extracts the GST component", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByRole("radio", { name: "Split GST" }).click();
    await page.getByLabel("Amount including GST").fill("110");
    await expect(page.getByRole("status").filter({ hasText: "$10.00" })).toBeVisible();
  });

  test("invalid input shows remediation, never a wrong number", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByLabel("Amount excluding GST").fill("12.345");
    await expect(page.getByRole("alert").filter({ hasText: "decimal places" })).toContainText(
      "two decimal places",
    );
  });

  test("URL state round-trips through a shared link", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByLabel("Amount excluding GST").fill("2500");
    await expect(page.getByRole("status").filter({ hasText: "$2,750.00" })).toBeVisible();
    await page.waitForFunction(() => {
      const param = new URLSearchParams(window.location.search).get("s");
      if (!param?.startsWith("1.")) return false;
      try {
        const base64 = param.slice(2).replaceAll("-", "+").replaceAll("_", "/");
        return atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)).includes("2500");
      } catch {
        return false;
      }
    });

    const shared = page.url();
    await page.goto("about:blank");
    await page.goto(shared);
    await expect(page.getByLabel("Amount excluding GST")).toHaveValue("2500");
    await expect(page.getByRole("status").filter({ hasText: "$2,750.00" })).toBeVisible();
  });

  test("invoice mode reconciles lines to totals", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByRole("radio", { name: "Invoice" }).click();
    await page.getByLabel("Unit amount for line 1").fill("1500.33");
    await expect(page.getByRole("status").filter({ hasText: "$1,650.36" })).toBeVisible();
    await page.getByRole("tab", { name: "Breakdown" }).click();
    await expect(page.getByRole("table")).toContainText("Totals");
  });

  test("calculator page is axe-clean in both themes", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByLabel("Amount excluding GST").fill("100");
    await expect(page.getByRole("status").filter({ hasText: "$110.00" })).toBeVisible();

    const light = await new AxeBuilder({ page }).exclude("header nav").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(light.violations).toEqual([]);

    await page.getByRole("button", { name: /Switch to light theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const dark = await new AxeBuilder({ page }).exclude("header nav").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(dark.violations).toEqual([]);
  });
});
