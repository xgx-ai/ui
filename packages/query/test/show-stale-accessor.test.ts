import { expect, test } from "bun:test";
import { createMemo, createRoot, createSignal, flush } from "solid-js";

/**
 * Reading a `<Show>` accessor after its condition goes falsy throws.
 *
 * This is the failure behind the form builder's "Attempting to access a stale value from
 * <Show>" crash. The condition was derived from a live prop, and one of the children's reads
 * also depended on a query — so a settle could re-run that read *after* selecting a different
 * field had already flipped the condition falsy. The accessor was dead by then and the throw
 * took down the whole builder.
 *
 * These pin both halves: that the raw accessor really does throw, and that reading a memo of
 * the same value instead is safe. The second is the shape application code should use whenever
 * a child's read can be driven by something other than the condition itself.
 */

/** The accessor Solid hands a `<Show>` child, mirrored from solid-js/dist/solid.js. */
function showAccessor<T>(conditionValue: () => T | undefined) {
  const condition = createMemo(conditionValue, {
    equals: (a: unknown, b: unknown) => !a === !b,
    sync: true,
  } as never);
  return () => {
    if (!condition()) throw new Error("Attempting to access a stale value from <Show>");
    return conditionValue();
  };
}

test("the raw accessor throws once the condition goes falsy", () => {
  const dispose = createRoot((disposeRoot) => {
    const [document, setDocument] = createSignal<{ title: string } | undefined>({
      title: "Privacy notice",
    });
    const accessor = showAccessor(document);

    expect(accessor()?.title).toBe("Privacy notice");

    // Selecting a field whose document is not configured.
    setDocument(undefined);
    flush();

    expect(() => accessor()).toThrow("stale value");
    return disposeRoot;
  });
  dispose();
});

test("reading a memo of the same value is safe after the condition flips", () => {
  const dispose = createRoot((disposeRoot) => {
    const [document, setDocument] = createSignal<{ title: string } | undefined>({
      title: "Privacy notice",
    });
    const stored = createMemo(() => document());

    // A read that a query settle can re-run, independently of the condition.
    const label = createMemo(() => stored()?.title ?? "");

    expect(label()).toBe("Privacy notice");

    setDocument(undefined);
    flush();

    // No throw: the late read renders nothing and the `<Show>` swaps to its fallback.
    expect(label()).toBe("");
    expect(stored()).toBeUndefined();
    return disposeRoot;
  });
  dispose();
});
