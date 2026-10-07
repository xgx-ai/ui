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
