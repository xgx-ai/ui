import { expect, test } from "@playwright/test";

test("sidebar navigation exposes stable names and current page", async ({ page }) => {
  await page.goto("/#data");

  await expect(page.getByRole("navigation", { name: "Catalog sections" })).toMatchAriaSnapshot(`
      - navigation "Catalog sections":
        - button "Foundations"
        - button "Shell"
        - button "AI Workspace"
        - button "Auth & Access"
        - button "Controls"
        - button "Navigation"
        - button "Administration"
        - button "Forms"
        - button "Data"
        - button "Reporting"
        - button "Workflows"
        - button "Overlays"
        - button "Feedback"
        - button "Async Runtime"
        - button "Advanced"
        - button "Coverage"
    `);

  await expect(page.getByTitle("Data")).toHaveAttribute("aria-current", "page");
});

test("async select announces trigger state and option names", async ({ page }) => {
  await page.goto("/#async");

  await expect(page.getByTestId("async-select-trigger")).toMatchAriaSnapshot(`
    - button "Select reviewer"
  `);

  await page.getByTestId("async-select-load").click();
  await page.getByTestId("async-select-trigger").click();

  await expect(page.getByTestId("async-select-content")).toMatchAriaSnapshot(`
    - listbox:
      - option "Operations review Primary queue" [selected]
      - option "Risk review Escalation queue"
      - option "Legal review Policy queue"
  `);
});

test("schema form generated controls expose accessible names", async ({ page }) => {
  await page.goto("/#forms");

  await expect(page.getByPlaceholder("Access review")).toHaveAccessibleName(/Request title/);
  await expect(page.getByPlaceholder("owner@example.com")).toHaveAccessibleName(/Owner email/);
  await expect(page.getByRole("button", { name: "Priority" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: /Reviewer count/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Notify on submit" })).toBeVisible();
});
