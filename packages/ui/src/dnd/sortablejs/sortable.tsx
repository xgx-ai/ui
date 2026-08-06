import type { ComponentProps, JSX, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { createEffect, createMemo, createSignal, For, omit, onCleanup, untrack } from "solid-js";
import type SortableEngineType from "sortablejs";
import SortableEngine from "sortablejs";
import {
  type SortableItemContextValue,
  SortableItemProvider,
  type SortableItemState,
} from "./context";

const DATA_ITEM_ATTRIBUTE = "data-sortable-item";
const DATA_ID_ATTRIBUTE = "data-sortable-id";
const DATA_HANDLE_ATTRIBUTE = "data-sortable-handle";
const GHOST_CLASS = "xgx-sortablejs-ghost";
const CHOSEN_CLASS = "xgx-sortablejs-chosen";
const DRAG_CLASS = "xgx-sortablejs-drag";

type SortableInstance = SortableEngineType;
type SortableOptions = SortableEngineType.Options;
type SortableEvent = SortableEngineType.SortableEvent;

export type SortableGroup =
  | string
  | {
      name: string;
      pull?: boolean | "clone" | string[];
      put?: boolean | string[];
    };

export interface ReorderEvent<T> {
  type: "reorder";
  item: T;
  from: number;
  to: number;
  items: T[];
}

export interface MoveEvent<T> {
  type: "move";
  item: T;
  fromGroup?: string;
  toGroup?: string;
  from: number;
  to: number;
  items: T[];
  sourceItems: T[];
  targetItems: T[];
  pullMode?: "clone" | boolean;
}

export type SortableChangeEvent<T> = ReorderEvent<T> | MoveEvent<T>;

export type SortableProps<T> = Omit<ComponentProps<"div">, "children" | "onChange"> & {
  /**
   * Controlled item order.
   *
   * Signal arrays are supported when `onChange` preserves the existing item
   * objects. `Sortable` renders with Solid's keyed `<For>`, so pure moves keep
   * row instances attached to their item identities.
   *
   * For form builders, editors, and other nested mutable data, prefer a Solid
   * store array and reconcile by id:
   *
   * ```tsx
   * const [fields, setFields] = createStore(initialFields);
   *
   * <Sortable
   *   items={fields}
   *   getId={(field) => field.id}
   *   onChange={(next) => setFields(reconcile(snapshot(next), "id"))}
   * />
   * ```
   *
   * `snapshot(next)` is intentional for store arrays: Sortable returns the
   * current item objects, which may be store proxies, and reconciling proxies
   * back into the same store can recurse.
   */
  items: readonly T[];
  /**
   * Receives the next controlled order after a reorder or cross-list move.
   *
   * Keep item object identity stable where possible. For stores, use
   * `reconcile(snapshot(next), key)` as shown on `items`.
   */
  onChange?: (items: T[], event?: SortableChangeEvent<T>) => void;
  /** Called for a move within the same Sortable list. */
  onReorder?: (event: ReorderEvent<T>) => void;
  /** Called for a move between grouped Sortable lists. */
  onMove?: (event: MoveEvent<T>) => void;
  /** Returns the stable key used for keyed Solid rendering and SortableJS ids. */
  getId?: (item: T) => string;
  /** Shared group name or SortableJS group policy for cross-list movement. */
  group?: SortableGroup;
  /** Disables SortableJS interactions while leaving the rendered list intact. */
  disabled?: boolean;
  /** Container element. Defaults to `div`. */
  as?: ValidComponent;
  /** Item wrapper element. Defaults to `div`. */
  itemAs?: ValidComponent;
  /** Class applied to each item wrapper. */
  itemClass?: string | ((item: T, state: SortableItemState) => string);
  /** Attributes applied to each item wrapper. Useful when `itemAs` is a semantic element. */
  itemProps?: (
    item: T,
    state: SortableItemState,
  ) => ComponentProps<"div"> & Record<string, unknown>;
  /** Advanced SortableJS escape hatch. Merged last and not deeply reactive. */
  options?: Partial<SortableOptions>;
  /** Render prop for each item and its drag state. */
  children: (item: T, state: SortableItemState) => JSX.Element;
};

interface SortableCallbacks<T> {
  onChange?: (items: T[], event?: SortableChangeEvent<T>) => void;
  onReorder?: (event: ReorderEvent<T>) => void;
  onMove?: (event: MoveEvent<T>) => void;
}

interface SortableController<T> {
  element: () => HTMLElement | undefined;
  items: () => readonly T[];
  getId: (item: T) => string;
  groupName: () => string | undefined;
  callbacks: SortableCallbacks<T>;
}

interface DragContext<T> {
  item: T;
  snapshots: Map<HTMLElement, Node[]>;
}

interface RenderedItemProps<T> {
  item: T;
  id: string;
  index: number;
  itemAs?: ValidComponent;
  itemClass?: string | ((item: T, state: SortableItemState) => string);
  itemProps?: SortableProps<T>["itemProps"];
  children: (item: T, state: SortableItemState) => JSX.Element;
  activeId: () => string | null;
  stateVersion: () => number;
}

interface RenderedItemContentProps<T> {
  item: T;
  state: SortableItemState;
  render: (item: T, state: SortableItemState) => JSX.Element;
}

const controllers = new Set<SortableController<unknown>>();
const controllerByElement = new WeakMap<HTMLElement, SortableController<unknown>>();
let dragContext: DragContext<unknown> | undefined;

function defaultGetId<T>(item: T): string {
  const value = (item as { id?: unknown }).id;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  throw new Error("Sortable: Could not determine item ID. Please provide getId.");
}

function getEventIndex(index: number | undefined): number | undefined {
  return typeof index === "number" && index >= 0 ? index : undefined;
}

function getElementId(element: HTMLElement): string | undefined {
  return element.getAttribute(DATA_ID_ATTRIBUTE) ?? undefined;
}

function getGroupName(group: SortableGroup | undefined): string | undefined {
  if (!group) return undefined;
  return typeof group === "string" ? group : group.name;
}

function toSortableGroup(group: SortableGroup | undefined): SortableOptions["group"] {
  if (!group) return undefined;
  if (typeof group === "string") return group;
  return {
    name: group.name,
    pull: group.pull,
    put: group.put,
  };
}

function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return [...items];
  next.splice(to, 0, item);
  return next;
}

