import { expect, test } from "@playwright/test";

test("filter trigger is one named button and works from the keyboard", async ({ page }) => {
  const diagnostics: string[] = [];
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (
      /STRICT_READ_UNTRACKED|WRITE_UNDER|REACTIVITY_HALTED|invalid cleanup/i.test(message.text())
    ) {
      diagnostics.push(message.text());
    }
  });
  await page.goto("/#overlays");

  const trigger = page.getByRole("button", { name: "Filter", exact: true });
  const content = page.getByTestId("default-filter-content");
  await expect(trigger).toHaveAttribute("type", "button");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger.locator("button")).toHaveCount(0);
  await expect(page.locator("[data-filter-button]")).toHaveCount(2);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(content).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(content).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(content).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(content).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(diagnostics).toEqual([]);
});

test("filter styling stays configurable while counts update and reset", async ({ page }) => {
  await page.goto("/#overlays");

  const defaultTrigger = page.getByRole("button", { name: "Filter", exact: true });
  const trigger = page.getByRole("button", { name: "Filter records", exact: true });
  const count = trigger.locator("[data-filter-count]");
  const content = page.getByTestId("custom-filter-content");
  await expect(defaultTrigger).toHaveClass(/h-10/);
  await expect(defaultTrigger).not.toHaveClass(/rounded-full/);
  await expect(trigger).toHaveClass(/rounded-full/);
  await expect(trigger).toHaveClass(/h-8/);
  await expect(count).toHaveCount(0);

  await trigger.click();
  await expect(content).toBeVisible();
  for (const attribute of ["triggerLabel", "triggerClass", "triggerSize", "countClass"]) {
    await expect(content).not.toHaveAttribute(attribute);
  }
  await content.getByRole("checkbox", { name: "Show archived records" }).check();
  await expect(count).toHaveText("1");
  await expect(count).toHaveClass(/bg-secondary/);
  await expect(count).toHaveClass(/text-secondary-foreground/);
  await expect(count).not.toHaveClass(/bg-primary/);
  await expect(trigger).toHaveAccessibleName("Filter records");
  await content.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(count).toHaveCount(0);
  await expect(content.getByRole("checkbox", { name: "Show archived records" })).not.toBeChecked();
  await page.getByRole("heading", { name: "Filter popovers", exact: true }).click();
  await expect(content).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("selecting a filter keeps its parent popover open after the option unmounts", async ({
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
  const trigger = page.getByRole("button", { name: "Filter", exact: true });
  const content = page.getByTestId("default-filter-content");
  await trigger.click();
  const status = content.getByRole("button", { name: "Filter status", exact: true });
  await expect(status).toHaveText("All");
  await status.click();
  await page.getByRole("option", { name: "Dormant", exact: true }).click();
  await expect(content).toBeVisible();
  await expect(status).toHaveText("Dormant");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await content.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(status).toHaveText("All");
  await page.getByRole("heading", { name: "Filter popovers", exact: true }).click();
  await expect(content).toBeHidden();
  expect(diagnostics).toEqual([]);
});
