import { expect, test } from "@playwright/test";

test("reactive accordion defaults seed once and controlled values keep updating", async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (
      /STRICT_READ_UNTRACKED|WRITE_UNDER|PRIMITIVE_IN_FORBIDDEN_SCOPE|REACTIVITY_HALTED|invalid cleanup/i.test(
        message.text(),
      )
    ) {
      diagnostics.push(message.text());
    }
  });
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
