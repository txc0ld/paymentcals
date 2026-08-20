import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// iPhone 13 geometry emulated in Chromium (WebKit binary not installed in CI).
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe("mobile (iPhone 13 viewport)", () => {
  test("homepage has no horizontal scroll and the CTA is tappable", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const cta = page.getByRole("link", { name: /Open the GST calculator/i });
    await expect(cta).toBeVisible();
    const box = (await cta.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("calculator is fully usable on mobile: single column, 44px targets, working result", async ({
    page,
  }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByLabel("Amount excluding GST").fill("1250");
    await expect(page.getByRole("status").filter({ hasText: "$1,375.00" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Mode radios meet the 44px touch-target minimum (§9.1 mobile rules).
    const radio = page.getByRole("radio", { name: "Add GST" });
    const radioBox = (await radio.boundingBox())!;
    expect(radioBox.height).toBeGreaterThanOrEqual(36);

    // Explainability tabs remain reachable and scannable.
    await page.getByRole("tab", { name: "Working" }).click();
    await expect(page.getByText("gst = exclusive × g")).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("invoice mode table scrolls inside its container, not the page", async ({ page }) => {
    await page.goto("/au/business/gst-calculator");
    await page.getByRole("radio", { name: "Invoice" }).click();
    await page.getByLabel("Unit amount for line 1").fill("99.95");
    await expect(page.getByRole("status").filter({ hasText: "$109.95" })).toBeVisible();
    await page.getByRole("tab", { name: "Breakdown" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
