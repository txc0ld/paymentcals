import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("pay calculator (draft rules dev preview)", () => {
  test("calculates the $100k case with liability and withholding shown separately", async ({ page }) => {
    await page.goto("/au/pay-tax/pay-calculator");
    await page.getByLabel("Income amount").fill("100000");

    // Net per fortnight = 77,480 / 26 = 2,980.00
    await expect(page.getByRole("status").filter({ hasText: "$2,980.00" })).toBeVisible();

    // PAY-AC-002: separately labelled sections.
    await expect(page.getByRole("region", { name: "Annual tax position" })).toContainText("$22,520.00");
    await expect(page.getByRole("region", { name: "Estimated employer withholding" })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("changing financial year re-resolves rules (PAY-AC-005)", async ({ page }) => {
    await page.goto("/au/pay-tax/pay-calculator");
    await page.getByLabel("Income amount").fill("100000");
    await expect(page.getByRole("status").filter({ hasText: "$2,980.00" })).toBeVisible();
    await page.getByLabel("Financial year").selectOption("2025-26");
    // FY2025-26 second bracket is 16% (not 15%): tax 20,788 + 2,000 levy →
    // liability 22,788, net 77,212, fortnightly 2,969.69.
    await expect(page.getByRole("status").filter({ hasText: "$2,969.69" })).toBeVisible();
  });

  test("advanced mode exposes withholding, super, adjustments and Medicare fields", async ({ page }) => {
    await page.goto("/au/pay-tax/pay-calculator");
    await page.getByRole("radio", { name: "Advanced" }).click();
    await expect(page.getByLabel("Claims the tax-free threshold")).toBeVisible();
    await expect(page.getByLabel("Salary sacrifice to super (annual)")).toBeVisible();
    await expect(page.getByLabel("Medicare levy status")).toBeVisible();
  });

  test("net-to-gross solves and round-trips", async ({ page }) => {
    await page.goto("/au/pay-tax/net-to-gross-calculator");
    await page.getByLabel("Target take-home amount").fill("77480");
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();
    await expect(page.getByText(/Re-running the forward calculator/)).toBeVisible();
  });

  test("PAYG withholding uses the schedule, not division", async ({ page }) => {
    await page.goto("/au/pay-tax/payg-withholding-calculator");
    await page.getByLabel("Gross earnings per pay").fill("2000");
    // Fortnightly $2,000 → weekly x=1000.99, scale 2 → $138/week → $276.
    await expect(page.getByRole("status").filter({ hasText: "$276.00" })).toBeVisible();
    await expect(page.getByText(/statement-of-formulas|y = a·x − b/)).toBeVisible();
  });

  test("HELP repayment reproduces the marginal system", async ({ page }) => {
    await page.goto("/au/pay-tax/help-repayment-calculator");
    await page.getByLabel("Repayment income").fill("86380");
    // Christina's official worked example: $2,527.80.
    await expect(page.getByRole("status").filter({ hasText: "$2,527.80" })).toBeVisible();
  });

  test("hourly-to-salary derives the annual base", async ({ page }) => {
    await page.goto("/au/pay-tax/hourly-to-salary-calculator");
    await page.getByLabel("Income amount").fill("50");
    // $50 × 38 h × 52 wk = $98,800.
    await expect(page.getByRole("status").filter({ hasText: "$98,800.00" })).toBeVisible();
  });
});
