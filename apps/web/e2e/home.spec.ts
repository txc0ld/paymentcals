import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("mortgage routes (scheduled ledger)", () => {
  test("repayment calculator matches the closed form: $500k @6% 30y → $2,997.75", async ({ page }) => {
    await page.goto("/au/property-mortgage/mortgage-repayment-calculator");
    await page.getByLabel("Loan amount").fill("500000");
    await page.getByLabel("Interest rate % p.a.").fill("6");
    await expect(page.getByRole("status").filter({ hasText: "$2,997.75" })).toBeVisible();
    await expect(page.getByText("Total interest", { exact: true })).toBeVisible();
    await expect(page.getByText("Schedule by year", { exact: false })).toBeVisible();
    // Let the dynamically imported chart finish mounting before the axe scan.
    await expect(page.getByText("Balance over time", { exact: false })).toBeVisible();
    await page.waitForTimeout(600);

    const results = await new AxeBuilder({ page }).exclude("header nav").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("offset calculator reports interest saved and cash retained separately", async ({ page }) => {
    await page.goto("/au/property-mortgage/offset-account-calculator");
    await page.getByLabel("Loan amount").fill("500000");
    await page.getByLabel("Interest rate % p.a.").fill("6");
    await page.getByLabel("Offset balance today").fill("50000");
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();
    await expect(page.getByText("Cash still yours in offset")).toBeVisible();
    await expect(page.getByText(/not a principal repayment/)).toBeVisible();
  });

  test("extra repayments show time saved on a dated schedule", async ({ page }) => {
    await page.goto("/au/property-mortgage/extra-repayments-calculator");
    await page.getByLabel("Loan amount").fill("500000");
    await page.getByLabel("Interest rate % p.a.").fill("6");
    await page.getByLabel("Extra repayment (per repayment period)").fill("500");
    await expect(page.getByText("Time saved", { exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();
  });

  test("rate change shows old and new repayment under a chosen reset policy", async ({ page }) => {
    await page.goto("/au/property-mortgage/rate-change-calculator");
    await page.getByLabel("Loan amount").fill("500000");
    await page.getByLabel("Interest rate % p.a.").fill("6");
    await page.getByLabel("New rate % p.a. (from 1 Jan 2027)").fill("7");
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();
    await expect(page.getByText(/Lifetime interest at new rate/)).toBeVisible();
  });

  test("refinance compares with residual balances, never repayments alone", async ({ page }) => {
    await page.goto("/au/property-mortgage/refinance-calculator");
    await page.getByLabel("Current loan balance").fill("480000");
    await page.getByLabel("Current rate % p.a.").fill("6.5");
    await page.getByLabel("New rate % p.a.").fill("5.5");
    await page.getByLabel("Switching costs paid in cash").fill("1100");
    await expect(page.getByText(/Ahead from/)).toBeVisible();
    await expect(page.getByText("Net switching cost", { exact: true })).toBeVisible();
  });

  test("simulator runs events and supports compare mode from identical facts", async ({ page }) => {
    await page.goto("/au/property-mortgage/mortgage-simulator");
    await page.getByLabel("Loan amount").fill("500000");
    await page.getByLabel("Interest rate % p.a.").fill("6");
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();

    await page.getByLabel("Add a timeline event").selectOption("extra_recurring");
    await page.getByLabel("Amount", { exact: true }).fill("400");
    await expect(page.getByText(/1 event/)).toBeVisible();

    await page.getByRole("radio", { name: "Compare" }).click();
    await expect(page.getByText("B starts as a copy of A")).toBeVisible();
    await expect(page.getByText("Scenario B · total interest")).toBeVisible();

    const results = await new AxeBuilder({ page }).exclude("header nav").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
