/**
 * Runnable probes for the entries in `docs/solid-2-beta-issues.md`.
 *
 * Each test pins the behaviour the register currently describes, so **a failure here is
 * good news**: it means the pinned Solid beta changed and the matching entry is a candidate
 * for deletion. Read the entry named in the test before "fixing" a failure.
 *
 * These run against the **development** build (`bun run beta:probes`). The other suites run
 * `--conditions=browser` only, which selects the production build — every diagnostic message
 * is stripped there and the owned-scope write rule does not fire, so a probe for a dev-only
 * error silently passes. That production/development split is itself the reason this file
 * lives outside `packages/solid/test`.
 *
 * The dev build also forbids writing reactive state from inside an owned scope, so every
 * probe returns its setters out of `createRoot` and writes to them from outside.
 */
import { describe, expect, test } from "bun:test";
import {
  createContext,
  createMemo,
  createRoot,
  createSignal,
  flush,
  Show,
  useContext,
} from "solid-js";

// S5 is deliberately absent. It needs reads inside a rendered tree, and a headless harness
// gives the opposite answer — see `packages/query/test/retention-probe/README.md`, which is
// the procedure of record for that entry.

describe("S7 — an `undefined` context default is treated as missing", () => {
  test("createContext(undefined) throws, an explicit sentinel does not", () => {
    createRoot((dispose) => {
      const undefinedDefault = createContext<string | undefined>(undefined);
      expect(() => useContext(undefinedDefault)).toThrow("default value");

      const missing = Symbol("missing");
      const sentinelDefault = createContext<string | typeof missing>(missing);
      expect(useContext(sentinelDefault)).toBe(missing);

      dispose();
    });
  });
});

describe("S11 — a `<Show>` accessor read after its condition goes falsy throws", () => {
  test("the real accessor throws, a memo of the same value does not", () => {
    const harness = createRoot((dispose) => {
      const [document, setDocument] = createSignal<{ title: string } | undefined>({
        title: "Privacy notice",
      });
      let accessor: (() => { title: string }) | undefined;

      const element = Show({
        get when() {
          return document();
        },
        children: (value: () => { title: string }) => {
          accessor = value;
          return null;
        },
      } as never);
      // `Show` returns a memo; evaluating it runs the child and captures the accessor.
      if (typeof element === "function") (element as () => unknown)();

      // The safe shape the register prescribes.
      const stored = createMemo(() => document());
      const label = createMemo(() => stored()?.title ?? "");

      return { accessor: () => accessor, dispose, label, setDocument };
    });

    flush();
    expect(harness.accessor()?.()).toEqual({ title: "Privacy notice" });
    expect(harness.label()).toBe("Privacy notice");

    // Selecting a field whose document is not configured.
    harness.setDocument(undefined);
    flush();

    expect(() => harness.accessor()?.()).toThrow("stale value");
    expect(harness.label()).toBe("");
    harness.dispose();
  });
});