function insertAt<T>(items: readonly T[], item: T, index: number): T[] {
  const next = [...items];
  next.splice(index, 0, item);
  return next;
}

function removeByIndexOrId<T>(
  items: readonly T[],
  index: number,
  id: string,
  getId: (item: T) => string,
): T[] {
  const next = [...items];
  if (next[index] !== undefined && getId(next[index]) === id) {
    next.splice(index, 1);
    return next;
  }
  return next.filter((item) => getId(item) !== id);
}

function findItem<T>(
  controller: SortableController<T>,
  element: HTMLElement,
  fallbackIndex: number,
): T | undefined {
  const items = controller.items();
  const id = getElementId(element);
  if (id) {
    const item = items.find((candidate) => controller.getId(candidate) === id);
    if (item !== undefined) return item;
  }
  return items[fallbackIndex];
}

function snapshotRegisteredChildren(): Map<HTMLElement, Node[]> {
  const snapshots = new Map<HTMLElement, Node[]>();
  for (const controller of controllers) {
    const element = controller.element();
    if (!element) continue;
    snapshots.set(element, Array.from(element.children));
  }
  return snapshots;
}

function restoreSnapshot(element: HTMLElement | undefined): void {
  if (!element || !dragContext) return;
  const children = dragContext.snapshots.get(element);
  if (!children) return;
  element.replaceChildren(...children);
}

function dispatchMove<T, U>(
  event: SortableEvent,
  source: SortableController<T>,
  target: SortableController<U>,
  item: T,
  from: number,
  to: number,
): void {
  const id = source.getId(item);
  const isClone = event.pullMode === "clone";
  const sourceItems = isClone
    ? [...source.items()]
    : removeByIndexOrId(source.items(), from, id, source.getId);
  const targetItems = insertAt(target.items(), item as unknown as U, to);
  const fromGroup = source.groupName();
  const toGroup = target.groupName();

  const sourceEvent: MoveEvent<T> = {
    type: "move",
    item,
    fromGroup,
    toGroup,
    from,
    to,
    items: sourceItems,
    sourceItems,
    targetItems: targetItems as unknown as T[],
    pullMode: event.pullMode,
  };

  if (!isClone) {
    source.callbacks.onChange?.(sourceItems, sourceEvent);
  }
  source.callbacks.onMove?.(sourceEvent);

  const targetEvent: MoveEvent<U> = {
    type: "move",
    item: item as unknown as U,
    fromGroup,
    toGroup,
    from,
    to,
    items: targetItems,
    sourceItems: sourceItems as unknown as U[],
    targetItems,
    pullMode: event.pullMode,
  };
  target.callbacks.onChange?.(targetItems, targetEvent);
  target.callbacks.onMove?.(targetEvent);
}

