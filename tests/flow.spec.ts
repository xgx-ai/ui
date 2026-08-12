import { expect, type Page, test } from "@playwright/test";

/**
 * Interaction coverage for @xgx/ui/flow.
 *
 * packages/ui/test/flow.spec.ts already covers the store in isolation. Everything here
 * needs a real browser instead: layout (the port measures nodes and its own container
 * through ResizeObserver), pointer sequences (node dragging and connecting both go
 * through @xyflow/system's d3-style drag), and the interaction between the two.
 *
 * The fixture is apps/demo/src/examples/flow-harness.tsx, at `?harness=flow`.
 */

type HarnessNode = {
  dragging: boolean;
  id: string;
  selected: boolean;
  x: number;
  y: number;
};

type HarnessEdge = {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
};

const harnessUrl = "/?harness=flow";

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function gotoHarness(page: Page) {
  await page.goto(harnessUrl);
  await page.waitForFunction(() => Boolean(window.__flowHarness));
  // Nodes are measured a frame after mount; every assertion below depends on it.
  await page.waitForFunction(() => {
    const measured = window.__flowHarness?.measured() ?? {};
    const entries = Object.values(measured);
    return entries.length > 0 && entries.every((size) => Boolean(size?.width));
  });
}

const readNodes = (page: Page) =>
  page.evaluate(() => window.__flowHarness?.nodes() ?? []) as Promise<HarnessNode[]>;

const readEdges = (page: Page) =>
  page.evaluate(() => window.__flowHarness?.edges() ?? []) as Promise<HarnessEdge[]>;

const nodeById = (nodes: HarnessNode[], id: string) => {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`No node ${id} in the harness`);
  return node;
};

