import { expect, test } from "@playwright/test";

test("hash navigation swaps pages without a reload", async ({ page }) => {
  await page.goto("/#foundations");
  const marker = `marker-${Date.now()}`;
  await page.evaluate((value) => {
    Object.assign(window, { __xgxCiMarker: value });
  }, marker);

  await page.getByTitle("Data").click();

  await expect(page).toHaveURL(/#data$/);
  await expect(page.getByRole("heading", { name: "Data", exact: true })).toBeVisible();
  await expect(page.getByTitle("Data")).toHaveAttribute("aria-current", "page");
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __xgxCiMarker?: string }).__xgxCiMarker))
    .toBe(marker);
});

test("async portal triggers keep dialog and popover interactive", async ({ page }) => {
  await page.goto("/#async");

  await page.getByTestId("async-popover-trigger").click();
  await expect(page.getByTestId("async-popover-content")).toBeVisible();
  await page.mouse.click(20, 20);
  await expect(page.getByTestId("async-popover-content")).toBeHidden();

  await page.getByTestId("async-dialog-trigger").click();
  await expect(page.getByTestId("async-dialog-content")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Async portal opened" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("async-dialog-content")).toBeHidden();
});

test("deferred select shows fallback, loads options, and commits selection", async ({ page }) => {
  await page.goto("/#async");

  await page.getByTestId("async-select-trigger").click();
  await expect(page.getByText("Load options to populate this select.")).toBeVisible();
  await page.mouse.click(20, 20);

  await page.getByTestId("async-select-load").click();
  await expect(page.getByText("Ready")).toBeVisible();
  await page.getByTestId("async-select-trigger").click();
  await expect(
    page.getByTestId("async-select-content").getByText("Operations review"),
  ).toBeVisible();
  await page.getByRole("option", { name: /Risk review/ }).click();
  await expect(page.getByTestId("async-select-trigger")).toContainText("Risk review");

  await page.getByTestId("async-select-trigger").click();
  await expect(page.getByRole("option", { name: /Operations review/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Risk review/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Legal review/ })).toBeVisible();
});

test("schema form validates generated fields and uses real controls", async ({ page }) => {
  await page.goto("/#forms");

  await page.getByRole("button", { name: "Validate" }).click();
  await expect(page.getByText(/Request title must be/)).toBeVisible();
  await expect(page.getByText("Please enter a valid email address")).toBeVisible();

  await page.getByPlaceholder("Access review").fill("Access review");
  await page.getByPlaceholder("owner@example.com").fill("owner@example.com");
  await page.getByRole("checkbox", { name: "Notify on submit" }).click();
  await page.getByRole("button", { name: "Validate" }).click();

  await expect(page.getByText("Please enter a valid email address")).toBeHidden();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});
