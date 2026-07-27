import { expect, test } from "bun:test";
import { createMemo, createRoot, createSignal, flush } from "solid-js";
import {
  type InitialProp,
  initialProp,
  onStaleInitialProp,
  readInitialProp,
  type StaleInitialPropError,
} from "../src/index.ts";

/** Captures reports for the duration of `run`, so a stale snapshot is observable. */
function captureReports(run: () => void): StaleInitialPropError[] {
  const reports: StaleInitialPropError[] = [];
  const restore = onStaleInitialProp((error) => reports.push(error));
  try {
    run();
  } finally {
    restore();
  }
  return reports;
}

function inRoot<T>(run: (dispose: () => void) => T): { dispose: () => void; value: T } {
  let disposeRoot = () => {};
  const value = createRoot((dispose) => {
    disposeRoot = dispose;
    return run(dispose);
  });
  return { dispose: disposeRoot, value };
}

test("initialProp does not clone or freeze the value", () => {
  const branding = { colour: "#000" };
  const marked = initialProp(branding, "branding-1");

  expect((marked as unknown as { value: unknown }).value).toBe(branding);
  expect(Object.isFrozen(branding)).toBe(false);
});

test("readInitialProp returns the value it sampled", () => {
  const { dispose, value } = inRoot(() =>
    readInitialProp(() => initialProp("graphite", "branding-1")),
  );

  expect(value).toBe("graphite");
  dispose();
});

test("readInitialProp does not subscribe the calling scope to the prop", () => {
  const [colour, setColour] = createSignal("graphite");
  let memoRuns = 0;

  const { dispose } = inRoot(() => {
    const snapshot = createMemo(() => {
      memoRuns += 1;
      return readInitialProp(() => initialProp(colour(), "branding-1"));
    });
    snapshot();
    return snapshot;
  });

  expect(memoRuns).toBe(1);

  setColour("slate");
  flush();

  expect(memoRuns).toBe(1);
  dispose();
});

test("a stable identity keeps the snapshot valid", () => {
  const [unrelated, setUnrelated] = createSignal(0);

  const { dispose } = inRoot(() => {
    readInitialProp(() => {
      unrelated();
      return initialProp("graphite", "branding-1");
    });
  });

  const reports = captureReports(() => {
    setUnrelated(1);
    flush();
  });

  expect(reports).toHaveLength(0);
  dispose();
});

test("an identity that changes while mounted is reported", () => {
  const [brandingId, setBrandingId] = createSignal("branding-1");

  const { dispose } = inRoot(() => {
    readInitialProp(() => initialProp("graphite", brandingId()));
  });

  const reports = captureReports(() => {
    setBrandingId("branding-2");
    flush();
  });

  expect(reports).toHaveLength(1);
  expect(reports[0]?.name).toBe("StaleInitialPropError");
  expect(reports[0]?.message).toContain("did not remount");
  expect(reports[0]?.message).toContain("branding-1");
  expect(reports[0]?.message).toContain("branding-2");
  dispose();
});

test("reporting a stale snapshot leaves the reactive graph running", () => {
  // The report must not throw: an effect apply that throws makes Solid halt reactivity,
  // which breaks the whole application rather than surfacing one component's bug.
  const [brandingId, setBrandingId] = createSignal("branding-1");
  const [unrelated, setUnrelated] = createSignal(0);
  const seen: number[] = [];

  const { dispose } = inRoot(() => {
    readInitialProp(() => initialProp("graphite", brandingId()));
    createMemo(() => seen.push(unrelated()));
  });
  flush();

  captureReports(() => {
    setBrandingId("branding-2");
    flush();
  });

  setUnrelated(1);
  flush();

  expect(seen).toEqual([0, 1]);
  dispose();
});

test("an identity that changes after disposal is not reported", () => {
  const [brandingId, setBrandingId] = createSignal("branding-1");

  const { dispose } = inRoot(() => {
    readInitialProp(() => initialProp("graphite", brandingId()));
  });
  dispose();

  const reports = captureReports(() => {
    setBrandingId("branding-2");
    flush();
  });

  expect(reports).toHaveLength(0);
});

test("the check is skipped in production", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const [brandingId, setBrandingId] = createSignal("branding-1");

  try {
    const { dispose } = inRoot(() => {
      readInitialProp(() => initialProp("graphite", brandingId()));
    });

    const reports = captureReports(() => {
      setBrandingId("branding-2");
      flush();
    });

    expect(reports).toHaveLength(0);
    dispose();
  } finally {
    process.env.NODE_ENV = previous;
  }
});

test("the marked type round-trips through a component-shaped boundary", () => {
  const receive = (props: { initialColour: InitialProp<string> }) =>
    readInitialProp(() => props.initialColour);

  const { dispose, value } = inRoot(() =>
    receive({ initialColour: initialProp("graphite", "branding-1") }),
  );

  expect(value).toBe("graphite");
  dispose();
});
