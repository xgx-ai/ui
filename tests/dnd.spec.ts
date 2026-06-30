import { expect, type Locator, type Page, test } from "@playwright/test";

async function sortableIds(list: Locator) {
  return list
    .locator("[data-sortable-id]")
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-sortable-id")));
}

async function renderTokensById(list: Locator) {
  return list
    .locator("[data-sortable-id]")
    .evaluateAll((items) =>
      Object.fromEntries(
        items.map((item) => [
          item.getAttribute("data-sortable-id"),
          item.firstElementChild?.getAttribute("data-render-token"),
        ]),
      ),
    );
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function itemCentre(page: Page, item: Locator) {
  const box = await item.boundingBox();
  if (!box) throw new Error("Sortable item has no bounding box");
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

async function dragItem(page: Page, item: Locator, target: Locator) {
  const start = await itemCentre(page, item);
  const end = await itemCentre(page, target);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
}

async function dragAcrossLists(page: Page, item: Locator, target: Locator) {
  const start = await itemCentre(page, item);
  const end = await itemCentre(page, target);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of [
    { x: start.x, y: start.y + 20 },
    { x: (start.x + end.x) / 2, y: start.y + 20 },
    { x: end.x - 100, y: end.y + 40 },
    { x: end.x, y: end.y + 40 },
    { x: end.x, y: end.y + 10 },
  ]) {
    await page.mouse.move(point.x, point.y, { steps: 12 });
    await page.waitForTimeout(80);
  }
  await page.mouse.up();
}

test("handle drag reorders the controlled sortable list", async ({ page }) => {
  await page.goto("/#dnd");

  const list = page.getByTestId("dnd-review-list");
  await expect(list).toBeVisible();
  await expect.poll(() => sortableIds(list)).toEqual(["intake", "evidence", "risk", "approval"]);

  await dragItem(
    page,
    list.locator('[data-sortable-id="intake"] [data-sortable-handle]'),
    list.locator('[data-sortable-id="risk"]'),
  );

  await expect.poll(() => sortableIds(list)).toEqual(["evidence", "intake", "risk", "approval"]);
});

test("whole-row drag works when no handle ref is registered", async ({ page }) => {
  const pageErrors = collectPageErrors(page);
  await page.goto("/#dnd");

  const list = page.getByTestId("dnd-store-list");
  await expect(list).toBeVisible();
  await expect.poll(() => sortableIds(list)).toEqual(["title", "owner", "due-date"]);

  await dragItem(
    page,
    list.locator('[data-sortable-id="title"]'),
    list.locator('[data-sortable-id="due-date"]'),
  );

  await expect.poll(() => sortableIds(list)).toEqual(["owner", "title", "due-date"]);
  expect(pageErrors).toEqual([]);
});

test("signal and store lists preserve keyed For row instances when reordered", async ({ page }) => {
  await page.goto("/#dnd");

  const signalList = page.getByTestId("dnd-review-list");
  const storeList = page.getByTestId("dnd-store-list");
  await expect(signalList).toBeVisible();
  await expect(storeList).toBeVisible();

  const signalTokensBefore = await renderTokensById(signalList);
  const storeTokensBefore = await renderTokensById(storeList);

  await dragItem(
    page,
    signalList.locator('[data-sortable-id="intake"] [data-sortable-handle]'),
    signalList.locator('[data-sortable-id="risk"]'),
  );
  await dragItem(
    page,
    storeList.locator('[data-sortable-id="title"]'),
    storeList.locator('[data-sortable-id="due-date"]'),
  );

  await expect
    .poll(() => sortableIds(signalList))
    .toEqual(["evidence", "intake", "risk", "approval"]);
  await expect.poll(() => sortableIds(storeList)).toEqual(["owner", "title", "due-date"]);
  await expect.poll(() => renderTokensById(signalList)).toEqual(signalTokensBefore);
  await expect.poll(() => renderTokensById(storeList)).toEqual(storeTokensBefore);
});

test("grouped lists move items across lists and emit move state", async ({ page }) => {
  await page.goto("/#dnd");

  const available = page.getByTestId("dnd-available-list");
  const selected = page.getByTestId("dnd-selected-list");
  await expect(available).toBeVisible();
  await expect(selected).toBeVisible();

  await dragAcrossLists(
    page,
    available.locator('[data-sortable-id="priority"] [data-sortable-handle]'),
    selected.locator('[data-sortable-id="summary"]'),
  );

  await expect.poll(() => sortableIds(available)).toEqual(["attachments", "notes"]);
  await expect.poll(() => sortableIds(selected)).toEqual(["priority", "summary", "assignee"]);
  await expect(page.getByTestId("dnd-last-move")).toContainText(
    "Priority: field-builder to field-builder",
  );
});
