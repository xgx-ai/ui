import { createRoot, flush } from "solid-js";
import {
  insertCoordinateIntoDrawLine,
  type DrawToolCoordinate,
} from "../src/map/components/draw-tool-utils.ts";
import {
  fractionToCoordinate,
  insertFraction,
  isLockedFractionIndex,
  normaliseFractions,
  projectCoordinateToFraction,
  removeFractionAtIndex,
  reorderFractionForDrag,
} from "../src/map/components/line-marker-tool-utils.ts";
import { createHistoryStore } from "../src/map/utils/history.ts";

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

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertClose(actual: number, expected: number, precision: number, message: string) {
  const tolerance = 10 ** -precision;
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function withRoot<T>(setup: () => T, run: (value: T) => void) {
  let dispose = () => undefined;
  const value = createRoot((rootDispose) => {
    dispose = rootDispose;
    return setup();
  });

  try {
    run(value);
  } finally {
    dispose();
  }
}

test("inserts a point into an open line without dropping its endpoint", () => {
  const points: DrawToolCoordinate[] = [
    [0, 0],
    [10, 0],
    [20, 0],
    [30, 0],
  ];

  assertDeepEqual(
    insertCoordinateIntoDrawLine(points, [5, 0], "line"),
    [
      [0, 0],
      [5, 0],
      [10, 0],
      [20, 0],
      [30, 0],
    ],
    "Open-line insertion changed the route endpoints",
  );
});

test("inserts a point into a polygon without adding a closing marker", () => {
  const points: DrawToolCoordinate[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  assertDeepEqual(
    insertCoordinateIntoDrawLine(points, [5, 0], "geometry"),
    [
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ],
    "Polygon insertion retained the synthetic closing point",
  );
  assert(
    insertCoordinateIntoDrawLine([[0, 0]], [1, 1], "line") === null,
    "A line with fewer than two points should not accept an insertion",
  );
});

test("projects coordinates to fractions and resolves them back onto the line", () => {
  const line: DrawToolCoordinate[] = [
    [0, 0],
    [10, 0],
  ];

  const fraction = projectCoordinateToFraction(line, [7.5, 3]);
  assertClose(fraction, 0.75, 2, "Projection did not snap to the nearest line point");

  const coordinate = fractionToCoordinate(line, fraction);
  assert(coordinate, "Fraction did not resolve to a line coordinate");
  assertClose(coordinate[0], 7.5, 2, "Resolved longitude was incorrect");
  assertClose(coordinate[1], 0, 5, "Resolved latitude was incorrect");
});

test("normalises, inserts, reorders and removes line fractions", () => {
  const normalised = normaliseFractions(
    [-10, Number.NaN, 0, 0.00000001, 0.3, 0.3000000001, 99],
    true,
  );
  assertDeepEqual(normalised, [0, 0.3, 1], "Fractions were not clamped and deduplicated");

  const inserted = insertFraction([0, 0.5, 1], 0.25, true);
  assert(inserted.inserted, "A distinct fraction was not inserted");
  assertDeepEqual(inserted.fractions, [0, 0.25, 0.5, 1], "Inserted fraction was out of order");
  assert(
    !insertFraction(inserted.fractions, 0.25, true).inserted,
    "A duplicate fraction was inserted",
  );

  const reordered = reorderFractionForDrag([0, 0.2, 0.4, 0.6, 1], 1, 0.95, true);
  assertDeepEqual(
    reordered,
    { fractions: [0, 0.4, 0.6, 0.95, 1], index: 3 },
    "Dragging across multiple markers did not preserve fraction order",
  );

  assert(isLockedFractionIndex(0, 3, true), "The first endpoint was not locked");
  assert(isLockedFractionIndex(2, 3, true), "The final endpoint was not locked");
  assertDeepEqual(
    removeFractionAtIndex([0, 0.4, 1], 0, true),
    [0, 0.4, 1],
    "A locked endpoint was removed",
  );
  assertDeepEqual(
    removeFractionAtIndex([0, 0.4, 1], 1, true),
    [0, 1],
    "An interior fraction was not removed",
  );
});

test("records consecutive automatic commits in one Solid update turn", () =>
  withRoot(
    () => createHistoryStore({ count: 0 }),
    ([state, setState, history]) => {
      const first = setState((current) => ({ count: current.count + 1 }));
      const second = setState((current) => ({ count: current.count + 1 }));
      flush();

      assertDeepEqual(first, { count: 1 }, "First update returned the wrong explicit value");
      assertDeepEqual(second, { count: 2 }, "Second update read stale store state");
      assertDeepEqual(state, { count: 2 }, "Store did not retain the second update");
      assertDeepEqual(
        history.entries().map((entry) => entry.count),
        [0, 1, 2],
        "Consecutive commits collapsed in the deferred history signal",
      );
      assert(history.index() === 2, "History cursor did not advance for both commits");
    },
  ));

test("records consecutive manual commits with their explicit values", () =>
  withRoot(
    () => createHistoryStore({ count: 0 }, { manual: true }),
    ([state, setState, history]) => {
      const first = setState({ count: 1 });
      history.commit(first);
      const second = setState({ count: 2 });
      history.commit(second);
      flush();

      assertDeepEqual(state, { count: 2 }, "Manual store did not retain its latest value");
      assertDeepEqual(
        history.entries().map((entry) => entry.count),
        [0, 1, 2],
        "Consecutive manual commits collapsed in the deferred history signal",
      );
    },
  ));

test("supports consecutive undo and redo operations without an intermediate flush", () =>
  withRoot(
    () => createHistoryStore({ count: 0 }),
    ([state, setState, history]) => {
      setState({ count: 1 });
      flush();
      setState({ count: 2 });
      flush();

      const firstUndo = history.undo();
      const secondUndo = history.undo();
      flush();
      assertDeepEqual(firstUndo, { count: 1 }, "First undo restored the wrong entry");
      assertDeepEqual(secondUndo, { count: 0 }, "Second undo reused a deferred cursor");
      assertDeepEqual(state, { count: 0 }, "Consecutive undo did not reach the initial state");
      assert(history.index() === 0, "History cursor did not move back twice");

      const firstRedo = history.redo();
      const secondRedo = history.redo();
      flush();
      assertDeepEqual(firstRedo, { count: 1 }, "First redo restored the wrong entry");
      assertDeepEqual(secondRedo, { count: 2 }, "Second redo reused a deferred cursor");
      assertDeepEqual(state, { count: 2 }, "Consecutive redo did not reach the latest state");
      assert(history.index() === 2, "History cursor did not move forwards twice");
    },
  ));

test("discards future history when committing after undo", () =>
  withRoot(
    () => createHistoryStore({ count: 0 }),
    ([, setState, history]) => {
      setState({ count: 1 });
      flush();
      setState({ count: 2 });
      flush();
      history.undo();
      flush();
      setState({ count: 9 });
      flush();

      assertDeepEqual(
        history.entries().map((entry) => entry.count),
        [0, 1, 9],
        "A branch retained stale redo history",
      );
      assert(history.redo() === undefined, "Redo was available after creating a new branch");
    },
  ));

export default async function runMapSpec() {
  for (const entry of tests) {
    try {
      await entry.run();
    } catch (error) {
      throw new Error(`Map test failed: ${entry.name}`, { cause: error });
    }
  }
}
