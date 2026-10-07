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

test("a response dialog does not inherit the previous dialog's template", async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const result = page.getByTestId("response-result");
  await page.getByRole("button", { name: "Archive with note", exact: true }).click();
  const alert = page.getByRole("dialog", { name: "Archive record" });
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(result).toHaveText("Archive: true");

  const note = page.getByRole("dialog", { name: "Archive note" });
  await expect(note).toBeVisible();
  await expect(note.getByRole("button", { name: "Archive", exact: true })).toHaveCount(0);
  await note.getByRole("textbox", { name: "Archive note" }).fill("Duplicate entry");
  await note.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(result).toHaveText("Archive note: Duplicate entry");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a dialog opened straight after another mounts fresh and takes focus", async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  await page.getByRole("button", { name: "Two step review", exact: true }).click();
  const first = page.getByRole("dialog", { name: "Review step one" });
  await expect(first).toBeVisible();
  const firstHandle = await first.elementHandle();
  await first.getByRole("button", { name: "Next step", exact: true }).click();

  const second = page.getByRole("dialog", { name: "Review step two" });
  await expect(second).toBeVisible();
  await expect(second).toHaveAttribute("data-state", "open");
  expect(await firstHandle?.evaluate((element) => element.isConnected)).toBe(false);
  await expect(second.getByRole("textbox", { name: "Reviewer note" })).toBeFocused();
  await page.keyboard.type("Looks right");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("response-result")).toHaveText("Review note: Looks right");
  expect(errors).toEqual([]);
});

test("unmounting the dialog host resolves the waiting caller", async ({ page }) => {
  const errors = observeErrors(page);
  await page.goto("#overlays");
  const result = page.getByTestId("response-result");
  await page.getByRole("button", { name: "Pending decision", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Pending decision" })).toBeVisible();
  // The response dialog's overlay covers the page, so dispatch the click directly.
  await page
    .getByRole("button", { name: "Unmount dialog host", exact: true })
    .dispatchEvent("click");
  await expect(result).toHaveText("Pending decision: null");
  await expect(page.getByRole("dialog", { name: "Pending decision" })).toHaveCount(0);

  await page.getByRole("button", { name: "Mount dialog host", exact: true }).click();
  await page.getByRole("button", { name: "Pending decision", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pending decision" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(result).toHaveText("Pending decision: true");
  expect(errors).toEqual([]);
});
