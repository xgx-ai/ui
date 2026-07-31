/**
 * The owned-scope write rule, and what it does *not* cover.
 *
 * Own file and own `bun test` invocation (see the `beta:probes` script): the throw halts the
 * reactive graph process-wide, so anything sharing a process with it afterwards fails with
 * `[REACTIVITY_HALTED] Update ignored` for the wrong reason.
 *
 * Only reproduces on the **development** build. Under `--conditions=browser` alone the rule
 * does not fire at all and both assertions below pass vacuously — that is exactly how the
 * second one was originally mis-read as a reproduction of A2.
 */
import { expect, test } from "bun:test";
import { createEffect, createRoot, createSignal, flush } from "solid-js";

test("writing reactive state from inside an owned scope throws", () => {
  expect(() =>
    createRoot((dispose) => {
      const [, setValue] = createSignal(0);
      setValue(1);
      dispose();
    }),
  ).toThrow("REACTIVE_WRITE_IN_OWNED_SCOPE");
});

test("an effect cleanup that clears a signal does NOT trip the rule", () => {
  // The shape `@xgx/ui` Marker uses, and the mechanism A2 in the Onshyft register claims:
  // the apply stores the instance, the teardown clears it. On this pin it is allowed —
  // both when a re-run disposes the previous apply and when the root is disposed.
  //
  // If this test starts failing, A2's stated mechanism is real again and the entry's
  // workaround (map layers instead of markers) is load-bearing once more.
  const run = () => {
    const harness = createRoot((dispose) => {
      const [source, setSource] = createSignal(0);
      const [instance, setInstance] = createSignal<string | undefined>();

      createEffect(
        () => source(),
        () => {
          setInstance("marker");
          return () => setInstance(undefined);
        },
      );

      return { dispose, instance, setSource };
    });

    flush();
    harness.setSource(1);
    flush();
    harness.dispose();
    flush();
  };

  expect(run).not.toThrow();
});
