import { createRoot } from "solid-js";
import { createStore as createFlowStore } from "../src/flow/store/index.ts";
import type { Edge, Node } from "../src/flow/types/index.ts";

type TestCase = {
  name: string;
  run: () => Promise<void> | void;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function withStore(run: (store: ReturnType<typeof createFlowStore>) => void | Promise<void>) {
  return createRoot(async (dispose) => {
    const store = createFlowStore({
      edges: [{ id: "edge-a-b", source: "a", target: "b" }] satisfies Edge[],
      height: 600,
      nodes: [
        { data: {}, id: "a", position: { x: 0, y: 0 }, selected: true },
        { data: {}, id: "b", position: { x: 100, y: 100 } },
      ] satisfies Node[],
      props: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      width: 800,
    });

    try {
      await run(store);
    } finally {
      dispose();
    }
  });
}

test("updates node positions during drag", () =>
  withStore((store) => {
    store.updateNodePositions(
      new Map([["a", { position: { x: 24, y: 36 } } as any]]),
      true,
    );

    const node = store.nodes.find((entry) => entry.id === "a");
    assert(node, "Missing dragged node");
    assertEqual(node.position.x, 24, "Drag did not update x position");
    assertEqual(node.position.y, 36, "Drag did not update y position");
    assertEqual(node.dragging, true, "Drag did not mark node as dragging");
  }));

test("selects nodes and clears previous selection", () =>
  withStore((store) => {
    store.addSelectedNodes(["b"]);

    assertEqual(
      Boolean(store.nodes.find((entry) => entry.id === "a")?.selected),
      false,
      "Previous node selection was not cleared",
    );
    assertEqual(
      Boolean(store.nodes.find((entry) => entry.id === "b")?.selected),
      true,
      "New node selection was not applied",
    );
  }));

test("delegates zoom and center operations to panZoom", async () =>
  withStore(async (store) => {
    const calls: string[] = [];

    Object.defineProperty(store, "panZoom", {
      configurable: true,
      value: {
        scaleBy(factor: number) {
          calls.push(`scaleBy:${factor}`);
          return Promise.resolve(true);
        },
        setViewport(viewport: { x: number; y: number; zoom: number }) {
          calls.push(`setViewport:${viewport.zoom}`);
          return Promise.resolve(true);
        },
      },
    });

    assertEqual(await store.zoomIn(), true, "zoomIn did not resolve true");
    assertEqual(await store.zoomOut(), true, "zoomOut did not resolve true");
    assertEqual(
      await store.setCenter(100, 120, { zoom: 1.5 }),
      true,
      "setCenter did not resolve true",
    );

    assert(calls.includes("scaleBy:1.2"), "zoomIn did not scale up");
    assert(
      calls.some((call) => call.startsWith("scaleBy:0.833333")),
      "zoomOut did not scale down",
    );
    assert(calls.includes("setViewport:1.5"), "setCenter did not set viewport");
  }));

test("resets selection state", () =>
  withStore((store) => {
    store.unselectNodesAndEdges();

    assert(
      store.nodes.every((node) => !node.selected),
      "Node selection was not cleared",
    );
    assert(
      store.edges.every((edge) => !edge.selected),
      "Edge selection was not cleared",
    );
  }));

export default async function runFlowSpec() {
  for (const entry of tests) {
    await entry.run();
  }
}
