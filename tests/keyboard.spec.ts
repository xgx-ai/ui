import { expect, test } from "@playwright/test";

test("sidebar navigation works from keyboard without reload", async ({ page }) => {
  await page.goto("/#foundations");
  const marker = `keyboard-${Date.now()}`;
  await page.evaluate((value) => {
    Object.assign(window, { __xgxKeyboardMarker: value });
  }, marker);

  await page.getByTitle("Reporting").focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/#reporting$/);
  await expect(page.getByRole("heading", { name: "Reporting", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __xgxKeyboardMarker?: string }).__xgxKeyboardMarker,
      ),
    )
    .toBe(marker);
});

test("dropdown menu opens and closes from keyboard", async ({ page }) => {
  await page.goto("/#overlays");

  await page.getByRole("button", { name: "Menu" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Assign owner" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
});

test("dropdown menu supports arrows, typeahead, and activation", async ({ page }) => {
  await page.goto("/#overlays");

  await page.getByRole("button", { name: "Menu" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.textContent?.trim()))
    .toBe("Assign owner");

  await page.keyboard.press("d");
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.textContent?.trim()))
    .toBe("Duplicate record");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeHidden();
});

test("dialog traps focus, closes on Escape, and restores focus", async ({ page }) => {
  await page.goto("/#overlays");

  const trigger = page.getByRole("button", { name: "Open dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Review decision" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-describedby", /.+/);

  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
      .toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("async select can load and commit options from keyboard", async ({ page }) => {
  await page.goto("/#async");

  await page.getByTestId("async-select-load").click();
  await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();

  const trigger = page.getByTestId("async-select-trigger");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(trigger).toContainText("Risk review");
});

test("tabs support arrow-key roving selection", async ({ page }) => {
  await page.goto("/#controls");

  const density = page.getByRole("tab", { name: "Density" });
  await density.focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.getByRole("tab", { name: "States" })).toHaveAttribute("aria-selected", "true");
});

test("toolbar toggle buttons respond to keyboard activation", async ({ page }) => {
  await page.goto("/#controls");

  const comfortable = page.getByRole("button", { name: "Comfortable" });
  await comfortable.focus();
  await page.keyboard.press("Space");

  await expect(comfortable).toHaveAttribute("aria-pressed", "true");
});

test("auth view segmented controls switch from keyboard", async ({ page }) => {
  await page.goto("/#auth");

  await page.getByRole("button", { name: "MFA" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Verify sign in" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Code digit 1" })).toBeVisible();
});
