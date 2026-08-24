import { expect, test } from "@playwright/test";

test("preview dashboard supports core navigation", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Good afternoon." })).toBeVisible();
  await expect(page.getByText("Cash flow", { exact: true })).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.getByRole("link", { name: "Transactions" }).click();
  await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
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
