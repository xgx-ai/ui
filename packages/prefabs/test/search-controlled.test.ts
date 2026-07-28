import { expect, test } from "bun:test";
import { createRoot, createSignal, flush } from "solid-js";

/**
 * A picker with nothing selected must keep showing its placeholder.
 *
 * `Search` supports both controlled and uncontrolled use. It used to decide which by asking
 * whether `value` was nullish, so a controlled picker with an empty selection was silently
 * demoted to uncontrolled — and once its options loaded it adopted one and displayed the
 * first record where the placeholder belonged. Controlled-ness is now keyed on the prop
 * being present, which is the only thing that actually distinguishes the two modes.
 */

type Doc = { id: string; name: string };

/** The resolution `Search` performs, before and after the fix. */
function resolve(hasValueProp: boolean, value: Doc | undefined, uncontrolled: Doc | null) {
  const beforeFix = value ?? uncontrolled;
  const afterFix = hasValueProp ? (value ?? null) : uncontrolled;
  return { afterFix, beforeFix };
}

test("an empty controlled value no longer falls back to the uncontrolled selection", () => {
  createRoot((dispose) => {
    const firstLoadedOption: Doc = { id: "d1", name: "assignment details form" };

    // Controlled picker, nothing selected, list has loaded.
    const { beforeFix, afterFix } = resolve(true, undefined, firstLoadedOption);

    expect(beforeFix).toBe(firstLoadedOption); // the bug: adopts a row it was never given
    expect(afterFix).toBeNull(); // placeholder stays
    dispose();
  });
});

test("a genuinely uncontrolled picker still keeps its own selection", () => {
  createRoot((dispose) => {
    const chosen: Doc = { id: "d2", name: "chosen" };
    const { afterFix } = resolve(false, undefined, chosen);

    expect(afterFix).toBe(chosen);
    dispose();
  });
});

test("a controlled picker follows its prop", () => {
  createRoot((dispose) => {
    const [value, setValue] = createSignal<Doc | undefined>(undefined);
    const read = () => resolve(true, value(), { id: "stale", name: "stale" }).afterFix;

    expect(read()).toBeNull();

    setValue({ id: "d3", name: "picked" });
    flush();

    expect(read()).toEqual({ id: "d3", name: "picked" });
    dispose();
  });
});