function SortableRenderedItemContent<T>(props: RenderedItemContentProps<T>) {
  const content = createMemo(() => props.render(props.item, props.state));

  return <>{content()}</>;
}

function SortableRenderedItem<T>(props: RenderedItemProps<T>) {
  let wrapperElement: HTMLElement | undefined;
  let handleElement: HTMLElement | undefined;

  const syncHandleAttribute = () => {
    if (!wrapperElement) return;

    if (handleElement) {
      wrapperElement.removeAttribute(DATA_HANDLE_ATTRIBUTE);
      handleElement.setAttribute(DATA_HANDLE_ATTRIBUTE, "");
      return;
    }

    wrapperElement.setAttribute(DATA_HANDLE_ATTRIBUTE, "");
  };

  const setWrapperRef = (element: HTMLElement) => {
    wrapperElement = element;
    syncHandleAttribute();
  };

  const setHandleRef = (element: HTMLElement | null | undefined) => {
    if (handleElement && handleElement !== element) {
      handleElement.removeAttribute(DATA_HANDLE_ATTRIBUTE);
    }
    handleElement = element ?? undefined;
    syncHandleAttribute();
  };

  onCleanup(() => {
    wrapperElement?.removeAttribute(DATA_HANDLE_ATTRIBUTE);
    handleElement?.removeAttribute(DATA_HANDLE_ATTRIBUTE);
  });

  const state: SortableItemContextValue = {
    get index() {
      return props.index;
    },
    get isDragging() {
      props.stateVersion();
      return (
        props.activeId() === props.id ||
        Boolean(
          wrapperElement?.classList.contains(CHOSEN_CLASS) ||
            wrapperElement?.classList.contains(DRAG_CLASS),
        )
      );
    },
    get isGhost() {
      props.stateVersion();
      return Boolean(wrapperElement?.classList.contains(GHOST_CLASS));
    },
    setHandleRef,
  };
  const resolvedItemClass = createMemo(() =>
    typeof props.itemClass === "function" ? props.itemClass(props.item, state) : props.itemClass,
  );
  const resolvedItemProps = createMemo(() => props.itemProps?.(props.item, state));
  const wrapperClass = createMemo(() =>
    [resolvedItemClass(), resolvedItemProps()?.class].filter(Boolean).join(" "),
  );

  return (
    <Dynamic
      component={props.itemAs ?? "div"}
      {...resolvedItemProps()}
      class={wrapperClass()}
      ref={setWrapperRef}
      data-sortable-item=""
      data-sortable-id={props.id}
      data-sortable-index={props.index}
    >
      <SortableItemProvider value={state}>
        <SortableRenderedItemContent item={props.item} state={state} render={props.children} />
      </SortableItemProvider>
    </Dynamic>
  );
}

/**
 * SortableJS-backed controlled sortable list.
 *
 * The primitive is state-agnostic: signals and stores both work. Use signal
 * arrays for simple lists, and store arrays plus `reconcile(snapshot(next),
 * key)` for field builders where nested object identity matters.
 *
 * Callback props are captured when SortableJS is initialised; keep callback identity stable.
 */
