import { expect, type Page, test } from "@playwright/test";

function observeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      /STRICT_READ_UNTRACKED|WRITE_UNDER|OWNED_SCOPE|REACTIVITY_HALTED|invalid cleanup/i.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  return errors;
}

async function openOuter(page: Page) {
  await page.goto("#overlays");
  await page.getByRole("button", { name: "Outer panel", exact: true }).click();
  const outer = page.getByTestId("outer-layer");
  await expect(outer).toBeVisible();
  return outer;
}

test("a popover inside a portalled popover dismisses from the innermost layer out", async ({
  page,
}) => {
  const errors = observeErrors(page);
  const outer = await openOuter(page);
  const innerTrigger = page.getByRole("button", { name: "Inner panel", exact: true });
  const inner = page.getByTestId("inner-layer");
  await innerTrigger.click();
  await expect(inner).toBeVisible();
  // The inner panel is portalled outside the outer panel's DOM.
  expect(
    await inner.evaluate(
      (element, outerId) => element.closest(`[data-testid="${outerId}"]`),
      "outer-layer",
    ),
  ).toBeNull();

  await inner.getByRole("button", { name: "Inner action", exact: true }).click();
  await expect(page.getByTestId("layer-actions")).toHaveText("Inner action ran");
  await expect(inner).toBeVisible();
  await expect(outer).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(inner).toBeHidden();
  await expect(outer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(outer).toBeHidden();

  await page.getByRole("button", { name: "Outer panel", exact: true }).click();
  await innerTrigger.click();
  await expect(inner).toBeVisible();
  await outer.getByText("Outer panel controls").click();
  await expect(inner).toBeHidden();
  await expect(outer).toBeVisible();

  await innerTrigger.click();
  await expect(inner).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(inner).toBeHidden();
  await expect(outer).toBeHidden();
  expect(errors).toEqual([]);
});

test("portalled menus inside a popover act without dismissing it", async ({ page }) => {
  const errors = observeErrors(page);
  const outer = await openOuter(page);
  const log = page.getByTestId("layer-actions");

  await page.getByRole("button", { name: "Panel actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Run panel action", exact: true }).click();
  await expect(log).toHaveText("Panel action ran");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(outer).toBeVisible();

  await page.getByRole("button", { name: "Panel actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "More panel actions", exact: true }).hover();
  await page.getByRole("menuitem", { name: "Run nested action", exact: true }).click();
  await expect(log).toHaveText("Panel action ran, Nested action ran");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(outer).toBeVisible();

  await page.getByRole("button", { name: "More panel options", exact: true }).click();
  await page.getByRole("menuitem", { name: "Run more option", exact: true }).click();
  await expect(log).toHaveText("Panel action ran, Nested action ran, More option ran");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(outer).toBeVisible();

  // Escape closes the open menu first, then the popover that contains it.
  await page.getByRole("button", { name: "Panel actions", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(outer).toBeVisible();
  await expect(page.getByRole("button", { name: "Panel actions", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(outer).toBeHidden();
  expect(errors).toEqual([]);
});

test("a portalled select inside a popover chooses and closes without dismissing it", async ({
  page,
}) => {
  const errors = observeErrors(page);
  const outer = await openOuter(page);
  const status = page.getByRole("button", { name: "Panel status", exact: true });
  await expect(status).toHaveText("Choose status");
  await status.click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  expect(
    await listbox.evaluate((element) => element.closest('[data-testid="outer-layer"]')),
  ).toBeNull();
  await page.getByRole("option", { name: "Closed", exact: true }).click();
  await expect(status).toHaveText("Closed");
  await expect(listbox).toBeHidden();
  await expect(outer).toBeVisible();

  await status.click();
  await expect(listbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(listbox).toBeHidden();
  await expect(outer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(outer).toBeHidden();
  expect(errors).toEqual([]);
});

test("submenu open changes report only real changes", async ({ page }) => {
  const errors = observeErrors(page);
  await openOuter(page);
  const changes = page.getByTestId("submenu-changes");
  await page.getByRole("button", { name: "Panel actions", exact: true }).click();
  const plain = page.getByRole("menuitem", { name: "Plain panel action", exact: true });
  const run = page.getByRole("menuitem", { name: "Run panel action", exact: true });
  const more = page.getByRole("menuitem", { name: "More panel actions", exact: true });
  await plain.hover();
  await run.hover();
  await plain.hover();
  await expect(changes).toHaveText("Submenu changes: none");
  await more.hover();
  await expect(
    page.getByRole("menuitem", { name: "Run nested action", exact: true }),
  ).toBeVisible();
  await expect(changes).toHaveText("Submenu changes: open");
  await more.hover({ position: { x: 4, y: 4 } });
  await plain.hover();
  await expect(page.getByRole("menuitem", { name: "Run nested action", exact: true })).toBeHidden();
  await run.hover();
  await plain.hover();
  await expect(changes).toHaveText("Submenu changes: open, closed");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(changes).toHaveText("Submenu changes: open, closed");
  expect(errors).toEqual([]);
});

test("context menus focus their first item, act, and dismiss outside or on Escape", async ({
  page,
}) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const area = page.getByTestId("context-menu-area");
  await area.click({ button: "right" });
  const rename = page.getByRole("menuitem", { name: "Rename record", exact: true });
  await expect(rename).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Move record", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await area.click({ button: "right" });
  await expect(rename).toBeFocused();
  await page.mouse.click(5, 5);
  await expect(page.getByRole("menu")).toHaveCount(0);

  await area.click({ button: "right" });
  await rename.click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByTestId("context-menu-result")).toHaveText("Record renamed");
  expect(errors).toEqual([]);
});
