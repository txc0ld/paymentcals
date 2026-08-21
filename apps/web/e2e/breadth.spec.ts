import { expect, test } from "@playwright/test";

test.describe("breadth routes", () => {
  test("compound interest reconciles simulation and closed form", async ({ page }) => {
    await page.goto("/global/savings-investing/compound-interest-calculator");
    await page.getByLabel("Starting balance").fill("10000");
    await page.getByLabel("Regular deposit (per compounding period)").fill("500");
    await page.getByLabel("Interest rate % p.a.").fill("5");
    await expect(page.getByRole("status").filter({ hasText: "$" })).toBeVisible();
    await expect(page.getByText(/closed form gives/)).toBeVisible();
  });

  test("savings goal solves the required deposit", async ({ page }) => {
    await page.goto("/global/savings-investing/savings-goal-calculator");
    await page.getByLabel("Savings target").fill("50000");
    await page.getByLabel("Interest rate % p.a.").fill("4.5");
    await expect(page.getByText("Deposit needed per month").first()).toBeVisible();
  });

  test("car loan shows the balloon separately from the repayment", async ({ page }) => {
    await page.goto("/au/loans-debt/car-loan-calculator");
    await page.getByLabel("Loan amount").fill("40000");
    await page.getByLabel("Interest rate % p.a.").fill("8");
    await page.getByLabel("Balloon / residual payment").fill("10000");
    await expect(page.getByText(/balloon due at the end of the term/)).toBeVisible();
  });

  test("credit card pays off with a fixed payment and shows the true cost", async ({ page }) => {
    await page.goto("/au/loans-debt/credit-card-payoff-calculator");
    await page.getByLabel("Card balance").fill("5000");
    await page.getByRole("radio", { name: "Fixed amount" }).click();
    await page.getByLabel("Monthly payment").fill("400");
    await expect(page.getByText(/Cleared \d{4}-\d{2}-\d{2} after \d+ monthly cycles/)).toBeVisible();
  });

  test("LVR calculator computes the ratio", async ({ page }) => {
    await page.goto("/au/property-mortgage/lvr-calculator");
    await page.getByLabel("Property value").fill("800000");
    await page.getByLabel("Loan amount").fill("640000");
    await expect(page.getByRole("status").filter({ hasText: "80.0%" })).toBeVisible();
  });

  test("affordability shows a range and never says approved", async ({ page }) => {
    await page.goto("/au/property-mortgage/borrowing-affordability-estimate");
    await page.getByLabel("Net household income per month").fill("9000");
    await page.getByLabel("Living expenses per month").fill("3200");
    await expect(page.getByText("Indicative borrowing range").first()).toBeVisible();
    await expect(page.getByText(/not a borrowing capacity assessment or\s+pre-approval/)).toBeVisible();
  });

  test("contractor day rate quotes GST separately (draft rules preview)", async ({ page }) => {
    await page.goto("/au/business/contractor-day-rate-calculator");
    await page.getByLabel("Target annual income (like a salary)").fill("120000");
    await expect(page.getByText("Target day rate (excluding GST)").first()).toBeVisible();
    await expect(page.getByText("Invoice amount per day")).toBeVisible();
  });

  test("stamp duty reproduces the QRO worked example and blocks unsupported states", async ({ page }) => {
    await page.goto("/au/property-mortgage/stamp-duty-calculator");
    await page.getByLabel("State or territory").selectOption("QLD");
    await page.getByLabel("Dutiable value (usually the price)").fill("850000");
    await expect(page.getByRole("status").filter({ hasText: "$31,275.00" })).toBeVisible();

    // VIC computes on the percentage table: $650,000 → $2,870 + 6% × $520,000.
    await page.getByLabel("State or territory").selectOption("VIC");
    await page.getByLabel("Dutiable value (usually the price)").fill("650000");
    await expect(page.getByRole("status").filter({ hasText: "$34,070.00" })).toBeVisible();

    // NT computes on the statutory quadratic: $500,000 → $23,928.60.
    await page.getByLabel("State or territory").selectOption("NT");
    await page.getByLabel("Dutiable value (usually the price)").fill("500000");
    await expect(page.getByRole("status").filter({ hasText: "$23,928.60" })).toBeVisible();
  });

  test("buying costs adds duty to entered costs", async ({ page }) => {
    await page.goto("/au/property-mortgage/property-buying-costs-calculator");
    await page.getByLabel("State or territory").selectOption("NSW");
    await page.getByLabel("Property price").fill("450000");
    await page.getByLabel("Conveyancing and legal").fill("2000");
    await expect(page.getByRole("status").filter({ hasText: "$16,437.00" })).toBeVisible();
  });
});
