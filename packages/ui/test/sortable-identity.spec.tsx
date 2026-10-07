import {
  action,
  createMemo,
  createProjection,
  createRoot,
  createSignal,
  flatten,
  flush,
  onCleanup,
} from "solid-js";
import { attribution } from "solid-js/attribution";
import { type ReorderEvent, Sortable } from "../src/dnd/sortablejs/sortable";
import {
  resetSortableTestBoundaries,
  sortableTestInstances,
  sortableTestLifecycle,
  sortableTestRows,
} from "./sortable-test-boundaries";

type Item = { id: string; label: string; fee: number };
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function equal(actual: unknown, expected: unknown, message: string) {
  assert(actual === expected, message);
}
async function settle() {
  flush();
  await Promise.resolve();
  flush();
}

export default async function runSortableIdentitySpec() {
  attribution.enable();
  const warnings: unknown[][] = [];
  const errors: unknown[][] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => warnings.push(args);
  console.error = (...args: unknown[]) => errors.push(args);
  resetSortableTestBoundaries();
  let dispose = () => {};
  let childMounts = 0;
  let childCleanups = 0;
  let reorder: ReorderEvent<Item> | undefined;
  const initial: Item[] = [
    { id: "a", label: "Alpha", fee: 100 },
    { id: "b", label: "Beta", fee: 200 },
  ];
  function StatefulRow(props: { item: Item; index: number }) {
    const [token] = createSignal(++childMounts);
    onCleanup(() => childCleanups++);
    return <>{`${props.item.label}:${props.item.fee}:${props.index}:token${token()}`}</>;
  }
  const initialiseState = () =>
    createRoot((cleanup) => {
      dispose = cleanup;
      const [source, setSource] = createSignal(initial);
      // This is the documented pattern for mutable editors: native projection
      // reconciles fresh records while preserving their per-field reactive identity.
      const items = createProjection(() => source().map((item) => ({ ...item })), []);
      const tree = (
        <Sortable
          getId={(item) => item.id}
          items={items}
          itemProps={(item, dragState) => ({
            "data-label": item.label,
            "data-index": dragState.index,
            class: `fee-${item.fee}`,
          })}
          onChange={(next, event) => {
            assert(event?.type === "reorder", "A same-list drag must report a reorder event");
            reorder = event;
            // Rebuild the controlled source by ID, as editors do; projected rows
            // must not be fed back into the projection that created them.
            const byId = new Map(source().map((item) => [item.id, item]));
            setSource(next.map((item) => byId.get(item.id)!));
          }}
        >
          {(item, dragState) => <StatefulRow item={item} index={dragState.index} />}
        </Sortable>
      );
      return { setSource, rendered: createMemo(() => flatten(tree)) };
    });
  let state: ReturnType<typeof initialiseState>;
  try {
    let closePlain = () => {};
    const plain = createRoot((cleanup) => {
      closePlain = cleanup;
      const [items, setItems] = createSignal(initial);
      const tree = (
        <Sortable items={items()} getId={(item) => item.id}>
          {(item, dragState) => `${item.label}:${item.fee}:${dragState.index}`}
        </Sortable>
      );
      return { setItems, rendered: createMemo(() => flatten(tree)) };
    });
    try {
      plain.rendered();
      await settle();
      const plainWrappers = new Set(sortableTestRows);
      assert(plainWrappers.size === 2, "Plain records must render both wrappers");
      await action(function* () {
        plain.setItems(initial.map((item) => ({ ...item, fee: item.id === "b" ? 250 : item.fee })));
      })();
      await settle();
      assert(
        [...sortableTestRows].every((row) => plainWrappers.has(row)),
        "getId must preserve wrappers when plain record objects are refreshed",
      );
      assert(
        JSON.stringify(plain.rendered()).includes("Beta:250:1"),
        "Plain record refreshes must forward their current values",
      );
    } finally {
      closePlain();
      resetSortableTestBoundaries();
    }
    state = initialiseState();
    state.rendered();
    await settle();
    equal(sortableTestRows.size, 2, "Both sortable wrappers must mount");
    equal(childMounts, 2, "Both stateful child owners must mount once");
    const originalRows = new Set(sortableTestRows);
    await action(function* () {
      state.setSource([
        { id: "a", label: "Alpha", fee: 100 },
        { id: "b", label: "Beta updated", fee: 250 },
      ]);
    })();
    await settle();
    equal(childMounts, 2, "Refreshed records must preserve child mounts");
    equal(childCleanups, 0, "Refreshed records must preserve child state");
    assert(
      [...sortableTestRows].every((row) => originalRows.has(row)),
      "Refreshed records must preserve wrapper identity",
    );
    assert(
      JSON.stringify(state.rendered()).includes("Beta updated:250:1:token2"),
      "Retained children must render current labels, fees and indices",
    );
    const beta = [...sortableTestRows].find((row) => row.getAttribute("data-sortable-id") === "b");
    assert(
      beta?.getAttribute("data-label") === "Beta updated",
      "Item props must receive current records",
    );
    assert(beta?.getAttribute("class") === "fee-250", "Item classes must receive current records");
    const instance = sortableTestInstances[0];
    assert(instance, "The actual component must initialise its SortableJS controller");
    const event = {
      from: instance.element,
      to: instance.element,
      item: beta,
      oldDraggableIndex: 1,
      newDraggableIndex: 0,
    };
    await action(function* () {
      instance.options.onStart?.(event);
      instance.options.onEnd?.(event);
    })();
    await settle();
    assert(
      reorder?.item.label === "Beta updated",
      "Drag callbacks must receive the current record",
    );
    assert(
      reorder?.items[0]?.id === "b",
      "Drag callbacks must report the requested controlled order",
    );
    assert(
      JSON.stringify(state.rendered()).includes("Beta updated:250:0:token2"),
      "Moves preserve row state and update indices",
    );
    equal(childMounts, 2, "A pure move must retain both child mounts");
    equal(childCleanups, 0, "A pure move must retain both child owners");
    assert(sortableTestLifecycle.mounts === 2, "A pure move must retain both wrappers");
    await action(function* () {
      state.setSource([{ id: "b", label: "Beta updated", fee: 250 }]);
    })();
    await settle();
    equal(sortableTestRows.size, 1, "Removing a record retains the other wrapper");
    equal(childCleanups, 1, "Removing a record disposes only its child");
    dispose();
    assert(
      sortableTestRows.size === 0 && childCleanups === 2,
      "Owner disposal cleans up every row",
    );
    assert(instance.destroyed, "Owner disposal destroys the external SortableJS instance");
    const diagnostics = warnings.filter((args) =>
      args.some((value) =>
        /UNSTABLE_LIST_IDENTITY|STRICT|UNTRACKED_READ_AFTER_AWAIT|FORBIDDEN/.test(String(value)),
      ),
    );
    assert(
      diagnostics.length === 0,
      "The sortable lifecycle must emit no native semantic diagnostics",
    );
    assert(errors.length === 0, "The sortable lifecycle must emit no runtime errors");
    console.log("ok - sortable: refreshed keyed rows, child state, drag callbacks and disposal");
  } finally {
    dispose();
    console.warn = originalWarn;
    console.error = originalError;
    resetSortableTestBoundaries();
  }
}

if (import.meta.main) await runSortableIdentitySpec();
