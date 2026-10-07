import { expect, test } from "@playwright/test";
import { watchNativeDiagnostics } from "./native-diagnostics";

test("reactive accordion defaults seed once and controlled values keep updating", async ({
  page,
}) => {
  const diagnostics = watchNativeDiagnostics(page);
  await page.goto("#overlays");
  const defaults = page.getByTestId("default-accordion");
  const defaultFirst = defaults.getByRole("button", { name: "First section", exact: true });
  const defaultSecond = defaults.getByRole("button", { name: "Second section", exact: true });
  await expect(defaultFirst).toHaveAttribute("aria-expanded", "true");
  await expect(defaultSecond).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Change default section", exact: true }).click();
  await expect(defaultFirst).toHaveAttribute("aria-expanded", "true");
  await expect(defaultSecond).toHaveAttribute("aria-expanded", "false");
  await defaultSecond.click();
  await expect(defaultSecond).toHaveAttribute("aria-expanded", "true");
  await defaultFirst.click();
  await expect(defaultFirst).toHaveAttribute("aria-expanded", "false");
  await expect(defaults.getByText("Second section details")).toBeVisible();

  const controlled = page.getByTestId("controlled-accordion");
  const controlledFirst = controlled.getByRole("button", { name: "First section", exact: true });
  const controlledSecond = controlled.getByRole("button", { name: "Second section", exact: true });
  await expect(controlledFirst).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Change controlled section", exact: true }).click();
  await expect(controlledFirst).toHaveAttribute("aria-expanded", "false");
  await expect(controlledSecond).toHaveAttribute("aria-expanded", "true");
  await controlledFirst.click();
  await expect(controlledFirst).toHaveAttribute("aria-expanded", "true");
  await expect(controlledSecond).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Clear controlled sections", exact: true }).click();
  await expect(controlledFirst).toHaveAttribute("aria-expanded", "false");
  await expect(controlledSecond).toHaveAttribute("aria-expanded", "false");
  expect(diagnostics).toEqual([]);
});

test("a controlled single accordion closes when its value is cleared", async ({ page }) => {
  const diagnostics = watchNativeDiagnostics(page);
  await page.goto("#overlays");
  const single = page.getByTestId("single-accordion");
  const first = single.getByRole("button", { name: "First section", exact: true });
  const second = single.getByRole("button", { name: "Second section", exact: true });
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(second).toHaveAttribute("aria-expanded", "false");

  // Collapsing reports undefined; the echoed value must close it, not fall back to the default.
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "false");
  await second.click();
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Clear single section", exact: true }).click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "false");
  await first.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Close single section", exact: true }).click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "false");
  expect(diagnostics).toEqual([]);
});
