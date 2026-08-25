import { expect, test } from "@playwright/test";

test("preview dashboard supports core navigation", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "What this month needs to do." })).toBeVisible();
  await expect(page.getByText("Plan versus actual")).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
});

test("income separates usable cash from total compensation", async ({ page }) => {
  await page.goto("/income");
  await expect(page.getByRole("heading", { name: "Income" })).toBeVisible();
  await expect(page.getByText("Spendable each month")).toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: "Spendable each month" }),
  ).toContainText(/\$\d/);
  await expect(page.getByText("Total compensation")).toBeVisible();
  await expect(page.getByText("employer-paid, non-cash")).toBeVisible();
});

test("hourly income edits recalculate and persist", async ({ page }) => {
  await page.goto("/income");
  const hourlyCard = page
    .getByRole("heading", { name: /Weekend work|Lumber Jill/i })
    .locator("xpath=ancestor::section[1]");
  await hourlyCard.getByRole("button", { name: "Edit assumptions" }).click();
  await page.getByLabel("Hourly rate").fill("35");
  await page.getByLabel("Expected hours / week").fill("8");
  await page.getByRole("button", { name: "Save assumptions" }).click();
  await expect(page.getByText("Income source updated.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.reload();
  const updatedHourlyCard = page
    .getByRole("heading", { name: /Weekend work|Lumber Jill/i })
    .locator("xpath=ancestor::section[1]");
  await expect(updatedHourlyCard).toContainText("$280.00 expected weekly");
});

test("unknown bill dates enter a review workflow", async ({ page }) => {
  await page.goto("/bills");
  await expect(page.getByRole("heading", { name: "Bills and spending plan" })).toBeVisible();
  await expect(page.getByText(/schedule.*needs? review/)).toBeVisible();
});

test("bill due dates can be saved and persist", async ({ page }) => {
  await page.goto("/bills");
  const bill = page
    .getByRole("heading", { name: /Auto insurance/i })
    .locator("xpath=ancestor::article[1]");
  await bill.getByLabel(/Next date/).fill("2026-11-15");
  await bill.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Due date updated.")).toBeVisible();
  await page.reload();
  await expect(bill.getByLabel(/Next date/)).toHaveValue("2026-11-15");
});

test("receipt workflow requires review before confirmation", async ({ page }) => {
  await page.goto("/transactions?receipt=1");
  await expect(page.getByRole("heading", { name: "Scan a receipt" })).toBeVisible();
  await expect(page.getByText("You approve every transaction")).toBeVisible();
});

test("scenario planner updates its projection", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByRole("heading", { name: "Plan" })).toBeVisible();
  await expect(page.getByText("No AI math, no hidden assumptions.")).toBeVisible();
});

test("plan budgets can be edited", async ({ page }) => {
  await page.goto("/plan");
  await page.getByRole("button", { name: "Edit Groceries" }).click();
  await page.getByLabel("Monthly limit").fill("700");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Budget updated.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("$700.00 limit")).toBeVisible();
});
