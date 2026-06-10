import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "foundations",
  "shell",
  "controls",
  "forms",
  "data",
  "overlays",
  "async",
  "auth",
  "ai",
] as const;

for (const route of routes) {
  test(`axe scan: ${route}`, async ({ page }) => {
    await page.goto(`/#${route}`);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test.describe("mobile dark axe smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of ["shell", "forms", "async"] as const) {
    test(`mobile dark axe scan: ${route}`, async ({ page }) => {
      await page.goto(`/#${route}`);
      await page.getByRole("button", { name: "Dark theme" }).click();
      await expect(page.locator("main, [role='main']").first()).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
