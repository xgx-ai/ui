import { expect, test } from "@playwright/test";

function observeErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/STRICT_READ_UNTRACKED|WRITE_UNDER|REACTIVITY_HALTED|invalid cleanup/i.test(message.text()))
      errors.push(message.text());
  });
  return errors;
}

test("nested menus open separately, ignore disabled actions and close after stopped click propagation", async ({
  page,
}) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const trigger = page.getByRole("button", { name: "Menu", exact: true });
  await trigger.click();
  const submenu = page.getByRole("menuitem", { name: "Record tools", exact: true });
  const duplicate = page.getByRole("menuitem", { name: "Duplicate record", exact: true });
  await expect(duplicate).toBeHidden();
  await submenu.click();
  await expect(duplicate).toBeVisible();
  await expect(submenu).toHaveAttribute("aria-expanded", "true");
  const locked = page.getByRole("menuitem", { name: "Locked record", exact: true });
  await expect(locked).toHaveAttribute("aria-disabled", "true");
  await locked.dispatchEvent("click");
  await expect(page.getByText("Locked action ran", { exact: true })).toBeHidden();
  await duplicate.click();
  await expect(page.getByText("Record duplicated", { exact: true })).toBeVisible();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await trigger.click();
  await page.getByRole("menuitem", { name: "Assign owner", exact: true }).click();
  await expect(page.getByText("Owner assigned", { exact: true })).toBeVisible();
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("nested menu arrows and Escape preserve parent focus and skip disabled entries", async ({
  page,
}) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const trigger = page.getByRole("button", { name: "Menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Assign owner", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const submenu = page.getByRole("menuitem", { name: "Record tools", exact: true });
  await expect(submenu).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitem", { name: "Duplicate record", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(submenu).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(submenu).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(1);
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Archive", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("hovered submenus close on sibling actions and disabled submenus stay closed", async ({
  page,
}) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Record tools", exact: true }).hover();
  await expect(page.getByRole("menuitem", { name: "Duplicate record", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).hover();
  await expect(page.getByRole("menu")).toHaveCount(1);
  const disabled = page.getByRole("menuitem", { name: "Unavailable tools", exact: true });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await disabled.dispatchEvent("click");
  await expect(
    page.getByRole("menuitem", { name: "Unavailable action", exact: true }),
  ).toBeHidden();
  await page.mouse.click(20, 20);
  await expect(page.getByRole("menu")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Escape on a closed submenu trigger closes the parent menu and restores trigger focus", async ({
  page,
}) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const trigger = page.getByRole("button", { name: "Menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Assign owner", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const submenu = page.getByRole("menuitem", { name: "Record tools", exact: true });
  await expect(submenu).toBeFocused();
  await expect(submenu).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("pointer-opened submenus leave focus in the parent menu", async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const assign = page.getByRole("menuitem", { name: "Assign owner", exact: true });
  await expect(assign).toBeFocused();
  const submenu = page.getByRole("menuitem", { name: "Record tools", exact: true });
  await submenu.hover();
  await expect(page.getByRole("menuitem", { name: "Duplicate record", exact: true })).toBeVisible();
  await expect(assign).toBeFocused();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).hover();
  await expect(page.getByRole("menu")).toHaveCount(1);
  await expect(assign).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(submenu).toBeFocused();
  expect(errors).toEqual([]);
});

test("closing a keyboard-opened submenu by pointer keeps focus in the menu", async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const trigger = page.getByRole("button", { name: "Menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const submenu = page.getByRole("menuitem", { name: "Record tools", exact: true });
  await expect(submenu).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitem", { name: "Duplicate record", exact: true })).toBeFocused();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).hover();
  await expect(page.getByRole("menu")).toHaveCount(1);
  await expect(submenu).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Archive", exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});
