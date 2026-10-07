import { expect, test } from "@playwright/test";

test("virtual popover anchors use pointer coordinates and fall back to the keyboard trigger", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (/STRICT_READ_UNTRACKED|WRITE_UNDER|REACTIVITY_HALTED|invalid cleanup/i.test(message.text()))
      errors.push(message.text());
  });
  await page.goto("#overlays");
  const trigger = page.getByTestId("pointer-popover-trigger");
  const triggerBox = (await trigger.boundingBox())!;
  await trigger.evaluate((element) =>
    element.addEventListener(
      "click",
      (event) => {
        element.dataset.pointerX = String(event.clientX);
        element.dataset.pointerY = String(event.clientY);
      },
      { once: true },
    ),
  );
  await trigger.click({ position: { x: 180, y: 34 } });
  const pointer = await trigger.evaluate((element) => ({
    x: Number(element.dataset.pointerX),
    y: Number(element.dataset.pointerY),
  }));
  const content = page.getByTestId("pointer-popover-content");
  await expect(content).toBeVisible();
  await expect(content).toHaveAttribute("role", "dialog");
  await expect
    .poll(async () => Math.round((await content.boundingBox())!.x))
    .toBe(Math.round(pointer.x));
  await expect
    .poll(async () => Math.round((await content.boundingBox())!.y))
    .toBe(Math.round(pointer.y + 8));
  await page.keyboard.press("Escape");
  await expect(content).toBeHidden();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(content).toBeVisible();
  await expect
    .poll(async () => Math.round((await content.boundingBox())!.x))
    .toBe(Math.round(triggerBox.x));
  await expect
    .poll(async () => Math.round((await content.boundingBox())!.y))
    .toBe(Math.round(triggerBox.y + triggerBox.height + 8));
  await page.keyboard.press("Escape");
  await expect(content).toBeHidden();
  expect(errors).toEqual([]);
});
