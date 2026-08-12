import {
  getGridCanvasPhase,
  getGridCanvasPixelRatio,
  interpolateWorkspaceCamera,
  screenToWorldPoint,
  worldToScreenPoint,
  zoomCameraAtPoint,
} from "../src/workspace/workspace-canvas.ts";

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

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}`);
  }
}

test("grid phase stays aligned across nested resolution levels", () => {
  const cameraOffset = -37;
  const fineSpacing = 14;
  const coarseSpacing = fineSpacing * 2;
  const finePhase = getGridCanvasPhase(cameraOffset, fineSpacing);
  const coarsePhase = getGridCanvasPhase(cameraOffset, coarseSpacing);

  assertEqual((coarsePhase - finePhase) % fineSpacing, 0, "coarse and fine grids share a phase");
  assertEqual(getGridCanvasPhase(-1, fineSpacing), 13, "phase wraps positively");
});

test("grid canvas resolution caps DPR and total backing pixels", () => {
  assertEqual(getGridCanvasPixelRatio(1_000, 800, 4), 2, "DPR is capped at 2");

  const largeDisplayRatio = getGridCanvasPixelRatio(4_000, 3_000, 3);
  assert(largeDisplayRatio < 1, "a very large surface drops below 1x");
  assert(
    4_000 * 3_000 * largeDisplayRatio ** 2 <= 8_388_608.000_001,
    "the backing store stays within its pixel budget",
  );
});

test("zooming keeps the selected screen point anchored", () => {
  assertDeepEqual(
    zoomCameraAtPoint({ x: 100, y: 50, zoom: 1 }, 2, { x: 400, y: 300 }, 0.2, 3),
    { x: -200, y: -200, zoom: 2 },
    "the point under the cursor does not move",
  );
});

test("zooming clamps to the workspace zoom limits", () => {
  assertDeepEqual(
    zoomCameraAtPoint({ x: 0, y: 0, zoom: 1 }, 10, { x: 100, y: 100 }, 0.2, 3),
    { x: -200, y: -200, zoom: 3 },
    "zoom is clamped to maxZoom",
  );
});

test("camera transitions interpolate position and zoom together", () => {
  assertDeepEqual(
    interpolateWorkspaceCamera({ x: -100, y: 50, zoom: 0.5 }, { x: 300, y: 250, zoom: 1.5 }, 0.25),
    { x: 0, y: 100, zoom: 0.75 },
    "position and zoom advance by the same progress",
  );
});

test("screen and world coordinates round-trip through the camera", () => {
  const camera = { x: -120, y: 64, zoom: 1.5 };
  const world = { x: 320, y: -48 };
  const screen = worldToScreenPoint(camera, world);

  assertDeepEqual(screen, { x: 360, y: -8 }, "world maps into screen space");
  assertDeepEqual(screenToWorldPoint(camera, screen), world, "and back again without drift");
});

test("a screen point at the camera origin is the world origin", () => {
  const camera = { x: 200, y: 100, zoom: 2 };
  assertDeepEqual(
    screenToWorldPoint(camera, { x: 200, y: 100 }),
    { x: 0, y: 0 },
    "the camera offset is the world origin on screen",
  );
});

export default async function runWorkspaceSpec() {
  for (const testCase of tests) {
    await testCase.run();
    console.log(`ok - workspace: ${testCase.name}`);
  }
}
