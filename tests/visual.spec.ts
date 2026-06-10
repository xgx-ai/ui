import { expect, test } from "@playwright/test";

const routes = ["foundations", "controls", "forms", "data", "reporting", "async"] as const;

for (const route of routes) {
  test(`visual baseline: ${route}`, async ({ page }) => {
    await page.goto(`/#${route}`);
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          caret-color: transparent !important;
          transition-duration: 0s !important;
        }
      `,
    });
    await expect(page.getByRole("heading").first()).toBeVisible();
    if (route === "async") {
      await expect(page.getByTestId("async-summary-ready")).toBeVisible();
    }

    await expect(page).toHaveScreenshot(`${route}.png`, {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
}
