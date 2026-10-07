import { expect, test } from "@playwright/test";

test("standalone and grouped text fields retain controlled values and accessibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("#forms");

  const standalone = page.getByRole("textbox", { name: "Request name", exact: true });
  await expect(standalone).toHaveAttribute("aria-describedby", "request-name-description");
  await standalone.fill("  Operational review");
  await expect(standalone).toHaveValue("Operational review");

  const grouped = page.getByRole("textbox", { name: "Decision notes", exact: true });
  await grouped.fill("  Decision confirmed");
  await expect(grouped).toHaveValue("Decision confirmed");
  await expect(page.getByRole("textbox", { name: "Reviewer email", exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(errors).toEqual([]);
});

test("controlled text fields show input that normalises to the current value", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("#forms");

  // Both fields trim leading whitespace, so a leading space leaves the controlled value empty.
  const standalone = page.getByRole("textbox", { name: "Request name", exact: true });
  await standalone.pressSequentially(" ");
  await standalone.blur();
  await expect(standalone).toHaveValue("");
  await standalone.pressSequentially(" Review");
  await expect(standalone).toHaveValue("Review");

  const grouped = page.getByRole("textbox", { name: "Decision notes", exact: true });
  await grouped.pressSequentially(" ");
  await grouped.blur();
  await expect(grouped).toHaveValue("");
  await grouped.pressSequentially(" Agreed");
  await expect(grouped).toHaveValue("Agreed");
  expect(errors).toEqual([]);
});