export function Sortable<T>(props: SortableProps<T>) {
  const local = props;
  const others = omit(
    props,
    "items",
    "onChange",
    "onReorder",
    "onMove",
    "getId",
    "group",
    "disabled",
    "as",
    "itemAs",
    "itemClass",
    "itemProps",
    "options",
    "children",
    "ref",
  );
  const [containerRef, setContainerRefSignal] = createSignal<HTMLElement>();
  const [sortableInstance, setSortableInstance] = createSignal<SortableInstance>();
  const [activeId, setActiveId] = createSignal<string | null>(null);
  const [stateVersion, setStateVersion] = createSignal(0);

  const bumpStateVersion = () => setStateVersion((value) => value + 1);
  const getId = (item: T) => (local.getId ? local.getId(item) : defaultGetId(item));
  const callbacks: SortableCallbacks<T> = {
    get onChange() {
      return local.onChange;
    },
    get onReorder() {
      return local.onReorder;
    },
    get onMove() {
      return local.onMove;
    },
  };
  const controller: SortableController<T> = {
    element: containerRef,
    items: () => local.items,
    getId,
    groupName: () => getGroupName(local.group),
    callbacks,
  };

  const setContainerRef = (element: HTMLElement) => {
    setContainerRefSignal(element);
    if (typeof local.ref === "function") local.ref(element as HTMLDivElement);
  };

  const finishDrag = () => {
    dragContext = undefined;
    setActiveId(null);
    bumpStateVersion();
  };

  const handleStart = (event: SortableEvent) => {
    const from = getEventIndex(event.oldDraggableIndex) ?? getEventIndex(event.oldIndex) ?? 0;
    const item = findItem(controller, event.item, from);
    if (item === undefined) return;

    const id = getElementId(event.item) ?? getId(item);
    dragContext = {
      item,
      snapshots: snapshotRegisteredChildren(),
    };
    setActiveId(id);
    bumpStateVersion();
  };

  const handleEnd = (event: SortableEvent) => {
    const source =
      (controllerByElement.get(event.from) as SortableController<T> | undefined) ?? controller;
    const target =
      (controllerByElement.get(event.to) as SortableController<unknown> | undefined) ??
      (source as unknown as SortableController<unknown>);
    const from = getEventIndex(event.oldDraggableIndex) ?? getEventIndex(event.oldIndex);
    const to = getEventIndex(event.newDraggableIndex) ?? getEventIndex(event.newIndex);

    try {
      restoreSnapshot(event.from);
      if (event.to !== event.from) restoreSnapshot(event.to);

      if (from === undefined || to === undefined || (from === to && event.from === event.to))
        return;

      const item = (dragContext?.item as T | undefined) ?? findItem(source, event.item, from);
      if (item === undefined) return;

      if (event.from === event.to) {
        const items = arrayMove(source.items(), from, to);
        const reorderEvent: ReorderEvent<T> = {
          type: "reorder",
          item,
          from,
          to,
          items,
        };
        source.callbacks.onChange?.(items, reorderEvent);
        source.callbacks.onReorder?.(reorderEvent);
        return;
      }

      dispatchMove(event, source, target, item, from, to);
    } finally {
      finishDrag();
    }
  };

  const handleClassStateChange = () => bumpStateVersion();

  const sortableOptions = createMemo<Partial<SortableOptions>>(() => ({
    animation: 150,
    dataIdAttr: DATA_ID_ATTRIBUTE,
    draggable: `[${DATA_ITEM_ATTRIBUTE}]`,
    handle: `[${DATA_HANDLE_ATTRIBUTE}]`,
    ghostClass: GHOST_CLASS,
    chosenClass: CHOSEN_CLASS,
    dragClass: DRAG_CLASS,
    group: toSortableGroup(local.group),
    disabled: Boolean(local.disabled),
    onChoose: handleClassStateChange,
    onUnchoose: handleClassStateChange,
    onStart: handleStart,
    onEnd: handleEnd,
    onAdd: handleClassStateChange,
    onRemove: handleClassStateChange,
    onUpdate: handleClassStateChange,
    ...local.options,
  }));

  createEffect(
    () => containerRef(),
    (element) => {
      if (!element) return;

      const instance = SortableEngine.create(element, untrack(sortableOptions));
      controllerByElement.set(element, controller as SortableController<unknown>);
      controllers.add(controller as SortableController<unknown>);
      setSortableInstance(instance);

      return () => {
        controllerByElement.delete(element);
        controllers.delete(controller as SortableController<unknown>);
        instance.destroy();
      };
    },
  );

  createEffect(
    () => {
      const instance = sortableInstance();
      if (!instance) return undefined;
      return { instance, options: sortableOptions() };
    },
    (state, previous) => {
      if (!state || !previous) return;

      const { instance, options } = state;
      const previousOptions = previous.options;
      const keys = new Set([...Object.keys(previousOptions), ...Object.keys(options)]);
      for (const key of keys as Set<keyof SortableOptions>) {
        if (options[key] === previousOptions[key]) continue;
        instance.option(key, options[key] as never);
      }
    },
  );

  return (
    <Dynamic component={local.as ?? "div"} ref={setContainerRef} {...others}>
      <For each={local.items}>
        {(item, index) => (
          <SortableRenderedItem
            item={item}
            id={getId(item)}
            index={index()}
            itemAs={local.itemAs}
            itemClass={local.itemClass}
            itemProps={local.itemProps}
            activeId={activeId}
            stateVersion={stateVersion}
          >
            {local.children}
          </SortableRenderedItem>
        )}
      </For>
    </Dynamic>
  );
}
