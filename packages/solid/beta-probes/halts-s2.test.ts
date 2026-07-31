/**
 * S2 — a throw from an effect's apply phase halts the entire reactive graph.
 *
 * Its own file, and its own `bun test` invocation (see the `beta:probes` script): the halt
 * is process-wide, so anything sharing a process with it afterwards sees
 * `[REACTIVITY_HALTED] Update ignored` and fails for the wrong reason. That blast radius is
 * the entry's whole point.
 *
 * A failure here means the pinned Solid beta changed — read the S2 entry in
 * `docs/solid-2-beta-issues.md` before touching this file.
 */
import { expect, test } from "bun:test";
import { createEffect, createRoot, createSignal, flush } from "solid-js";

test("S2: an unrelated effect stops running after a throw in apply", () => {
  // The dev build forbids writing reactive state from inside an owned scope, so the
  // setters come back out of `createRoot` and are written from outside it.
  const harness = createRoot((dispose) => {
    const [failing, setFailing] = createSignal(0);
    const [unrelated, setUnrelated] = createSignal(0);
    let unrelatedRuns = 0;

    createEffect(
      () => failing(),
      (value) => {
        if (value === 1) throw new Error("boom from apply");
      },
    );
    createEffect(
      () => unrelated(),
      () => {
        unrelatedRuns += 1;
      },
    );

    return { dispose, runs: () => unrelatedRuns, setFailing, setUnrelated };
  });

  flush();
  const runsBeforeThrow = harness.runs();

  expect(() => {
    harness.setFailing(1);
    flush();
  }).toThrow("boom from apply");

  // A write on a completely separate effect. Nothing should run.
  harness.setUnrelated(1);
  try {
    flush();
  } catch {
    // The halted graph may rethrow; either way the assertion below is the check.
  }

  expect(harness.runs()).toBe(runsBeforeThrow);
  harness.dispose();
});