async function centreOf(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} has no bounding box`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

const nodeSelector = (id: string) => `.xy-flow__node[data-id="${id}"]`;

const handleSelector = (id: string, type: "source" | "target", handleId?: string) =>
  `${nodeSelector(id)} .xy-flow__handle.${type}${handleId ? `[data-handleid="${handleId}"]` : ""}`;

/**
 * A click as a hand makes it: press, a couple of pixels of travel, release. A perfectly
 * still synthetic click can pass while every real one fails, so the suite never uses one
 * where a user would click.
 */
async function humanClick(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 2, point.y + 1, { steps: 2 });
  await page.mouse.up();
}

async function dragBy(page: Page, from: { x: number; y: number }, delta: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + delta.x / 2, from.y + delta.y / 2, { steps: 6 });
  await page.mouse.move(from.x + delta.x, from.y + delta.y, { steps: 6 });
  await page.mouse.up();
}

test.describe("mounting and measurement", () => {
  test("renders every node, the edge and the plugins", async ({ page }) => {
    const errors = collectPageErrors(page);
    await gotoHarness(page);

    await expect(page.locator(".xy-flow__node")).toHaveCount(5);
    await expect(page.locator(".xy-flow__edge")).toHaveCount(1);
    await expect(page.locator(".xy-flow__background")).toBeVisible();
    await expect(page.locator(".xy-flow__minimap")).toBeVisible();
    await expect(page.getByTestId("flow-panel")).toHaveText("harness");
    expect(errors).toEqual([]);
  });

  test("resolves each node to its registered custom type", async ({ page }) => {
    await gotoHarness(page);

    // A type with no entry in `nodeTypes` silently falls back to DefaultNode, which
    // renders `data.label` and nothing else — the usual cause of a "blank" node.
    await expect(page.locator(".xy-flow__node-card")).toHaveCount(4);
    await expect(page.locator(".xy-flow__node-branch")).toHaveCount(1);
    await expect(page.getByTestId("card-node")).toHaveCount(4);
    await expect(page.getByTestId("branch-node")).toHaveCount(1);
  });

  test("measures the container, not just the nodes", async ({ page }) => {
    await gotoHarness(page);

    // With no container size, fitView clamps to the minimum zoom and edges never lay
    // out, so a graph renders as nodes with nothing joining them.
    const size = await page.evaluate(() => window.__flowHarness?.size());
    expect(size?.width).toBeGreaterThan(0);
    expect(size?.height).toBeGreaterThan(0);
  });

  test("gives every node real measured dimensions", async ({ page }) => {
    await gotoHarness(page);

    const measured = await page.evaluate(() => window.__flowHarness?.measured() ?? {});
    for (const [id, size] of Object.entries(measured)) {
      expect(size?.width, `${id} width`).toBeGreaterThan(0);
      expect(size?.height, `${id} height`).toBeGreaterThan(0);
    }
  });

  test("draws a path for the seeded edge", async ({ page }) => {
    await gotoHarness(page);
    await expect(page.locator(".xy-flow__edge-path")).toHaveCount(1);
  });
});

test.describe("selection", () => {
  test("selects a node when it is clicked", async ({ page }) => {
    await gotoHarness(page);

    await humanClick(page, await centreOf(page, nodeSelector("charlie")));

    const nodes = await readNodes(page);
    expect(nodeById(nodes, "charlie").selected).toBe(true);
    await expect(page.locator(nodeSelector("charlie"))).toHaveClass(/selected/);
  });

  test("tells the host about the selection", async ({ page }) => {
    await gotoHarness(page);

    await humanClick(page, await centreOf(page, nodeSelector("charlie")));

    await expect
      .poll(() => page.evaluate(() => window.__flowHarness?.selection() ?? []))
      .toEqual(["charlie"]);
  });

  test("moves the selection to the node most recently clicked", async ({ page }) => {
    await gotoHarness(page);

    await humanClick(page, await centreOf(page, nodeSelector("alpha")));
    await humanClick(page, await centreOf(page, nodeSelector("echo")));

    const nodes = await readNodes(page);
    expect(nodeById(nodes, "alpha").selected).toBe(false);
    expect(nodeById(nodes, "echo").selected).toBe(true);
  });
});

test.describe("dragging nodes", () => {
  test("moves the node that was grabbed", async ({ page }) => {
    await gotoHarness(page);
    const before = await readNodes(page);

    await dragBy(page, await centreOf(page, nodeSelector("charlie")), { x: 120, y: 40 });

    const after = await readNodes(page);
    expect(nodeById(after, "charlie").x).toBeCloseTo(nodeById(before, "charlie").x + 120, 0);
    expect(nodeById(after, "charlie").y).toBeCloseTo(nodeById(before, "charlie").y + 40, 0);
  });

  test("leaves every other node exactly where it was", async ({ page }) => {
    await gotoHarness(page);
    const before = await readNodes(page);

    await dragBy(page, await centreOf(page, nodeSelector("charlie")), { x: 120, y: 40 });

    const after = await readNodes(page);
    for (const node of after) {
      if (node.id === "charlie") continue;
      const original = nodeById(before, node.id);
      expect({ id: node.id, x: node.x, y: node.y }).toEqual({
        id: node.id,
        x: original.x,
        y: original.y,
      });
    }
  });

  test("drags each node in turn without ever moving a different one", async ({ page }) => {
    await gotoHarness(page);

    // The failure this covers is a node wrapper bound to the wrong id, which only shows
    // up once more than one node has been dragged in a single session.
    for (const id of ["alpha", "bravo", "charlie", "echo"]) {
      const before = await readNodes(page);
      await dragBy(page, await centreOf(page, nodeSelector(id)), { x: 40, y: 20 });
      const after = await readNodes(page);

      expect(nodeById(after, id).x, `${id} x`).toBeCloseTo(nodeById(before, id).x + 40, 0);
      for (const node of after) {
        if (node.id === id) continue;
        expect({ id: node.id, x: node.x }, `${node.id} moved while dragging ${id}`).toEqual({
          id: node.id,
          x: nodeById(before, node.id).x,
        });
      }
    }
  });

  test("clears the dragging flag when the pointer is released", async ({ page }) => {
    await gotoHarness(page);

    await dragBy(page, await centreOf(page, nodeSelector("charlie")), { x: 60, y: 0 });

    const nodes = await readNodes(page);
    expect(nodes.filter((node) => node.dragging)).toEqual([]);
  });
});

test.describe("connecting nodes", () => {
  test("creates an edge when a source handle is dragged onto a target handle", async ({ page }) => {
    await gotoHarness(page);

    await dragBy(
      page,
      await centreOf(page, handleSelector("charlie", "source")),
      await (async () => {
        const from = await centreOf(page, handleSelector("charlie", "source"));
        const to = await centreOf(page, handleSelector("echo", "target"));
        return { x: to.x - from.x, y: to.y - from.y };
      })(),
    );

    await expect
      .poll(() => readEdges(page))
      .toContainEqual(expect.objectContaining({ source: "charlie", target: "echo" }));
  });

  test("shows a connection line while the drag is in flight", async ({ page }) => {
    await gotoHarness(page);
    const from = await centreOf(page, handleSelector("charlie", "source"));
    const to = await centreOf(page, handleSelector("echo", "target"));

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });

    await expect(page.locator(".xy-flow__connectionline")).toBeVisible();
    await page.mouse.up();
  });

  test("tells the host about the connection", async ({ page }) => {
    await gotoHarness(page);
    const from = await centreOf(page, handleSelector("charlie", "source"));
    const to = await centreOf(page, handleSelector("echo", "target"));

    await dragBy(page, from, { x: to.x - from.x, y: to.y - from.y });

    await expect.poll(() => page.evaluate(() => window.__flowHarness?.connectCount())).toBe(1);
  });

  test("records which leg a branch connection left by", async ({ page }) => {
    await gotoHarness(page);
    const from = await centreOf(page, handleSelector("delta", "source", "no"));
    const to = await centreOf(page, handleSelector("echo", "target"));

    await dragBy(page, from, { x: to.x - from.x, y: to.y - from.y });

    await expect
      .poll(() => readEdges(page))
      .toContainEqual(
        expect.objectContaining({ source: "delta", sourceHandle: "no", target: "echo" }),
      );
  });

  test("connects by clicking one handle and then the other", async ({ page }) => {
    await gotoHarness(page);

    await humanClick(page, await centreOf(page, handleSelector("charlie", "source")));
    await humanClick(page, await centreOf(page, handleSelector("echo", "target")));

    await expect
      .poll(() => readEdges(page))
      .toContainEqual(expect.objectContaining({ source: "charlie", target: "echo" }));
  });

  test("refuses to connect a node to itself", async ({ page }) => {
    await gotoHarness(page);
    const from = await centreOf(page, handleSelector("charlie", "source"));
    const to = await centreOf(page, handleSelector("charlie", "target"));

    await dragBy(page, from, { x: to.x - from.x, y: to.y - from.y });

    const edges = await readEdges(page);
    expect(edges.filter((edge) => edge.source === edge.target)).toEqual([]);
  });

  test("does not move the node when a connection is dragged off its handle", async ({ page }) => {
    await gotoHarness(page);
    const before = await readNodes(page);
    const from = await centreOf(page, handleSelector("charlie", "source"));
    const to = await centreOf(page, handleSelector("echo", "target"));

    await dragBy(page, from, { x: to.x - from.x, y: to.y - from.y });

    const after = await readNodes(page);
    expect(nodeById(after, "charlie").x).toBe(nodeById(before, "charlie").x);
    expect(nodeById(after, "charlie").y).toBe(nodeById(before, "charlie").y);
  });
});

test.describe("viewport", () => {
  test("pans when the background is dragged", async ({ page }) => {
    await gotoHarness(page);
    const before = await page.evaluate(() => window.__flowHarness?.viewport());

    await dragBy(page, { x: 950, y: 620 }, { x: -80, y: -40 });

    const after = await page.evaluate(() => window.__flowHarness?.viewport());
    expect(after?.x).not.toBe(before?.x);
  });

  test("keeps node positions unchanged while panning", async ({ page }) => {
    await gotoHarness(page);
    const before = await readNodes(page);

    await dragBy(page, { x: 950, y: 620 }, { x: -80, y: -40 });

    expect(await readNodes(page)).toEqual(before);
  });

  test("zooms on wheel", async ({ page }) => {
    await gotoHarness(page);
    const before = await page.evaluate(() => window.__flowHarness?.viewport());

    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -240);

    await expect
      .poll(() => page.evaluate(() => window.__flowHarness?.viewport().zoom))
      .not.toBe(before?.zoom);
  });
});
